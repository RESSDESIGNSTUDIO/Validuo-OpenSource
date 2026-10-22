import "server-only";

import { parseServerEnv, type ServerEnv } from "@validuo/core/config";
import { asValue, createAppContainer, type AppContainer } from "@validuo/core/di";
import { dbRegistrations, type DbCradle } from "@validuo/db";

import { createJsonLogger, type Logger } from "./logging/logger";

/** Every registration of the application. The only place where the concrete cradle is typed. */
export type AppCradle = DbCradle & {
  env: ServerEnv;
  logger: Logger;
};

export type RequestScope = AppContainer<AppCradle>;

/**
 * Composition root: the only place where registrations are assembled. The environment is validated
 * here, on first use — not at import time — so `next build` needs neither a database nor secrets.
 */
function buildContainer(): AppContainer<AppCradle> {
  const env = parseServerEnv(process.env);
  return createAppContainer<AppCradle>({
    env: asValue(env),
    logger: asValue(createJsonLogger()),
    ...dbRegistrations(env.database),
  });
}

// Dev HMR re-evaluates modules; keeping the container on globalThis avoids a new connection pool
// per edit. This is per process only — every replica still has its own container and pool.
const globalForContainer = globalThis as typeof globalThis & {
  __validuoContainer?: AppContainer<AppCradle>;
};

/** Root container (process-wide singletons). */
export function getContainer(): AppContainer<AppCradle> {
  globalForContainer.__validuoContainer ??= buildContainer();
  return globalForContainer.__validuoContainer;
}

/**
 * Runs `fn` in a fresh scope (one request, one server action, one job). Scoped registrations —
 * including `em` — are created once per scope and disposed when `fn` settles.
 */
export async function withRequestScope<T>(fn: (scope: RequestScope) => Promise<T>): Promise<T> {
  const scope = getContainer().createScope();
  try {
    return await fn(scope);
  } finally {
    await scope.dispose();
  }
}
