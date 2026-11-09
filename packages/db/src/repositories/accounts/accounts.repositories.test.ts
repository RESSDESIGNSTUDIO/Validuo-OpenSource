import { UniqueConstraintViolationException } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { ConflictError } from "@validuo/core/errors";
import { describe, expect, it, vi } from "vitest";

import { MikroOrmAccountRepository } from "./mikro-orm-account.repository";
import { MikroOrmLoginAttemptRepository } from "./mikro-orm-login-attempt.repository";
import { MikroOrmPermissionRepository } from "./mikro-orm-permission.repository";
import { MikroOrmPersonRepository } from "./mikro-orm-person.repository";
import { MikroOrmSessionRepository } from "./mikro-orm-session.repository";
import { MikroOrmUserRepository } from "./mikro-orm-user.repository";

// The repositories only call a handful of EntityManager methods; the SQL they produce is covered by
// the integration tests (`accounts.integration.test.ts`).
function fakeEm(methods: Record<string, unknown>) {
  return { em: methods as unknown as EntityManager };
}
const now = new Date("2026-01-01T12:00:00Z");

describe("MikroOrmAccountRepository", () => {
  it("inserts the account and returns its id", async () => {
    const insert = vi.fn().mockResolvedValue("acc-1");

    expect(await new MikroOrmAccountRepository(fakeEm({ insert })).create({ name: "Firma" })).toEqual({ id: "acc-1" });
    expect(insert).toHaveBeenCalledWith(expect.anything(), { name: "Firma" });
  });
});

describe("MikroOrmUserRepository", () => {
  it("maps a found user to a record without leaking the entity", async () => {
    const findOne = vi.fn().mockResolvedValue({ id: "u1", passwordHash: "h", email: "a@b.pl" });

    expect(await new MikroOrmUserRepository(fakeEm({ findOne })).findByEmail("a@b.pl")).toEqual({
      id: "u1",
      passwordHash: "h",
    });
  });

  it("returns null for an unknown e-mail", async () => {
    const findOne = vi.fn().mockResolvedValue(null);

    expect(await new MikroOrmUserRepository(fakeEm({ findOne })).findByEmail("x@b.pl")).toBeNull();
  });

  it("creates a user", async () => {
    const insert = vi.fn().mockResolvedValue("u1");

    expect(await new MikroOrmUserRepository(fakeEm({ insert })).create({ email: "a@b.pl", passwordHash: "h" })).toEqual(
      {
        id: "u1",
      },
    );
  });

  it("turns a unique violation into ConflictError and keeps the cause", async () => {
    const violation = new UniqueConstraintViolationException(new Error("duplicate key"));
    const insert = vi.fn().mockRejectedValue(violation);

    const error = await new MikroOrmUserRepository(fakeEm({ insert }))
      .create({ email: "a@b.pl", passwordHash: "h" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).cause).toBe(violation);
  });

  it("rethrows any other failure unchanged", async () => {
    const failure = new Error("connection lost");
    const insert = vi.fn().mockRejectedValue(failure);

    await expect(
      new MikroOrmUserRepository(fakeEm({ insert })).create({ email: "a@b.pl", passwordHash: "h" }),
    ).rejects.toBe(failure);
  });
});

describe("MikroOrmPersonRepository", () => {
  it("creates a person", async () => {
    const insert = vi.fn().mockResolvedValue("p1");
    const input = { accountId: "acc-1", userId: "u1", displayName: "Ala" };

    expect(await new MikroOrmPersonRepository(fakeEm({ insert })).create(input)).toEqual({ id: "p1" });
    expect(insert).toHaveBeenCalledWith(expect.anything(), input);
  });

  it("finds a person by user", async () => {
    const findOne = vi.fn().mockResolvedValueOnce({ id: "p1", accountId: "acc-1" }).mockResolvedValueOnce(null);
    const repository = new MikroOrmPersonRepository(fakeEm({ findOne }));

    expect(await repository.findByUserId("u1")).toEqual({ id: "p1", accountId: "acc-1" });
    expect(await repository.findByUserId("u2")).toBeNull();
  });
});

