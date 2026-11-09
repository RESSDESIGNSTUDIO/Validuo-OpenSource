import "server-only";

import { parseServerEnv, type ServerEnv } from "@validuo/core/config";
import { asClass, asValue, createAppContainer, type AppContainer } from "@validuo/core/di";
import type { Clock, PasswordHasher, TokenGenerator } from "@validuo/core/ports/security";
import { AccountService, AuthService } from "@validuo/core/services/accounts";
import { dbRegistrations, type DbCradle } from "@validuo/db";

import { Argon2PasswordHasher } from "./adapters/password/argon2-password-hasher";
import { CryptoTokenGenerator } from "./adapters/security/crypto-token-generator";
import { SystemClock } from "./adapters/security/system-clock";
import { createJsonLogger, type Logger } from "./logging/logger";

/** Every registration of the application. The only place where the concrete cradle is typed. */
export type AppCradle = DbCradle & {
  env: ServerEnv;
  logger: Logger;
  /** Session cookie is `Secure` (and `__Host-` prefixed) in production. */
  secureCookies: boolean;
  /** Stateless adapters of the `core` security ports: one per process. */
  passwordHasher: PasswordHasher;
  tokenGenerator: TokenGenerator;
  clock: Clock;
  /** Use cases that hold request-scoped repositories. */
  accountService: AccountService;
  authService: AuthService;
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
    secureCookies: asValue(process.env.NODE_ENV === "production"),
    passwordHasher: asClass(Argon2PasswordHasher).singleton(),
    tokenGenerator: asClass(CryptoTokenGenerator).singleton(),
    clock: asClass(SystemClock).singleton(),
    accountService: asClass(AccountService).scoped(),
    authService: asClass(AuthService).scoped(),
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
