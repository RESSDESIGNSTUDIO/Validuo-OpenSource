import { TooManyRequestsError, UnauthorizedError, ValidationError } from "@validuo/core/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RequestScope } from "../container";
import { registerAccount, signInUser, signOutUser } from "./auth-use-cases";

const accountService = { register: vi.fn() };
const authService = { signIn: vi.fn(), signOut: vi.fn() };
const scope = {
  resolve: (name: string) => (name === "accountService" ? accountService : authService),
} as unknown as RequestScope;
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
const session = { token: "tok", expiresAt: new Date("2026-02-01T00:00:00Z") };

const registration = {
  email: "Ala@Example.pl",
  password: "correct horse battery",
  accountName: "Firma",
  displayName: "Ala",
};

beforeEach(() => vi.clearAllMocks());

describe("registerAccount", () => {
  it("validates, normalises, registers and logs without personal data", async () => {
    accountService.register.mockResolvedValue(session);

    expect(await registerAccount(scope, registration, "203.0.113.7", logger)).toBe(session);

    expect(accountService.register).toHaveBeenCalledWith({
      email: "ala@example.pl",
      password: "correct horse battery",
      accountName: "Firma",
      displayName: "Ala",
      ip: "203.0.113.7",
    });
    expect(logger.info).toHaveBeenCalledWith("auth.register.created");
  });

  it("rejects invalid input before calling the service", async () => {
    await expect(registerAccount(scope, { ...registration, password: "short" }, null, logger)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(accountService.register).not.toHaveBeenCalled();
  });
});

describe("signInUser", () => {
  const credentials = { email: "Ala@Example.pl", password: "x" };

  it("signs in with the normalised e-mail", async () => {
    authService.signIn.mockResolvedValue(session);

    expect(await signInUser(scope, credentials, null, logger)).toBe(session);
    expect(authService.signIn).toHaveBeenCalledWith({ email: "ala@example.pl", password: "x", ip: null });
  });

  it.each([
    [new UnauthorizedError("Nie."), "auth.sign_in.failed"],
    [new TooManyRequestsError("Za dużo."), "auth.sign_in.blocked"],
  ])("logs %s as %s and rethrows", async (error, event) => {
    authService.signIn.mockRejectedValue(error);

    await expect(signInUser(scope, credentials, null, logger)).rejects.toBe(error);
    expect(logger.warn).toHaveBeenCalledWith(event);
  });

  it("rethrows other failures without logging an auth event", async () => {
    const failure = new Error("db down");
    authService.signIn.mockRejectedValue(failure);

    await expect(signInUser(scope, credentials, null, logger)).rejects.toBe(failure);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("rejects invalid input before calling the service", async () => {
    await expect(signInUser(scope, { email: "nope", password: "x" }, null, logger)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(authService.signIn).not.toHaveBeenCalled();
  });
});

describe("signOutUser", () => {
  it("revokes the session for a token", async () => {
    await signOutUser(scope, "tok", logger);

    expect(authService.signOut).toHaveBeenCalledWith("tok");
    expect(logger.info).toHaveBeenCalledWith("auth.sign_out");
  });

  it("does nothing without a token", async () => {
    await signOutUser(scope, null, logger);

    expect(authService.signOut).not.toHaveBeenCalled();
  });
});
