import { afterEach, describe, expect, it, vi } from "vitest";

const { loadRootEnv } = vi.hoisted(() => ({ loadRootEnv: vi.fn() }));

vi.mock("@validuo/core/config/load-env", () => ({ loadRootEnv }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("MikroORM CLI config", () => {
  it("loads the root .env files and validates the environment", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://app@db/validuo");
    vi.stubEnv("MIGRATION_DATABASE_URL", "postgres://owner@db/validuo");

    const { default: config } = await import("./mikro-orm.config");

    expect(loadRootEnv).toHaveBeenCalledOnce();
    expect(config.clientUrl).toBe("postgres://owner@db/validuo");
  });

  it("refuses to start with an invalid environment", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(import("./mikro-orm.config")).rejects.toThrow(/DATABASE_URL/);
  });
});
