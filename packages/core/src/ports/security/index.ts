export interface PasswordHasher {
  hash(password: string): Promise<string>;
  /**
   * `hash === null` (unknown user) still spends the same time as a real check and returns false,
   * so response time does not reveal whether an account exists.
   */
  verify(hash: string | null, password: string): Promise<boolean>;
}

export interface TokenGenerator {
  /** New high-entropy opaque token (session). */
  generate(): string;
  /** One-way digest stored instead of the token; also used to key rate-limit counters. */
  hash(value: string): string;
}

export interface Clock {
  now(): Date;
}
