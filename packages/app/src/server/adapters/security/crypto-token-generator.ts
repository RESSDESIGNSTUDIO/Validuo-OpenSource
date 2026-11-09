import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { TokenGenerator } from "@validuo/core/ports/security";

export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    // 256 bits from the OS CSPRNG; base64url keeps it cookie-safe.
    return randomBytes(32).toString("base64url");
  }

  hash(value: string): string {
    // A fast digest is enough for a high-entropy token (and for rate-limit keys, which are not secret).
    return createHash("sha256").update(value).digest("hex");
  }
}
