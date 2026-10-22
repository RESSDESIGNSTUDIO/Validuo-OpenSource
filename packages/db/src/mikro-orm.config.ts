import path from "node:path";

import { Migrator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/postgresql";
import { parseServerEnv } from "@validuo/core/config";
import { loadRootEnv } from "@validuo/core/config/load-env";

import { createOrmConfig } from "./config";

// Same `.env*` files and the same validation as the Next.js app.
loadRootEnv();

const env = parseServerEnv(process.env);
const migrationsPath = path.join(import.meta.dirname, "migrations");

/**
 * Config for the MikroORM CLI (`npm run db -- <command>`, `npm run db:migrate`, …): runtime options
 * plus the Migrator, connected with the migration account (`MIGRATION_DATABASE_URL`).
 */
export default defineConfig({
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
