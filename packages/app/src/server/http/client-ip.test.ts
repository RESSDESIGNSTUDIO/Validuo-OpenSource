import { describe, expect, it } from "vitest";

import { clientIp } from "./client-ip";

const withHeader = (value?: string) => new Headers(value !== undefined ? { "x-forwarded-for": value } : {});

describe("clientIp", () => {
  it("ignores forwarded headers without a trusted proxy", () => {
    expect(clientIp(withHeader("203.0.113.7"), false)).toBeNull();
  });

  it("takes the entry appended by the trusted proxy (the right-most)", () => {
    expect(clientIp(withHeader("198.51.100.1, 203.0.113.7"), true)).toBe("203.0.113.7");
  });

  it("returns null when the header is missing or empty", () => {
    expect(clientIp(withHeader(), true)).toBeNull();
    expect(clientIp(withHeader(" "), true)).toBeNull();
  });
});
