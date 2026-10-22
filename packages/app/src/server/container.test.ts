import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as ContainerModule from "./container";

const globalForContainer = globalThis as { __validuoContainer?: { dispose(): Promise<void> } };
let containerModule: typeof ContainerModule;

beforeEach(async () => {
  // Nothing listens on port 1; the ORM connects lazily, so no connection is attempted.
  vi.stubEnv("DATABASE_URL", "postgres://postgres@127.0.0.1:1/validuo_unit");
  containerModule = await import("./container");
});

afterEach(async () => {
  await globalForContainer.__validuoContainer?.dispose();
  delete globalForContainer.__validuoContainer;
  vi.unstubAllEnvs();
});

describe("getContainer", () => {
  it("builds the container once per process and registers env, logger and database", () => {
    const container = containerModule.getContainer();

    expect(containerModule.getContainer()).toBe(container);
    expect(container.resolve("env").database.url).toBe("postgres://postgres@127.0.0.1:1/validuo_unit");
    expect(typeof container.resolve("logger").child).toBe("function");
    expect(container.resolve("orm").config.get("clientUrl")).toBe("postgres://postgres@127.0.0.1:1/validuo_unit");
  });

  it("validates the environment when the container is first built", () => {
    vi.stubEnv("DATABASE_URL", "");

    expect(() => containerModule.getContainer()).toThrow(/DATABASE_URL/);
  });
});

describe("withRequestScope", () => {
  it("gives every call its own scope and disposes it afterwards", async () => {
    const scopes: ContainerModule.RequestScope[] = [];
    await containerModule.withRequestScope(async (scope) => void scopes.push(scope));
    await containerModule.withRequestScope(async (scope) => void scopes.push(scope));

    expect(scopes[0]).not.toBe(scopes[1]);
    expect(scopes[0]?.resolve("em")).not.toBe(scopes[1]?.resolve("em"));
  });

  it.each([
    ["succeeds", async () => "ok"],
    ["fails", async () => Promise.reject(new Error("boom"))],
  ])("disposes the scope when the callback %s", async (_, callback) => {
    const root = containerModule.getContainer();
    const createScope = root.createScope.bind(root);
    const disposals: unknown[] = [];
    vi.spyOn(root, "createScope").mockImplementation(() => {
      const scope = createScope();
      disposals.push(vi.spyOn(scope, "dispose"));
      return scope;
    });

    await containerModule.withRequestScope(callback).catch(() => undefined);

    expect(disposals).toHaveLength(1);
    expect(disposals[0]).toHaveBeenCalledOnce();
  });
});
