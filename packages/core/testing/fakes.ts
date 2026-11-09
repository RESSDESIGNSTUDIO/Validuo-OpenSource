import { ConflictError } from "../src/errors/app-error";
import type { Permission } from "../src/permissions/catalog";
import type {
  ActiveSession,
  AttemptKind,
  LoginAttemptRepository,
  PermissionRepository,
  PersonRecord,
  PersonRepository,
  SessionRepository,
  UserRecord,
  UserRepository,
  AccountRepository,
} from "../src/ports/accounts";
import type { Clock, PasswordHasher, TokenGenerator } from "../src/ports/security";
import type { UnitOfWork } from "../src/ports/transactions/unit-of-work.port";

/** In-memory implementations of the account ports, shared by the unit tests of the services. */
export function createFakes(start = new Date("2026-01-01T12:00:00Z")) {
  let now = start;
  let sequence = 0;
  const id = (prefix: string) => `${prefix}-${++sequence}`;

  const clock: Clock = { now: () => now };

  const accounts: { id: string; name: string }[] = [];
  const accountRepository: AccountRepository = {
    create: async ({ name }) => {
      const account = { id: id("acc"), name };
      accounts.push(account);
      return { id: account.id };
    },
  };

  const users: (UserRecord & { email: string })[] = [];
  const userRepository: UserRepository = {
    findByEmail: async (email) => users.find((u) => u.email === email) ?? null,
    create: async ({ email, passwordHash }) => {
      if (users.some((u) => u.email === email)) {
        throw new ConflictError("Ten adres e-mail jest już zajęty.");
      }
      const user = { id: id("usr"), email, passwordHash };
      users.push(user);
      return { id: user.id };
    },
  };

  const persons: (PersonRecord & { userId: string; displayName: string })[] = [];
  const personRepository: PersonRepository = {
    create: async ({ accountId, userId, displayName }) => {
      const person = { id: id("per"), accountId, userId, displayName };
      persons.push(person);
      return { id: person.id };
    },
    findByUserId: async (userId) => persons.find((p) => p.userId === userId) ?? null,
  };

  const granted: { accountId: string; personId: string; grantedByPersonId: string; permissions: Permission[] }[] = [];
  const permissionRepository: PermissionRepository = {
    grant: async ({ permissions, ...rest }) => {
      granted.push({ ...rest, permissions: [...permissions] });
    },
    listForPerson: async (accountId, personId) =>
      granted.filter((g) => g.accountId === accountId && g.personId === personId).flatMap((g) => g.permissions),
  };

  const sessions: (ActiveSession & { tokenHash: string; revokedAt: Date | null })[] = [];
  const sessionRepository: SessionRepository = {
    create: async ({ personId, accountId, tokenHash, expiresAt, now: createdAt }) => {
      sessions.push({
        id: id("ses"),
        personId,
        accountId,
        tokenHash,
        expiresAt,
        lastSeenAt: createdAt,
        revokedAt: null,
      });
    },
    findActive: async (tokenHash, at) =>
      sessions.find((s) => s.tokenHash === tokenHash && s.revokedAt === null && s.expiresAt > at) ?? null,
    touch: async (sessionId, at) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        session.lastSeenAt = at;
      }
    },
    revoke: async (tokenHash, at) => {
      for (const session of sessions.filter((s) => s.tokenHash === tokenHash)) {
        session.revokedAt = at;
      }
    },
  };

  const counters = new Map<string, number>();
  const counterKey = (kind: AttemptKind, key: string, window?: Date) => `${kind}|${key}|${window?.getTime() ?? "*"}`;
  const loginAttemptRepository: LoginAttemptRepository = {
    count: async (kind, key, window) => counters.get(counterKey(kind, key, window)) ?? 0,
    hit: async (kind, key, window) => {
      const k = counterKey(kind, key, window);
      counters.set(k, (counters.get(k) ?? 0) + 1);
      return counters.get(k) ?? 0;
    },
    clear: async (kind, key) => {
      for (const k of [...counters.keys()].filter((c) => c.startsWith(`${kind}|${key}|`))) {
        counters.delete(k);
      }
    },
  };

  const passwordHasher: PasswordHasher = {
    hash: async (password) => `hash:${password}`,
    verify: async (hash, password) => hash !== null && hash === `hash:${password}`,
  };

  let tokenCounter = 0;
  const tokenGenerator: TokenGenerator = {
    generate: () => `token-${++tokenCounter}`,
    hash: (value) => `digest:${value}`,
  };

  const unitOfWork: UnitOfWork & { runs: number } = {
    runs: 0,
    run: async (work) => {
      unitOfWork.runs += 1;
      const snapshot = {
        accounts: accounts.length,
        users: users.length,
        persons: persons.length,
        granted: granted.length,
        sessions: sessions.length,
      };
      try {
        return await work();
      } catch (error) {
        accounts.length = snapshot.accounts;
        users.length = snapshot.users;
        persons.length = snapshot.persons;
        granted.length = snapshot.granted;
        sessions.length = snapshot.sessions;
        throw error;
      }
    },
  };

  return {
    accounts,
    users,
    persons,
    granted,
    sessions,
    counters,
    clock,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
    deps: {
      clock,
      accountRepository,
      userRepository,
      personRepository,
      permissionRepository,
      sessionRepository,
      loginAttemptRepository,
      passwordHasher,
      tokenGenerator,
      unitOfWork,
    },
  };
}
