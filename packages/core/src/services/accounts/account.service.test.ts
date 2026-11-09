import { describe, expect, it } from "vitest";

import { createFakes } from "../../../testing/fakes";
import { ConflictError, TooManyRequestsError } from "../../errors/app-error";
import { AUTH_LIMITS } from "./auth-limits";
import { AccountService } from "./account.service";

const command = {
  email: "ala@example.pl",
  password: "correct horse battery",
  accountName: "Firma",
  displayName: "Ala",
  ip: null,
};

describe("AccountService.register", () => {
  it("creates the account, its first person with full permissions and a session", async () => {
    const fakes = createFakes();
    const service = new AccountService(fakes.deps);

    const session = await service.register(command);

    expect(fakes.accounts).toHaveLength(1);
    expect(fakes.users[0]?.passwordHash).toBe("hash:correct horse battery");
    expect(fakes.persons[0]).toMatchObject({ accountId: "acc-1", displayName: "Ala" });
    expect(fakes.granted[0]).toMatchObject({ personId: fakes.persons[0]?.id });
    expect(fakes.granted[0]?.actions).toEqual(["read", "write", "manage_permissions"]);
    expect(fakes.sessions[0]?.tokenHash).toBe(`digest:${session.token}`);
    expect(session.expiresAt.getTime() - fakes.clock.now().getTime()).toBe(AUTH_LIMITS.sessionAbsoluteMs);
  });

  it("leaves nothing behind when the e-mail is taken", async () => {
    const fakes = createFakes();
    const service = new AccountService(fakes.deps);
    await service.register(command);

    await expect(service.register({ ...command, accountName: "Inna" })).rejects.toBeInstanceOf(ConflictError);

    expect(fakes.accounts).toHaveLength(1);
    expect(fakes.users).toHaveLength(1);
    expect(fakes.persons).toHaveLength(1);
    expect(fakes.sessions).toHaveLength(1);
  });

  it("limits registrations per IP and counts every attempt", async () => {
    const fakes = createFakes();
    const service = new AccountService(fakes.deps);
    const withIp = (n: number) => ({ ...command, email: `u${n}@example.pl`, ip: "203.0.113.7" });

    for (let n = 0; n < AUTH_LIMITS.registerIp.max; n++) {
      await service.register(withIp(n));
    }

    await expect(service.register(withIp(99))).rejects.toBeInstanceOf(TooManyRequestsError);
    expect(fakes.accounts).toHaveLength(AUTH_LIMITS.registerIp.max);
  });

  it("starts a fresh window after the previous one ends", async () => {
    const fakes = createFakes();
    const service = new AccountService(fakes.deps);
    for (let n = 0; n < AUTH_LIMITS.registerIp.max; n++) {
      await service.register({ ...command, email: `u${n}@example.pl`, ip: "203.0.113.7" });
    }

    fakes.advance(AUTH_LIMITS.registerIp.windowMs);

    await expect(service.register({ ...command, email: "later@example.pl", ip: "203.0.113.7" })).resolves.toBeDefined();
  });
});
