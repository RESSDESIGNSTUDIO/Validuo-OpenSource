import type { Permission } from "../../permissions/catalog";

export type UserRecord = { id: string; passwordHash: string };
export type PersonRecord = { id: string; accountId: string };

export type ActiveSession = {
  id: string;
  personId: string;
  accountId: string;
  lastSeenAt: Date;
  expiresAt: Date;
};

export type AttemptKind = "login_email" | "login_ip" | "register_ip";

export interface AccountRepository {
  create(input: { name: string }): Promise<{ id: string }>;
}

export interface UserRepository {
  /** `email` is already normalised (trimmed, lower case). */
  findByEmail(email: string): Promise<UserRecord | null>;
  /** Throws `ConflictError` when the e-mail is already taken. */
  create(input: { email: string; passwordHash: string }): Promise<{ id: string }>;
}

export interface PersonRepository {
  create(input: { accountId: string; userId: string; displayName: string }): Promise<{ id: string }>;
  findByUserId(userId: string): Promise<PersonRecord | null>;
}

export interface PermissionRepository {
  grant(input: {
    accountId: string;
    personId: string;
    grantedByPersonId: string;
    permissions: readonly Permission[];
  }): Promise<void>;
  /** Always read from storage — permissions are never copied into the session. */
  listForPerson(accountId: string, personId: string): Promise<Permission[]>;
}

export interface SessionRepository {
  create(input: { personId: string; accountId: string; tokenHash: string; expiresAt: Date; now: Date }): Promise<void>;
  /** Session that is neither revoked nor past `expiresAt`; the idle limit is the caller's rule. */
  findActive(tokenHash: string, now: Date): Promise<ActiveSession | null>;
  touch(sessionId: string, now: Date): Promise<void>;
  revoke(tokenHash: string, now: Date): Promise<void>;
}

/** Counters that survive a rolled-back request: every call commits independently. */
export interface LoginAttemptRepository {
  count(kind: AttemptKind, keyHash: string, windowStart: Date): Promise<number>;
  /** Atomically increments the counter of the window and returns the new value. */
  hit(kind: AttemptKind, keyHash: string, windowStart: Date): Promise<number>;
  clear(kind: AttemptKind, keyHash: string): Promise<void>;
}
