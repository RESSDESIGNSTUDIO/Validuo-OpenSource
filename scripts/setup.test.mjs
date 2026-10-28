import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const runSetup = vi.fn();
const createNodeDeps = vi.fn();

vi.mock("./setup/run.mjs", () => ({ runSetup }));
vi.mock("./setup/node-deps.mjs", () => ({ createNodeDeps }));

describe("setup entry point", () => {
  const originalExitCode = process.exitCode;

  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.resetModules();
  });

  it("runs the installer for the repository root and exposes its result as the exit code", async () => {
    createNodeDeps.mockReturnValue({ marker: "deps" });
    runSetup.mockResolvedValue(1);

    await import("./setup.mjs");
    await vi.waitFor(() => expect(process.exitCode).toBe(1));

    const { rootDir } = createNodeDeps.mock.calls[0][0];
    expect(path.resolve(rootDir)).toBe(path.resolve(import.meta.dirname, ".."));
    expect(runSetup).toHaveBeenCalledWith({ marker: "deps" });
  });
});
