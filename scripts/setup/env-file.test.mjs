import { describe, expect, it } from "vitest";

import { describeDatabaseTarget, isExampleDatabaseUrl, parseDotenvValue, resolveDatabaseUrl } from "./env-file.mjs";

describe("parseDotenvValue", () => {
  it("reads plain, exported and spaced assignments", () => {
    expect(parseDotenvValue("DATABASE_URL=postgres://a", "DATABASE_URL")).toBe("postgres://a");
    expect(parseDotenvValue("export DATABASE_URL = postgres://b", "DATABASE_URL")).toBe("postgres://b");
  });

  it("strips quotes and inline comments", () => {
    expect(parseDotenvValue('DATABASE_URL="postgres://q" # note', "DATABASE_URL")).toBe("postgres://q");
    expect(parseDotenvValue("DATABASE_URL='postgres://s'", "DATABASE_URL")).toBe("postgres://s");
    expect(parseDotenvValue("DATABASE_URL=postgres://c # note", "DATABASE_URL")).toBe("postgres://c");
  });

  it("keeps a # that is part of the value", () => {
    expect(parseDotenvValue("DATABASE_URL=postgres://u:p#w@h/db", "DATABASE_URL")).toBe("postgres://u:p#w@h/db");
  });

  it("uses the last assignment, ignoring comments, other keys and CRLF", () => {
    const content =
      "# DATABASE_URL=postgres://old\r\nOTHER=1\r\nDATABASE_URL=postgres://first\r\nDATABASE_URL=postgres://last\r\n";
    expect(parseDotenvValue(content, "DATABASE_URL")).toBe("postgres://last");
  });

  it("treats empty and missing values as not set", () => {
    expect(parseDotenvValue("DATABASE_URL=", "DATABASE_URL")).toBeUndefined();
    expect(parseDotenvValue('DATABASE_URL=""', "DATABASE_URL")).toBeUndefined();
    expect(parseDotenvValue("OTHER=1", "DATABASE_URL")).toBeUndefined();
  });
});

describe("resolveDatabaseUrl", () => {
  it("prefers the shell environment", () => {
    expect(
      resolveDatabaseUrl({ env: { DATABASE_URL: "postgres://env" }, fileContents: ["DATABASE_URL=postgres://f"] }),
    ).toBe("postgres://env");
  });

  it("takes the first file that sets it and skips missing files", () => {
    expect(
      resolveDatabaseUrl({
        env: {},
        fileContents: [null, "OTHER=1", "DATABASE_URL=postgres://second", "DATABASE_URL=postgres://third"],
      }),
    ).toBe("postgres://second");
  });

  it("returns undefined when nothing sets it", () => {
    expect(resolveDatabaseUrl({ env: { DATABASE_URL: "" }, fileContents: [null, "A=1"] })).toBeUndefined();
  });
});

describe("isExampleDatabaseUrl", () => {
  const example = "postgres://validuo_app:change-me@127.0.0.1:5432/validuo";

  it("detects the value copied from .env.example", () => {
    expect(isExampleDatabaseUrl(example, example)).toBe(true);
  });

  it("detects the example password in a changed URL", () => {
    expect(isExampleDatabaseUrl("postgres://x:change-me@db:5432/app", undefined)).toBe(true);
  });

  it("accepts real credentials", () => {
    expect(isExampleDatabaseUrl("postgres://x:s3cret@db:5432/app", example)).toBe(false);
  });

  it("leaves non-URLs to the real validation", () => {
    expect(isExampleDatabaseUrl("not a url", example)).toBe(false);
  });
});

describe("describeDatabaseTarget", () => {
  it("returns host, port and database without credentials", () => {
    const target = describeDatabaseTarget("postgres://user:s3cret@db.local:5433/validuo");
    expect(target).toBe("db.local:5433/validuo");
    expect(target).not.toContain("s3cret");
    expect(target).not.toContain("user");
  });

  it("omits an unset port", () => {
    expect(describeDatabaseTarget("postgres://u:p@db.local/app")).toBe("db.local/app");
  });

  it("returns null for a value that is not a URL", () => {
    expect(describeDatabaseTarget("nope")).toBeNull();
  });
});
