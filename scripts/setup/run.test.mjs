import { describe, expect, it, vi } from "vitest";

import { runSetup } from "./run.mjs";

const EXAMPLE = "DATABASE_URL=postgres://validuo_app:change-me@127.0.0.1:5432/validuo\n";
const REAL = "DATABASE_URL=postgres://validuo_app:s3cret-pw@127.0.0.1:5432/validuo\n";

/** In-memory ports: `files` maps relative path to content, `mtimes` to modification time. */
function createDeps({
  files = {},
  mtimes = {},
  env = {},
  nodeVersion = "24.21.0",
  npmVersion = "11.19.0",
  npmExit = {},
} = {}) {
  const logs = [];
  const npmCalls = [];
  const created = [];
  const deps = {
    env,
    nodeVersion,
    log: (line) => logs.push(line),
    getNpmVersion: () => npmVersion,
    exists: (path) => path in files,
    readText: (path) => files[path],
    mtimeMs: (path) => (path in mtimes ? mtimes[path] : null),
    createFrom: (from, to) => {
      created.push([from, to]);
      files[to] = files[from];
    },
    runNpm: vi.fn(async (args) => {
      npmCalls.push(args.join(" "));
      return npmExit[args.join(" ")] ?? 0;
    }),
  };
  return { deps, logs, npmCalls, created, files };
}

const fresh = { "package-lock.json": 20, "node_modules/.package-lock.json": 10 };
const installed = { "package-lock.json": 10, "node_modules/.package-lock.json": 20 };

describe("runSetup", () => {
  it("stops before any change when the toolchain is unsupported", async () => {
    const ctx = createDeps({ nodeVersion: "20.0.0", files: { ".env.example": EXAMPLE } });
    expect(await runSetup(ctx.deps)).toBe(1);
    expect(ctx.npmCalls).toEqual([]);
    expect(ctx.created).toEqual([]);
    expect(ctx.logs[0]).toContain("[błąd]");
  });

  it("first run on a fresh clone: installs, creates .env and stops on the example DATABASE_URL", async () => {
    const ctx = createDeps({ files: { ".env.example": EXAMPLE }, mtimes: {} });
    expect(await runSetup(ctx.deps)).toBe(1);
    expect(ctx.npmCalls).toEqual(["install"]);
    expect(ctx.created).toEqual([[".env.example", ".env"]]);
    expect(ctx.logs.join("\n")).toContain("Uzupełnij DATABASE_URL");
    expect(ctx.npmCalls).not.toContain("run db:migrate");
  });

  it("completes when DATABASE_URL is filled in and reports executed steps", async () => {
    const ctx = createDeps({ files: { ".env.example": EXAMPLE, ".env": REAL }, mtimes: fresh });
    expect(await runSetup(ctx.deps)).toBe(0);
    expect(ctx.npmCalls).toEqual(["install", "run db:migrate"]);
    expect(ctx.logs).toContain("Baza danych: 127.0.0.1:5432/validuo");
    expect(ctx.logs).toContain("Gotowe (wykonano: 2, pominięto: 1).");
    expect(ctx.logs.at(-1)).toContain("npm run dev");
  });

  it("second run skips install and keeps .env untouched", async () => {
    const ctx = createDeps({ files: { ".env.example": EXAMPLE, ".env": REAL }, mtimes: installed });
    expect(await runSetup(ctx.deps)).toBe(0);
    expect(ctx.npmCalls).toEqual(["run db:migrate"]);
    expect(ctx.created).toEqual([]);
    expect(ctx.files[".env"]).toBe(REAL);
    expect(ctx.logs.some((line) => line.startsWith("[pominięto] zależności"))).toBe(true);
    expect(ctx.logs.some((line) => line.startsWith("[pominięto] plik .env"))).toBe(true);
  });

  it("does not create .env when .env.local already exists", async () => {
    const ctx = createDeps({ files: { ".env.example": EXAMPLE, ".env.local": REAL }, mtimes: installed });
    expect(await runSetup(ctx.deps)).toBe(0);
    expect(ctx.created).toEqual([]);
  });

  it("accepts DATABASE_URL provided only by the shell environment", async () => {
    const ctx = createDeps({
      files: { ".env.example": EXAMPLE, ".env": EXAMPLE },
      env: { DATABASE_URL: "postgres://u:real@db:5432/app" },
      mtimes: installed,
    });
    expect(await runSetup(ctx.deps)).toBe(0);
  });

  it("works without .env.example when the DATABASE_URL is already set, and skips an unreadable target", async () => {
    const ctx = createDeps({ files: { ".env": "DATABASE_URL=not-a-url\n" }, mtimes: installed });
    expect(await runSetup(ctx.deps)).toBe(0);
    expect(ctx.logs.some((line) => line.startsWith("Baza danych:"))).toBe(false);
  });

  it("fails when .env is missing and there is no .env.example", async () => {
    const ctx = createDeps({ files: {}, mtimes: installed });
    expect(await runSetup(ctx.deps)).toBe(1);
    expect(ctx.logs.join("\n")).toContain("Brakuje pliku .env.example");
    expect(ctx.npmCalls).toEqual([]);
  });

  it("fails when npm install fails", async () => {
    const ctx = createDeps({ files: { ".env.example": EXAMPLE }, npmExit: { install: 1 } });
    expect(await runSetup(ctx.deps)).toBe(1);
    expect(ctx.created).toEqual([]);
    expect(ctx.logs.join("\n")).toContain("npm install nie powiódł się");
  });

  it("fails with a neutral message when migrations fail, never printing the password", async () => {
    const ctx = createDeps({
      files: { ".env.example": EXAMPLE, ".env": REAL },
      mtimes: installed,
      npmExit: { "run db:migrate": 1 },
    });
    expect(await runSetup(ctx.deps)).toBe(1);
    const output = ctx.logs.join("\n");
    expect(output).toContain("Nie udało się zastosować migracji");
    expect(output).not.toContain("s3cret-pw");
  });

  it("only ever runs npm install and npm run db:migrate", async () => {
    const ctx = createDeps({ files: { ".env.example": EXAMPLE }, mtimes: {} });
    await runSetup(ctx.deps);
    const ready = createDeps({ files: { ".env.example": EXAMPLE, ".env": REAL }, mtimes: {} });
    await runSetup(ready.deps);
    for (const call of [...ctx.npmCalls, ...ready.npmCalls]) {
      expect(["install", "run db:migrate"]).toContain(call);
    }
  });

  it("turns unexpected exceptions into an error result", async () => {
    const ctx = createDeps({ files: { ".env.example": EXAMPLE, ".env": REAL }, mtimes: installed });
    ctx.deps.runNpm = vi.fn(async () => {
      throw new Error("spawn failed");
    });
    expect(await runSetup(ctx.deps)).toBe(1);
    expect(ctx.logs.at(-1)).toContain("Nieoczekiwany błąd: spawn failed");
  });

  it("describes non-Error exceptions", async () => {
    const ctx = createDeps({ files: { ".env.example": EXAMPLE, ".env": REAL }, mtimes: installed });
    ctx.deps.runNpm = vi.fn(async () => {
      throw "boom";
    });
    expect(await runSetup(ctx.deps)).toBe(1);
    expect(ctx.logs.at(-1)).toContain("Nieoczekiwany błąd: boom");
  });
});
