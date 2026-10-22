import { describe, expect, it } from "vitest";

import { ConfigurationError } from "../errors";
import { parseServerEnv } from "./env";

const databaseUrl = "postgres://validuo:s3cr3t-password@db.internal:5432/validuo";

describe("parseServerEnv", () => {
  it("applies defaults for optional database settings", () => {
    expect(parseServerEnv({ DATABASE_URL: databaseUrl })).toEqual({
      database: { url: databaseUrl, poolMin: 0, poolMax: 10, debug: false },
      migrationDatabaseUrl: databaseUrl,
    });
  });

  it("parses explicit values and treats empty strings as unset", () => {
    const env = parseServerEnv({ DATABASE_URL: databaseUrl, DB_POOL_MIN: "2", DB_POOL_MAX: "", DB_DEBUG: "true" });

    expect(env.database).toEqual({ url: databaseUrl, poolMin: 2, poolMax: 10, debug: true });
  });

  it("uses a separate migration account when MIGRATION_DATABASE_URL is set", () => {
    const migrationUrl = "postgres://validuo_owner:other@db.internal:5432/validuo";

    expect(parseServerEnv({ DATABASE_URL: databaseUrl, MIGRATION_DATABASE_URL: migrationUrl })).toMatchObject({
      database: { url: databaseUrl },
      migrationDatabaseUrl: migrationUrl,
    });
    expect(() => parseServerEnv({ DATABASE_URL: databaseUrl, MIGRATION_DATABASE_URL: "not a url" })).toThrow(
      /MIGRATION_DATABASE_URL/,
    );
  });

  it("rejects a missing or non-postgres DATABASE_URL", () => {
    expect(() => parseServerEnv({})).toThrow(ConfigurationError);
    expect(() => parseServerEnv({ DATABASE_URL: "mysql://localhost/validuo" })).toThrow(/DATABASE_URL/);
  });

  it("rejects malformed numbers, flags and an inverted pool range", () => {
    expect(() => parseServerEnv({ DATABASE_URL: databaseUrl, DB_POOL_MAX: "ten" })).toThrow(/DB_POOL_MAX/);
    expect(() => parseServerEnv({ DATABASE_URL: databaseUrl, DB_DEBUG: "maybe" })).toThrow(/DB_DEBUG/);
    expect(() => parseServerEnv({ DATABASE_URL: databaseUrl, DB_POOL_MIN: "5", DB_POOL_MAX: "2" })).toThrow(
      /DB_POOL_MAX: must be greater than or equal to DB_POOL_MIN/,
    );
  });

  it("never includes variable values in the error message", () => {
    const secretUrl = "https://validuo:s3cr3t-password@db.internal/validuo";

    expect(() => parseServerEnv({ DATABASE_URL: secretUrl, DB_POOL_MAX: "s3cr3t-password" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("s3cr3t") }),
    );
  });
});
