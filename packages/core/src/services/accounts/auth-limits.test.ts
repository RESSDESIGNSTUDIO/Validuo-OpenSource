import { describe, expect, it } from "vitest";

import { windowStart } from "./auth-limits";

describe("windowStart", () => {
  it("floors a moment to the start of its fixed window", () => {
    const now = new Date("2026-01-01T12:07:30Z");

    expect(windowStart(now, 15 * 60_000)).toEqual(new Date("2026-01-01T12:00:00Z"));
  });

  it("keeps a moment on a window boundary", () => {
    const boundary = new Date("2026-01-01T12:15:00Z");

    expect(windowStart(boundary, 15 * 60_000)).toEqual(boundary);
  });
});
