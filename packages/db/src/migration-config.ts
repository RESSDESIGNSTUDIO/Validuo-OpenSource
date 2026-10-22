import path from "node:path";

import { Migrator } from "@mikro-orm/migrations";
import { defineConfig, type Options } from "@mikro-orm/postgresql";
import type { ServerEnv } from "@validuo/core/config";

import { createOrmConfig } from "./config";

export const migrationsPath = path.join(import.meta.dirname, "migrations");

/**
 * MikroORM options with the Migrator, connected with the migration account
 * (`MIGRATION_DATABASE_URL`, defaults to `DATABASE_URL`). Used by the CLI and by test databases.
 */
export function createMigrationOrmConfig(env: ServerEnv): Options {
  return defineConfig({
    ...createOrmConfig({ ...env.database, url: env.migrationDatabaseUrl }),
    extensions: [Migrator],
    migrations: {
      // Absolute paths — independent of the directory the CLI is started from.
      path: migrationsPath,
      pathTs: migrationsPath,
      glob: "!(*.d).ts",
      snapshot: true,
      // Fixed name instead of `.snapshot-<dbName>.json`, so it does not depend on the environment.
      snapshotName: ".snapshot",
    },
  });
}
