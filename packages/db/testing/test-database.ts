import { MikroORM } from "@mikro-orm/postgresql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { createMigrationOrmConfig } from "../src/migration-config";

type EnvSource = Readonly<Record<string, string | undefined>>;

export type TestDatabase = {
  url: string;
  stop(): Promise<void>;
};

/**
 * Returns the database URL for integration tests. Integration tests may migrate, truncate or drop
 * objects, so there is deliberately no fallback to `DATABASE_URL`: the target must be named
 * explicitly, must differ from the application database and must look disposable.
 */
export function requireTestDatabaseUrl(env: EnvSource = process.env): string {
  const url = env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set. Point it at a disposable PostgreSQL database, e.g. validuo_test.");
  }
  const target = databaseIdentity(url);
  if (env.DATABASE_URL && databaseIdentity(env.DATABASE_URL) === target) {
    throw new Error("TEST_DATABASE_URL must not point at the same database as DATABASE_URL.");
  }
  const databaseName = target.split("/").at(-1) ?? "";
  if (!databaseName.includes("test")) {
    throw new Error(
      `Refusing to run integration tests against "${databaseName}": the database name must contain "test".`,
    );
  }
  return url;
}

/**
 * Starts a disposable, fully migrated PostgreSQL 17: a testcontainers container by default, or the
 * database from `TEST_DATABASE_URL` (guarded by `requireTestDatabaseUrl`) where Docker is unavailable.
 */
export async function startTestDatabase(env: EnvSource = process.env): Promise<TestDatabase> {
  if (env.TEST_DATABASE_URL) {
    const url = requireTestDatabaseUrl(env);
    await migrate(url);
    return { url, stop: async () => {} };
  }

  const container = await new PostgreSqlContainer("postgres:17")
    .withDatabase("validuo_test")
    .withStartupTimeout(120_000)
    .start();
  try {
    const url = requireTestDatabaseUrl({ TEST_DATABASE_URL: container.getConnectionUri() });
    await migrate(url);
    return {
      url,
      stop: async () => {
        await container.stop();
      },
    };
  } catch (error) {
    await container.stop();
    throw error;
  }
}

/**
 * Vitest cannot render stack traces thrown from global setup files (it fails with
 * "code.charCodeAt is not a function"), so global setups print the reason before failing the run.
 */
export async function reportStartupFailure<T>(startup: Promise<T>): Promise<T> {
  try {
    return await startup;
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
    throw error;
  }
}

/** Applies all MikroORM migrations, exactly like `npm run db:migrate`. */
async function migrate(url: string): Promise<void> {
  const orm = await MikroORM.init(
    createMigrationOrmConfig({
      database: { url, poolMin: 0, poolMax: 2, debug: false },
      migrationDatabaseUrl: url,
    }),
  );
  try {
    await orm.migrator.up();
  } finally {
    await orm.close(true);
  }
}

// host:port/database — credentials and query parameters do not change which database it is.
function databaseIdentity(url: string): string {
  const parsed = new URL(url);
  return `${parsed.hostname.toLowerCase()}:${parsed.port || "5432"}/${decodeURIComponent(parsed.pathname.slice(1))}`;
}
