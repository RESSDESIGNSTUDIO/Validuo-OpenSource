import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const agentBrowserBin = createRequire(import.meta.url).resolve("agent-browser/bin/agent-browser.js");

type AgentBrowserResponse = { success: true; data: unknown } | { success: false; error: string };

export type AgentBrowser = {
  /** Runs any agent-browser command (`["get", "title"]`, …) and returns `data` from its JSON output. */
  run(...args: string[]): Promise<unknown>;
  open(url: string): Promise<unknown>;
  /** Accessibility tree of the current page — what an agent "sees". */
  snapshot(): Promise<string>;
  close(): Promise<void>;
};

/**
 * Thin client for the pinned `agent-browser` CLI. Every instance uses its own `--session`, so tests
 * and agents never share browser state.
 */
export function createAgentBrowser(session = `validuo-e2e-${process.pid}`): AgentBrowser {
  const run = async (...args: string[]): Promise<unknown> => {
    const output = await execFileAsync(process.execPath, [agentBrowserBin, "--json", "--session", session, ...args], {
      timeout: 60_000,
      maxBuffer: 10 * 1024 * 1024,
    }).then(
      (result) => result.stdout,
      // A failed command exits non-zero but still prints the JSON envelope with the reason.
      (error: { stdout?: string; message: string }) =>
        error.stdout || JSON.stringify({ success: false, error: error.message }),
    );
    const response = JSON.parse(output.trim().split("\n").at(-1) ?? "{}") as AgentBrowserResponse;
    if (!response.success) {
      throw new Error(`agent-browser ${args.join(" ")} failed: ${response.error}`);
    }
    return response.data;
  };

  return {
    run,
    open: (url) => run("open", url),
    snapshot: async () => {
      const data = await run("snapshot");
      return typeof data === "object" && data !== null && "snapshot" in data && typeof data.snapshot === "string"
        ? data.snapshot
        : JSON.stringify(data);
    },
    close: async () => {
      await run("close");
    },
  };
}
