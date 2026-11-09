import { describe, expect, it } from "vitest";

import { createFakes } from "../../../testing/fakes";
import { TooManyRequestsError, UnauthorizedError } from "../../errors/app-error";
import { AccountService } from "./account.service";
import { AUTH_LIMITS } from "./auth-limits";
import { AuthService } from "./auth.service";

const credentials = { email: "ala@example.pl", password: "correct horse battery" };

async function setup() {
  const fakes = createFakes();
  await new AccountService(fakes.deps).register({ ...credentials, accountName: "Firma", displayName: "Ala", ip: null });
  fakes.sessions.length = 0;
  return { fakes, service: new AuthService(fakes.deps) };
}

describe("AuthService.signIn", () => {
  it("issues a new session and clears the failure counter", async () => {
    const { fakes, service } = await setup();
    await expect(service.signIn({ ...credentials, password: "wrong", ip: null })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );

    const session = await service.signIn({ ...credentials, ip: null });

    expect(fakes.sessions).toHaveLength(1);
    expect(fakes.sessions[0]?.tokenHash).toBe(`digest:${session.token}`);
    expect(fakes.counters.size).toBe(0);
  });

  it("answers an unknown e-mail and a wrong password identically", async () => {
    const { service } = await setup();

    const unknown = await service
      .signIn({ email: "nikt@example.pl", password: "x", ip: null })
      .catch((e: unknown) => e);
    const wrong = await service.signIn({ ...credentials, password: "x", ip: null }).catch((e: unknown) => e);

    expect(unknown).toBeInstanceOf(UnauthorizedError);
    expect((unknown as Error).message).toBe((wrong as Error).message);
  });

  it("rejects a user that has no person", async () => {
    const { fakes, service } = await setup();
    fakes.persons.length = 0;

    await expect(service.signIn({ ...credentials, ip: null })).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("blocks an e-mail (from an unknown IP) after too many failures, even with the right password", async () => {
    const { service } = await setup();
    for (let n = 0; n < AUTH_LIMITS.loginEmailIp.max; n++) {
      await service.signIn({ ...credentials, password: "wrong", ip: null }).catch(() => undefined);
    }

    await expect(service.signIn({ ...credentials, ip: null })).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("blocks an IP after too many failures across e-mails", async () => {
    const { service } = await setup();
    for (let n = 0; n < AUTH_LIMITS.loginIp.max; n++) {
      await service.signIn({ email: `u${n}@example.pl`, password: "x", ip: "203.0.113.7" }).catch(() => undefined);
    }

    await expect(service.signIn({ ...credentials, ip: "203.0.113.7" })).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("does not let a stranger on another IP lock the owner out", async () => {
    const { service } = await setup();
    for (let n = 0; n < AUTH_LIMITS.loginEmailIp.max; n++) {
      await service.signIn({ ...credentials, password: "wrong", ip: "198.51.100.9" }).catch(() => undefined);
    }

    await expect(service.signIn({ ...credentials, password: "wrong", ip: "198.51.100.9" })).rejects.toBeInstanceOf(
      TooManyRequestsError,
    );
    await expect(service.signIn({ ...credentials, ip: "203.0.113.7" })).resolves.toMatchObject({
      token: expect.any(String),
    });
  });

  it("counts IP failures only when the IP is known", async () => {
    const { fakes, service } = await setup();

    await service.signIn({ ...credentials, password: "x", ip: null }).catch(() => undefined);

    expect([...fakes.counters.keys()].some((k) => k.startsWith("ip|"))).toBe(false);
  });
});

describe("AuthService.authenticate", () => {
  it("returns the actor with permissions read from storage", async () => {
    const { fakes, service } = await setup();
    const { token } = await service.signIn({ ...credentials, ip: null });

    const actor = await service.authenticate(token);

    expect(actor).toMatchObject({ accountId: "acc-1", personId: fakes.persons[0]?.id });
    expect(actor?.permissions).toEqual(["read", "write", "manage_permissions"]);
  });

  it("returns null for an unknown token", async () => {
    const { service } = await setup();

    expect(await service.authenticate("nope")).toBeNull();
  });

  it("returns null after sign-out", async () => {
    const { service } = await setup();
    const { token } = await service.signIn({ ...credentials, ip: null });

    await service.signOut(token);

    expect(await service.authenticate(token)).toBeNull();
  });

  it("returns null after the absolute lifetime", async () => {
    const { fakes, service } = await setup();
    const { token } = await service.signIn({ ...credentials, ip: null });

    fakes.advance(AUTH_LIMITS.sessionAbsoluteMs + 1);

    expect(await service.authenticate(token)).toBeNull();
  });

  it("revokes a session that was idle for too long", async () => {
    const { fakes, service } = await setup();
    const { token } = await service.signIn({ ...credentials, ip: null });

    fakes.advance(AUTH_LIMITS.sessionIdleMs + 1);

    expect(await service.authenticate(token)).toBeNull();
    expect(fakes.sessions[0]?.revokedAt).not.toBeNull();
  });

  it("refreshes last_seen_at only after the touch interval", async () => {
    const { fakes, service } = await setup();
    const { token } = await service.signIn({ ...credentials, ip: null });
    const created = fakes.sessions[0]?.lastSeenAt;

    fakes.advance(AUTH_LIMITS.sessionTouchIntervalMs - 1);
    await service.authenticate(token);
    expect(fakes.sessions[0]?.lastSeenAt).toEqual(created);

    fakes.advance(1);
    await service.authenticate(token);
    expect(fakes.sessions[0]?.lastSeenAt).toEqual(fakes.clock.now());
  });

  it("applies a permission change on the next request", async () => {
    const { fakes, service } = await setup();
    const { token } = await service.signIn({ ...credentials, ip: null });

    fakes.granted.length = 0;

    expect((await service.authenticate(token))?.permissions).toEqual([]);
  });
});
