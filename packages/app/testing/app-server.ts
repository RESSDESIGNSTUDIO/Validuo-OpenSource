import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";

const appDir = path.resolve(import.meta.dirname, "..");
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");

export type AppServer = {
  url: string;
  stop(): Promise<void>;
};

export type StartAppServerOptions = {
  databaseUrl: string;
  port?: number;
  startupTimeoutMs?: number;
};

/**
 * Starts the production build (`npm run build` first) with `next start` against the given database
 * and resolves once `/api/health` answers 200. The server runs in its own process group: stopping
 * it kills `next-server` too — killing only the parent would leave it holding the port.
 */
export async function startAppServer(options: StartAppServerOptions): Promise<AppServer> {
  if (!existsSync(path.join(appDir, ".next", "BUILD_ID"))) {
    throw new Error("No production build found in packages/app/.next — run `npm run build` first.");
  }
  const port = options.port ?? (await findFreePort());
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: appDir,
    detached: true,
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: options.databaseUrl },
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Always drain the pipes: a full pipe buffer blocks the server.
  let output = "";
  const collect = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-20_000);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);
  const killOnExit = () => killGroup(child, "SIGKILL");
  process.once("exit", killOnExit);

  const stop = async () => {
    process.off("exit", killOnExit);
    await terminate(child);
  };

  try {
    await waitForHealth(url, child, options.startupTimeoutMs ?? 60_000);
  } catch (error) {
    await stop();
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n--- next start output ---\n${output}`);
  }
  return { url, stop };
}

async function waitForHealth(url: string, child: ChildProcess, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`next start exited with code ${child.exitCode} before becoming healthy`);
    }
    const healthy = await fetch(`${url}/api/health`).then(
      (response) => response.ok,
      () => false,
    );
    if (healthy) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${url}/api/health did not answer 200 within ${timeoutMs} ms`);
}

async function terminate(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const exited = new Promise((resolve) => child.once("exit", resolve));
  killGroup(child, "SIGTERM");
  const timer = setTimeout(() => killGroup(child, "SIGKILL"), 5_000);
  await exited;
  clearTimeout(timer);
}

function killGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid === undefined) {
    return;
  }
  try {
    // Negative pid = the whole process group created by `detached: true`.
    process.kill(-child.pid, signal);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) {
      throw error;
    }
  }
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() =>
        typeof address === "object" && address ? resolve(address.port) : reject(new Error("No port")),
      );
    });
  });
}
