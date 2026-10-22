import { describe, expect, it } from "vitest";

import { requireTestDatabaseUrl } from "./test-database";

describe("requireTestDatabaseUrl", () => {
  const testUrl = "postgres://postgres@127.0.0.1:5432/validuo_test";

  it("returns an explicitly configured test database", () => {
    expect(requireTestDatabaseUrl({ TEST_DATABASE_URL: testUrl })).toBe(testUrl);
  });

  it("never falls back to DATABASE_URL", () => {
    expect(() => requireTestDatabaseUrl({ DATABASE_URL: testUrl })).toThrow(/TEST_DATABASE_URL is not set/);
  });

  it("refuses the application database and databases not named as tests", () => {
    expect(() =>
      requireTestDatabaseUrl({
        TEST_DATABASE_URL: testUrl,
        DATABASE_URL: "postgres://app:other-password@127.0.0.1/validuo_test?sslmode=disable",
      }),
    ).toThrow(/same database/);
    expect(() => requireTestDatabaseUrl({ TEST_DATABASE_URL: "postgres://127.0.0.1/validuo" })).toThrow(
      /must contain "test"/,
    );
  });
});
