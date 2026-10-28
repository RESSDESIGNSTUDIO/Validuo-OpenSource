import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNodeDeps, npmCommand } from "./node-deps.mjs";

describe("npmCommand", () => {
  it("runs npm-cli.js through the current Node without a shell", () => {
    expect(npmCommand({ npm_execpath: "/x/npm-cli.js" }, "linux", "/usr/bin/node")).toEqual({
      command: "/usr/bin/node",
      prefixArgs: ["/x/npm-cli.js"],
      shell: false,
    });
    expect(npmCommand({ npm_execpath: "C:\\npm\\npm-cli.cjs" }, "win32", "node.exe").shell).toBe(false);
  });

  it("falls back to npm when npm_execpath is missing or is a binary", () => {
    expect(npmCommand({}, "linux", "node")).toEqual({ command: "npm", prefixArgs: [], shell: false });
    expect(npmCommand({ npm_execpath: "/usr/bin/npm" }, "darwin", "node").command).toBe("npm");
  });

  it("uses npm.cmd through a shell on Windows", () => {
    expect(npmCommand({}, "win32", "node.exe")).toEqual({ command: "npm.cmd", prefixArgs: [], shell: true });
  });
});

describe("createNodeDeps (real filesystem)", () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "validuo-setup-"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("reads files and reports existence and modification time", () => {
    fs.writeFileSync(path.join(root, "a.txt"), "hello");
    const deps = createNodeDeps({ rootDir: root });
    expect(deps.exists("a.txt")).toBe(true);
    expect(deps.exists("missing.txt")).toBe(false);
    expect(deps.readText("a.txt")).toBe("hello");
    expect(deps.mtimeMs("a.txt")).toBeGreaterThan(0);
    expect(deps.mtimeMs("missing.txt")).toBeNull();
  });

  it("creates a new file with owner-only permissions and never overwrites", () => {
    fs.writeFileSync(path.join(root, "source"), "A=1\n");
    const deps = createNodeDeps({ rootDir: root });
    deps.createFrom("source", "target");
    expect(fs.readFileSync(path.join(root, "target"), "utf8")).toBe("A=1\n");
    if (process.platform !== "win32") {
      expect(fs.statSync(path.join(root, "target")).mode & 0o777).toBe(0o600);
    }
    fs.writeFileSync(path.join(root, "target"), "KEEP=1\n");
    expect(() => deps.createFrom("source", "target")).toThrow();
    expect(fs.readFileSync(path.join(root, "target"), "utf8")).toBe("KEEP=1\n");
  });

  it("logs to the console by default and passes through environment and Node version", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const deps = createNodeDeps({ rootDir: root, env: { X: "1" }, nodeVersion: "24.0.0" });
    deps.log("line");
    expect(spy).toHaveBeenCalledWith("line");
    expect(deps.env).toEqual({ X: "1" });
    expect(deps.nodeVersion).toBe("24.0.0");
    spy.mockRestore();
  });

  it("defaults to the real process environment", () => {
    const deps = createNodeDeps({ rootDir: root });
    expect(deps.env).toBe(process.env);
    expect(deps.nodeVersion).toBe(process.versions.node);
  });
});

describe("createNodeDeps (processes)", () => {
  const base = { rootDir: "/repo", env: {}, platform: "linux", execPath: "/usr/bin/node" };

  it("reads the npm version from a successful `npm --version`", () => {
    const spawnSync = vi.fn(() => ({ status: 0, stdout: "11.19.0\n" }));
    const deps = createNodeDeps({ ...base, spawnSync });
    expect(deps.getNpmVersion()).toBe("11.19.0");
    expect(spawnSync).toHaveBeenCalledWith("npm", ["--version"], { cwd: "/repo", encoding: "utf8", shell: false });
  });

  it("returns null when npm cannot report its version", () => {
    const spawnSync = vi.fn(() => ({ status: 1, stdout: "" }));
    expect(createNodeDeps({ ...base, spawnSync }).getNpmVersion()).toBeNull();
  });

  it("runs npm with inherited output and resolves with its exit code", async () => {
    const child = new EventEmitter();
    const spawn = vi.fn(() => child);
    const promise = createNodeDeps({ ...base, spawn }).runNpm(["run", "db:migrate"]);
    child.emit("close", 0);
    expect(await promise).toBe(0);
    expect(spawn).toHaveBeenCalledWith("npm", ["run", "db:migrate"], { cwd: "/repo", stdio: "inherit", shell: false });
  });

  it("reports a non-zero exit code and a signal exit as failure", async () => {
    const child = new EventEmitter();
    const deps = createNodeDeps({ ...base, spawn: () => child });
    const failed = deps.runNpm(["install"]);
    child.emit("close", 2);
    expect(await failed).toBe(2);
    const signalled = deps.runNpm(["install"]);
    child.emit("close", null);
    expect(await signalled).toBe(1);
  });

  it("reports a spawn error as failure", async () => {
    const child = new EventEmitter();
    const promise = createNodeDeps({ ...base, spawn: () => child }).runNpm(["install"]);
    child.emit("error", new Error("ENOENT"));
    expect(await promise).toBe(1);
  });
});
