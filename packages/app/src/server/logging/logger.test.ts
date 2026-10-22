import { afterEach, describe, expect, it, vi } from "vitest";

import { createJsonLogger } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createJsonLogger", () => {
  it("writes one JSON line with level, message and bound context", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    createJsonLogger().child({ requestId: "r1" }).info("Started", { operation: "health.check" });

    const entry: unknown = JSON.parse(String(info.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({ level: "info", message: "Started", requestId: "r1", operation: "health.check" });
  });

  it("writes warnings without extra context", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    createJsonLogger().warn("Slow query");

    const entry: unknown = JSON.parse(String(warn.mock.calls[0]?.[0]));
    expect(entry).toEqual({ level: "warn", time: expect.any(String), message: "Slow query" });
  });

  it("serializes errors without a code or an Error cause", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    createJsonLogger().error("Failed", { error: new Error("plain", { cause: "text cause" }) });

    const entry = JSON.parse(String(error.mock.calls[0]?.[0])) as { error: Record<string, unknown> };
    expect(entry.error).toEqual({ name: "Error", message: "plain", stack: expect.any(String) });
  });

  it("reduces errors to name, code, message, stack and cause", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = Object.assign(new Error("boom", { cause: new Error("root cause") }), { code: "ECONNREFUSED" });

    createJsonLogger().error("Failed", { error: failure });

    const entry: unknown = JSON.parse(String(error.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      level: "error",
      error: { name: "Error", code: "ECONNREFUSED", message: "boom", cause: { message: "root cause" } },
    });
  });
});
