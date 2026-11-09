import { describe, expect, it } from "vitest";

import { Argon2PasswordHasher } from "./argon2-password-hasher";

describe("Argon2PasswordHasher", () => {
  const hasher = new Argon2PasswordHasher();

  it("hashes with Argon2id and a random salt", async () => {
    const [first, second] = await Promise.all([hasher.hash("correct horse"), hasher.hash("correct horse")]);

    expect(first).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(first).not.toBe(second);
  });

  it("accepts the right password and rejects a wrong one", async () => {
    const stored = await hasher.hash("correct horse");

    expect(await hasher.verify(stored, "correct horse")).toBe(true);
    expect(await hasher.verify(stored, "wrong horse")).toBe(false);
  });

  it("rejects an unknown user without failing and reuses its decoy hash", async () => {
    expect(await hasher.verify(null, "anything")).toBe(false);
    expect(await hasher.verify(null, "anything else")).toBe(false);
  });
});
