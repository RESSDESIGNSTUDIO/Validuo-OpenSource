import { spawn as nodeSpawn, spawnSync as nodeSpawnSync } from "node:child_process";
import * as nodeFs from "node:fs";
import path from "node:path";

/**
 * How to start npm without a shell where possible. `npm run` exports `npm_execpath` (npm-cli.js),
 * which Node runs directly; any other value (yarn, pnpm) is ignored — this repo is npm-only — and
 * falls back to `npm` (`npm.cmd` needs a shell on Windows).
 * Arguments are always fixed strings from the installer, never values read from files.
 * @param {Record<string, string | undefined>} env
 * @param {string} platform
 * @param {string} execPath
 */
export function npmCommand(env, platform, execPath) {
  const npmExecPath = env.npm_execpath;
  if (npmExecPath && /(^|[\\/])npm-cli\.[cm]?js$/.test(npmExecPath)) {
    return { command: execPath, prefixArgs: [npmExecPath], shell: false };
  }
  return { command: platform === "win32" ? "npm.cmd" : "npm", prefixArgs: [], shell: platform === "win32" };
}

/**
 * Wires the installer to the real Node APIs; everything is injectable for tests.
 * @param {{
 *   rootDir: string;
 *   env?: Record<string, string | undefined>;
 *   nodeVersion?: string;
 *   platform?: string;
 *   execPath?: string;
 *   fs?: typeof nodeFs;
 *   spawn?: typeof nodeSpawn;
 *   spawnSync?: typeof nodeSpawnSync;
 *   log?: (line: string) => void;
 * }} options
 * @returns {import("./run.mjs").SetupDeps}
 */
export function createNodeDeps({
  rootDir,
  env = process.env,
  nodeVersion = process.versions.node,
  platform = process.platform,
  execPath = process.execPath,
  fs = nodeFs,
  spawn = nodeSpawn,
  spawnSync = nodeSpawnSync,
  log = (line) => console.log(line),
}) {
  const resolve = (relativePath) => path.join(rootDir, relativePath);
  const npm = npmCommand(env, platform, execPath);

  return {
    env,
    nodeVersion,
    log,
    exists: (relativePath) => fs.existsSync(resolve(relativePath)),
    readText: (relativePath) => fs.readFileSync(resolve(relativePath), "utf8"),
    mtimeMs: (relativePath) => {
      try {
        return fs.statSync(resolve(relativePath)).mtimeMs;
      } catch {
        // A missing file is a normal answer here (fresh clone, no node_modules yet).
        return null;
      }
    },
    createFrom: (from, to) => {
      // COPYFILE_EXCL: never overwrite an existing file, even if one appears between check and copy.
      fs.copyFileSync(resolve(from), resolve(to), fs.constants.COPYFILE_EXCL);
      try {
        fs.chmodSync(resolve(to), 0o600);
      } catch {
        // Best effort (Windows, some mounts): the file exists already, so report instead of failing.
        log("[ostrzeżenie] nie udało się ustawić praw 0600 dla .env — ogranicz do niego dostęp ręcznie.");
      }
    },
    getNpmVersion: () => {
      const result = spawnSync(npm.command, [...npm.prefixArgs, "--version"], {
        cwd: rootDir,
        encoding: "utf8",
        shell: npm.shell,
      });
      return result.status === 0 ? result.stdout.trim() : null;
    },
    runNpm: (args) =>
      new Promise((resolvePromise) => {
        const child = spawn(npm.command, [...npm.prefixArgs, ...args], {
          cwd: rootDir,
          stdio: "inherit",
          shell: npm.shell,
        });
        child.on("error", () => resolvePromise(1));
        child.on("close", (code) => resolvePromise(code ?? 1));
      }),
  };
}
