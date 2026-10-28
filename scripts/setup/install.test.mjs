import { describe, expect, it } from "vitest";

import { needsInstall } from "./install.mjs";

describe("needsInstall", () => {
  it("installs when node_modules has no hidden lockfile", () => {
    expect(needsInstall({ lockMtimeMs: 10, installedLockMtimeMs: null })).toBe(true);
  });

  it("installs when package-lock.json is missing (cannot prove freshness)", () => {
    expect(needsInstall({ lockMtimeMs: null, installedLockMtimeMs: 10 })).toBe(true);
  });

  it("installs when the lockfile is newer than the last install", () => {
    expect(needsInstall({ lockMtimeMs: 20, installedLockMtimeMs: 10 })).toBe(true);
  });

  it("skips when the last install is at least as new as the lockfile", () => {
    expect(needsInstall({ lockMtimeMs: 10, installedLockMtimeMs: 10 })).toBe(false);
    expect(needsInstall({ lockMtimeMs: 10, installedLockMtimeMs: 20 })).toBe(false);
  });
});
