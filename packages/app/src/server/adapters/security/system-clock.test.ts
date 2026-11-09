import { describe, expect, it } from "vitest";

import { SystemClock } from "./system-clock";

describe("SystemClock", () => {
  it("returns the current time", () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
