import { afterEach, describe, expect, it, vi } from "vitest";

import { register } from "./instrumentation";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("register", () => {
  it("validates the environment when the Node.js server starts", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NEXT_PHASE", "phase-production-server");
    vi.stubEnv("DATABASE_URL", "");

    await expect(register()).rejects.toThrow(/DATABASE_URL/);

    vi.stubEnv("DATABASE_URL", "postgres://app@db/validuo");
    await expect(register()).resolves.toBeUndefined();
  });

  it.each([
    ["the edge runtime", { NEXT_RUNTIME: "edge", NEXT_PHASE: "phase-production-server" }],
    ["next build", { NEXT_RUNTIME: "nodejs", NEXT_PHASE: "phase-production-build" }],
  ])("skips validation in %s", async (_, env) => {
    for (const [name, value] of Object.entries(env)) {
      vi.stubEnv(name, value);
    }
    vi.stubEnv("DATABASE_URL", "");

    await expect(register()).resolves.toBeUndefined();
  });
});
