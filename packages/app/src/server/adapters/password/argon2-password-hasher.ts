import "server-only";

import { randomBytes } from "node:crypto";

import { hash, verify } from "@node-rs/argon2";
import type { PasswordHasher } from "@validuo/core/ports/security";

// Argon2id (the library default) with the OWASP-recommended minimum: 19 MiB, 2 passes, 1 lane.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export class Argon2PasswordHasher implements PasswordHasher {
  private dummyHash: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(hashValue: string | null, password: string): Promise<boolean> {
    // An unknown user is checked against a throw-away hash, so the cost is the same either way.
    const matches = await verify(hashValue ?? (await this.decoyHash()), password);
    return hashValue !== null && matches;
  }

  private decoyHash(): Promise<string> {
    this.dummyHash ??= hash(randomBytes(16).toString("hex"), OPTIONS);
    return this.dummyHash;
  }
}
