import { MikroORM } from "@mikro-orm/postgresql";
import { ConflictError } from "@validuo/core/errors";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { testDatabaseUrl } from "../testing/vitest";
import { createOrmConfig } from "./config";
import { MikroOrmAccountRepository } from "./repositories/accounts/mikro-orm-account.repository";
import { MikroOrmLoginAttemptRepository } from "./repositories/accounts/mikro-orm-login-attempt.repository";
import { MikroOrmPermissionRepository } from "./repositories/accounts/mikro-orm-permission.repository";
import { MikroOrmPersonRepository } from "./repositories/accounts/mikro-orm-person.repository";
import { MikroOrmSessionRepository } from "./repositories/accounts/mikro-orm-session.repository";
import { MikroOrmUserRepository } from "./repositories/accounts/mikro-orm-user.repository";
import { MikroOrmUnitOfWork } from "./transactions/mikro-orm-unit-of-work";

const orm = new MikroORM(createOrmConfig({ url: testDatabaseUrl(), poolMin: 0, poolMax: 5, debug: false }));

afterAll(async () => {
  await orm.close();
});

beforeEach(async () => {
  await orm.em.fork().execute("truncate table sessions, permissions, persons, users, accounts, login_attempts cascade");
});

// Every test works on its own scope, like a request does.
function scope() {
  const em = orm.em.fork();
  return {
    em,
    accounts: new MikroOrmAccountRepository({ em }),
    users: new MikroOrmUserRepository({ em }),
    persons: new MikroOrmPersonRepository({ em }),
    permissions: new MikroOrmPermissionRepository({ em }),
    sessions: new MikroOrmSessionRepository({ em }),
    attempts: new MikroOrmLoginAttemptRepository({ em }),
    unitOfWork: new MikroOrmUnitOfWork({ em }),
  };
}

async function createMember(s: ReturnType<typeof scope>, email: string) {
  const account = await s.accounts.create({ name: `Firma ${email}` });
  const user = await s.users.create({ email, passwordHash: "hash" });
  const person = await s.persons.create({ accountId: account.id, userId: user.id, displayName: "Ala" });
  return { accountId: account.id, userId: user.id, personId: person.id };
}

describe("account schema constraints", () => {
  it("refuses a session or permission that mixes a person with another account", async () => {
    const s = scope();
    const a = await createMember(s, "a@example.pl");
    const b = await createMember(s, "b@example.pl");
    const now = new Date();

    await expect(
      s.sessions.create({
        personId: a.personId,
        accountId: b.accountId,
        tokenHash: "t".repeat(64),
        expiresAt: new Date(now.getTime() + 1000),
        now,
      }),
    ).rejects.toThrow();
    await expect(
      s.permissions.grant({
        accountId: b.accountId,
        personId: a.personId,
        grantedByPersonId: a.personId,
        permissions: [{ scope: "account", scopeId: b.accountId, action: "read" }],
      }),
    ).rejects.toThrow();
  });

  it("refuses a grant recorded by a person of another account", async () => {
    const s = scope();
    const a = await createMember(s, "a@example.pl");
    const b = await createMember(s, "b@example.pl");

    await expect(
      s.permissions.grant({
        accountId: a.accountId,
        personId: a.personId,
        grantedByPersonId: b.personId,
        permissions: [{ scope: "account", scopeId: a.accountId, action: "read" }],
      }),
    ).rejects.toThrow();
  });

  it("allows only the account scope on the account itself, and no duplicate permission", async () => {
    const s = scope();
    const a = await createMember(s, "a@example.pl");
    const grant = (scopeId: string, action: "read" | "write") =>
      s.permissions.grant({
        accountId: a.accountId,
        personId: a.personId,
        grantedByPersonId: a.personId,
        permissions: [{ scope: "account", scopeId, action }],
      });

    await expect(grant("00000000-0000-4000-8000-000000000000", "read")).rejects.toThrow();
    await grant(a.accountId, "read");
    await expect(grant(a.accountId, "read")).rejects.toThrow();
    await expect(grant(a.accountId, "write")).resolves.toBeUndefined();
  });

  it("rejects values outside the catalogue and a non-canonical e-mail", async () => {
    const s = scope();
    const a = await createMember(s, "a@example.pl");

    await expect(
      s.em.execute(
        `insert into permissions (account_id, person_id, scope_type, scope_id, action, granted_by_person_id)
         values (?, ?, 'account', ?, 'destroy', ?)`,
        [a.accountId, a.personId, a.accountId, a.personId],
      ),
    ).rejects.toThrow();
    await expect(s.users.create({ email: "Mixed@Example.pl", passwordHash: "h" })).rejects.toThrow();
  });
});