describe("MikroOrmPermissionRepository", () => {
  it("writes one row per action", async () => {
    const insertMany = vi.fn().mockResolvedValue([]);

    await new MikroOrmPermissionRepository(fakeEm({ insertMany })).grant({
      accountId: "acc-1",
      personId: "p1",
      actions: ["read", "write"],
    });

    expect(insertMany).toHaveBeenCalledWith(expect.anything(), [
      { accountId: "acc-1", personId: "p1", action: "read" },
      { accountId: "acc-1", personId: "p1", action: "write" },
    ]);
  });

  it("writes nothing for an empty list", async () => {
    const insertMany = vi.fn();

    await new MikroOrmPermissionRepository(fakeEm({ insertMany })).grant({
      accountId: "acc-1",
      personId: "p1",
      actions: [],
    });

    expect(insertMany).not.toHaveBeenCalled();
  });

  it("reads actions scoped to the account and the person", async () => {
    const find = vi.fn().mockResolvedValue([{ action: "write" }]);

    expect(await new MikroOrmPermissionRepository(fakeEm({ find })).listForPerson("acc-1", "p1")).toEqual(["write"]);
    expect(find).toHaveBeenCalledWith(expect.anything(), { accountId: "acc-1", personId: "p1" });
  });

  it("refuses a stored value outside the catalogue", async () => {
    const find = vi.fn().mockResolvedValue([{ action: "destroy" }]);

    await expect(new MikroOrmPermissionRepository(fakeEm({ find })).listForPerson("acc-1", "p1")).rejects.toThrow(
      "Unknown permission value in storage",
    );
  });
});

describe("MikroOrmSessionRepository", () => {
  it("stores the digest with creation and last-seen times", async () => {
    const insert = vi.fn().mockResolvedValue("s1");
    const expiresAt = new Date(now.getTime() + 1000);

    await new MikroOrmSessionRepository(fakeEm({ insert })).create({
      personId: "p1",
      accountId: "acc-1",
      tokenHash: "digest",
      expiresAt,
      now,
    });

    expect(insert).toHaveBeenCalledWith(expect.anything(), {
      personId: "p1",
      accountId: "acc-1",
      tokenHash: "digest",
      expiresAt,
      createdAt: now,
      lastSeenAt: now,
    });
  });

  it("finds only a session that is not revoked and not expired", async () => {
    const stored = { id: "s1", personId: "p1", accountId: "acc-1", lastSeenAt: now, expiresAt: now, tokenHash: "d" };
    const findOne = vi.fn().mockResolvedValueOnce(stored).mockResolvedValueOnce(null);
    const repository = new MikroOrmSessionRepository(fakeEm({ findOne }));

    expect(await repository.findActive("d", now)).toEqual({
      id: "s1",
      personId: "p1",
      accountId: "acc-1",
      lastSeenAt: now,
      expiresAt: now,
    });
    expect(await repository.findActive("other", now)).toBeNull();
    expect(findOne).toHaveBeenNthCalledWith(1, expect.anything(), {
      tokenHash: "d",
      revokedAt: null,
      expiresAt: { $gt: now },
    });
  });

  it("touches and revokes", async () => {
    const nativeUpdate = vi.fn().mockResolvedValue(1);
    const repository = new MikroOrmSessionRepository(fakeEm({ nativeUpdate }));

    await repository.touch("s1", now);
    await repository.revoke("d", now);

    expect(nativeUpdate).toHaveBeenNthCalledWith(1, expect.anything(), { id: "s1" }, { lastSeenAt: now });
    expect(nativeUpdate).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      { tokenHash: "d", revokedAt: null },
      { revokedAt: now },
    );
  });
});

describe("MikroOrmLoginAttemptRepository", () => {
  it("counts a window, defaulting to zero", async () => {
    const findOne = vi.fn().mockResolvedValueOnce({ count: 3 }).mockResolvedValueOnce(null);
    const repository = new MikroOrmLoginAttemptRepository(fakeEm({ findOne }));

    expect(await repository.count("email_ip", "k", now)).toBe(3);
    expect(await repository.count("email_ip", "k", now)).toBe(0);
  });

  it("increments with a single upsert and returns the new value", async () => {
    const execute = vi.fn().mockResolvedValue([{ count: 2 }]);

    expect(await new MikroOrmLoginAttemptRepository(fakeEm({ execute })).hit("ip", "k", now)).toBe(2);
    expect(execute.mock.calls[0]?.[0]).toContain("on conflict");
    expect(execute.mock.calls[0]?.[1]).toEqual(["ip", "k", now]);
  });

  it("removes a bounded batch of expired windows when it counts", async () => {
    const execute = vi.fn().mockResolvedValue([{ count: 1 }]);

    await new MikroOrmLoginAttemptRepository(fakeEm({ execute })).hit("ip", "k", now);

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[1]?.[0]).toMatch(/delete from login_attempts.*window_start < \?.*limit 100/s);
    expect(execute.mock.calls[1]?.[1]).toEqual([now]);
  });

  it("reports zero when the statement returns no row", async () => {
    const execute = vi.fn().mockResolvedValue([]);

    expect(await new MikroOrmLoginAttemptRepository(fakeEm({ execute })).hit("ip", "k", now)).toBe(0);
  });

  it("clears all windows of a key", async () => {
    const nativeDelete = vi.fn().mockResolvedValue(1);

    await new MikroOrmLoginAttemptRepository(fakeEm({ nativeDelete })).clear("email_ip", "k");

    expect(nativeDelete).toHaveBeenCalledWith(expect.anything(), { kind: "email_ip", keyHash: "k" });
  });
});
