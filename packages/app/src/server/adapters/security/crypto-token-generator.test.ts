import { describe, expect, it } from "vitest";

import { CryptoTokenGenerator } from "./crypto-token-generator";

describe("CryptoTokenGenerator", () => {
  const generator = new CryptoTokenGenerator();

  it("generates distinct 256-bit cookie-safe tokens", () => {
    const first = generator.generate();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generator.generate()).not.toBe(first);
  });

  it("hashes to a stable 64-character SHA-256 hex digest", () => {
    expect(generator.hash("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(generator.hash("abc")).toHaveLength(64);
  });
});