describe("account repositories", () => {
  it("maps a duplicate e-mail to ConflictError", async () => {
    const s = scope();
    await s.users.create({ email: "a@example.pl", passwordHash: "h" });

    await expect(scope().users.create({ email: "a@example.pl", passwordHash: "h" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("reads permissions only for the given account and person", async () => {
    const s = scope();
    const a = await createMember(s, "a@example.pl");
    const b = await createMember(s, "b@example.pl");
    await s.permissions.grant({
      accountId: a.accountId,
      personId: a.personId,
      grantedByPersonId: a.personId,
      permissions: [{ scope: "account", scopeId: a.accountId, action: "manage_permissions" }],
    });

    expect(await s.permissions.listForPerson(a.accountId, a.personId)).toEqual([
      { scope: "account", scopeId: a.accountId, action: "manage_permissions" },
    ]);
    expect(await s.permissions.listForPerson(b.accountId, b.personId)).toEqual([]);
    expect(await s.permissions.listForPerson(b.accountId, a.personId)).toEqual([]);
  });

  it("finds a session only while it is neither revoked nor expired", async () => {
    const s = scope();
    const a = await createMember(s, "a@example.pl");
    const now = new Date();
    const create = (tokenHash: string, ttlMs: number) =>
      s.sessions.create({
        personId: a.personId,
        accountId: a.accountId,
        tokenHash,
        expiresAt: new Date(now.getTime() + ttlMs),
        now,
      });
    await create("a".repeat(64), 60_000);
    await create("b".repeat(64), -1000);

    expect(await s.sessions.findActive("a".repeat(64), now)).toMatchObject({
      personId: a.personId,
      accountId: a.accountId,
    });
    expect(await s.sessions.findActive("b".repeat(64), now)).toBeNull();

    const later = new Date(now.getTime() + 5000);
    await s.sessions.touch((await s.sessions.findActive("a".repeat(64), now))?.id ?? "", later);
    expect((await scope().sessions.findActive("a".repeat(64), now))?.lastSeenAt).toEqual(later);

    await s.sessions.revoke("a".repeat(64), later);
    expect(await scope().sessions.findActive("a".repeat(64), now)).toBeNull();
  });

  it("counts attempts atomically under concurrency and clears them", async () => {
    const s = scope();
    const window = new Date("2026-01-01T12:00:00Z");

    await Promise.all(Array.from({ length: 10 }, () => scope().attempts.hit("login_email", "k".repeat(64), window)));

    expect(await s.attempts.count("login_email", "k".repeat(64), window)).toBe(10);
    expect(await s.attempts.count("login_email", "k".repeat(64), new Date("2026-01-01T12:15:00Z"))).toBe(0);
    await s.attempts.clear("login_email", "k".repeat(64));
    expect(await scope().attempts.count("login_email", "k".repeat(64), window)).toBe(0);
  });
});

describe("MikroOrmUnitOfWork", () => {
  it("rolls back every repository write when the work fails", async () => {
    const s = scope();
    await s.users.create({ email: "taken@example.pl", passwordHash: "h" });

    const attempt = scope();
    await expect(
      attempt.unitOfWork.run(async () => {
        await attempt.accounts.create({ name: "Powinno zniknąć" });
        await attempt.users.create({ email: "taken@example.pl", passwordHash: "h" });
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    const [row] = await scope().em.execute<{ n: string }[]>("select count(*)::text as n from accounts");
    expect(row?.n).toBe("0");
  });

  it("commits the whole unit together", async () => {
    const s = scope();

    const member = await s.unitOfWork.run(() => createMember(s, "ok@example.pl"));

    expect(await scope().persons.findByUserId(member.userId)).toEqual({
      id: member.personId,
      accountId: member.accountId,
    });
  });

  it("keeps a rate-limit counter written outside the unit even when the unit rolls back", async () => {
    const s = scope();
    const window = new Date("2026-01-01T12:00:00Z");
    await s.attempts.hit("register_ip", "i".repeat(64), window);

    const attempt = scope();
    await attempt.unitOfWork
      .run(async () => {
        await attempt.accounts.create({ name: "x" });
        throw new Error("fail");
      })
      .catch(() => undefined);

    expect(await scope().attempts.count("register_ip", "i".repeat(64), window)).toBe(1);
  });
});
