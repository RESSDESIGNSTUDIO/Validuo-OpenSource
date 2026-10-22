import { MikroORM } from "@mikro-orm/postgresql";
import { afterAll, describe, expect, it } from "vitest";

import { createOrmConfig } from "./config";
import { checkDatabase } from "./health";
import { requireTestDatabaseUrl } from "./testing";

const database = { url: requireTestDatabaseUrl(), poolMin: 0, poolMax: 2, debug: false };

describe("checkDatabase", () => {
  const orm = new MikroORM(createOrmConfig(database));
  // Nothing listens on port 1, so the connection is refused immediately.
  const unreachable = new MikroORM(createOrmConfig({ ...database, url: "postgres://127.0.0.1:1/validuo_test" }));

  afterAll(async () => {
    await Promise.all([orm.close(), unreachable.close()]);
  });

  it("reports a reachable database with a real query on a lazily connected ORM", async () => {
    expect(await checkDatabase(orm)).toEqual({ ok: true });
  });

  it("reports an unreachable database instead of throwing", async () => {
    expect(await checkDatabase(unreachable)).toEqual({ ok: false, reason: expect.any(String) });
  });
});
