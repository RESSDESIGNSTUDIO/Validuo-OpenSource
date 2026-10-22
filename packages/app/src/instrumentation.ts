// Fail fast on invalid configuration when the server starts, not on the first request. Skipped
// during `next build`, which also calls `register()` but must not need runtime secrets.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  const { parseServerEnv } = await import("@validuo/core/config");
  parseServerEnv(process.env);
}
