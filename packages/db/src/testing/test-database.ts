type EnvSource = Readonly<Record<string, string | undefined>>;

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

// host:port/database — credentials and query parameters do not change which database it is.
function databaseIdentity(url: string): string {
  const parsed = new URL(url);
  return `${parsed.hostname.toLowerCase()}:${parsed.port || "5432"}/${decodeURIComponent(parsed.pathname.slice(1))}`;
}
