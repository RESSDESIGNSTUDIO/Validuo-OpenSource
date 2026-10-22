import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadRootEnv, repositoryRoot } from "./load-env";

const tempDirs: string[] = [];

afterEach(() => {
  vi.unstubAllEnvs();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("repositoryRoot", () => {
  it("points at the monorepo root", () => {
    const manifest: unknown = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));

    expect(manifest).toMatchObject({ name: "validuo", workspaces: ["packages/*"] });
  });
});

describe("loadRootEnv", () => {
  it("loads .env files without overriding variables that are already set", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "validuo-env-"));
    tempDirs.push(dir);
    writeFileSync(path.join(dir, ".env"), "VALIDUO_LOAD_ENV_NEW=from-file\nVALIDUO_LOAD_ENV_SET=from-file\n");
    vi.stubEnv("VALIDUO_LOAD_ENV_NEW", undefined);
    vi.stubEnv("VALIDUO_LOAD_ENV_SET", "from-shell");

    loadRootEnv(dir);

    expect(process.env.VALIDUO_LOAD_ENV_NEW).toBe("from-file");
    expect(process.env.VALIDUO_LOAD_ENV_SET).toBe("from-shell");
  });
});
