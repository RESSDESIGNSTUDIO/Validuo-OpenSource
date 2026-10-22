import path from "node:path";

import { Migrator } from "@mikro-orm/migrations";
import { describe, expect, it } from "vitest";

import { createMigrationOrmConfig, migrationsPath } from "./migration-config";

describe("createMigrationOrmConfig", () => {
  it("connects with the migration account and registers the Migrator", () => {
    const config = createMigrationOrmConfig({
      database: { url: "postgres://app@db/validuo", poolMin: 0, poolMax: 10, debug: false },
      migrationDatabaseUrl: "postgres://owner@db/validuo",
    });

    expect(config.clientUrl).toBe("postgres://owner@db/validuo");
    expect(config.extensions).toEqual([Migrator]);
    expect(config.migrations).toMatchObject({
      path: migrationsPath,
      pathTs: migrationsPath,
      snapshot: true,
      snapshotName: ".snapshot",
    });
  });

  it("keeps migrations next to the package sources", () => {
    expect(migrationsPath).toBe(path.join(import.meta.dirname, "migrations"));
  });
});
