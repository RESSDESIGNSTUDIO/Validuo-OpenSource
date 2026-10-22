import { createRequire } from "node:module";
import path from "node:path";

// `@next/env` is CommonJS. A static import behaves differently in `next.config.ts` (compiled to CJS,
// only named imports work) and in ESM loaders such as tsx (only the default import works), so we
// load it through `require`, which yields the same exports object in both.
const requireCjs = createRequire(import.meta.url);
const { loadEnvConfig }: typeof import("@next/env") = requireCjs("@next/env");

/** Monorepo root — the only place where `.env*` files live. */
export const repositoryRoot = path.resolve(import.meta.dirname, "../../../..");

/**
 * Loads `.env*` files from the repository root with Next.js precedence rules. Shared by
 * `next.config.ts` and the database tooling so both see exactly the same configuration.
 * Variables already present in `process.env` win.
 */
export function loadRootEnv(): void {
  loadEnvConfig(repositoryRoot, process.env.NODE_ENV !== "production");
}
