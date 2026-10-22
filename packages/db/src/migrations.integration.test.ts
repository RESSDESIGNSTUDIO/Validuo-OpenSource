import { MikroORM } from "@mikro-orm/postgresql";
import { afterAll, describe, expect, it } from "vitest";

import { testDatabaseUrl } from "../testing/vitest";
import { createMigrationOrmConfig } from "./migration-config";

describe("migrations", () => {
  const url = testDatabaseUrl();
  const orm = new MikroORM(
    createMigrationOrmConfig({ database: { url, poolMin: 0, poolMax: 1, debug: false }, migrationDatabaseUrl: url }),
  );

  afterAll(async () => {
    await orm.close();
  });

  it("are fully applied to the test database by the global setup", async () => {
    const [table] = await orm.em
      .getConnection()
      .execute<{ name: string | null }[]>("select to_regclass('public.mikro_orm_migrations')::text as name");

    expect(table?.name).toBe("mikro_orm_migrations");
    expect(await orm.migrator.getPending()).toEqual([]);
  });
});
