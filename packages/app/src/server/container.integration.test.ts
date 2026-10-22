import { requireTestDatabaseUrl } from "@validuo/db/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type * as ContainerModule from "./container";

let containerModule: typeof ContainerModule;

beforeAll(async () => {
  // The composition root reads DATABASE_URL; point it at the guarded test database explicitly.
  vi.stubEnv("DATABASE_URL", requireTestDatabaseUrl());
  containerModule = await import("./container");
});

afterAll(async () => {
  await containerModule.getContainer().dispose();
  vi.unstubAllEnvs();
});

describe("composition root", () => {
  it("shares the ORM across scopes but forks an EntityManager per scope", async () => {
    const { getContainer, withRequestScope } = containerModule;
    const orm = getContainer().resolve("orm");

    const [first, second] = await Promise.all([
      withRequestScope(async (scope) => {
        expect(scope.resolve("orm")).toBe(orm);
        expect(scope.resolve("em")).toBe(scope.resolve("em"));
        return scope.resolve("em");
      }),
      withRequestScope(async (scope) => scope.resolve("em")),
    ]);

    expect(first).not.toBe(second);
    expect(first).not.toBe(orm.em);
  });

  it("answers GET /api/health with ApiResult when the database is up", async () => {
    const { GET } = await import("../app/api/health/route");

    const response = await GET(new Request("http://localhost/api/health"), { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok", db: "ok" } });
  });
});
