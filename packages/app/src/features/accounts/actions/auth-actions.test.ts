import { ConflictError, ValidationError } from "@validuo/core/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerAction, signInAction, signOutAction } from "./auth-actions";

const mocks = vi.hoisted(() => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
  logger.child.mockReturnValue(logger);
  const store = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
  const env = { auth: { appOrigin: undefined, trustedProxy: true } };
  return {
    logger,
    store,
    env,
    secure: { value: false },
    headers: new Headers({ "x-forwarded-for": "203.0.113.7" }),
    registerAccount: vi.fn(),
    signInUser: vi.fn(),
    signOutUser: vi.fn(),
    redirect: vi.fn((to: string) => {
      throw new Error(`NEXT_REDIRECT:${to}`);
    }),
  };
});

vi.mock("next/headers", () => ({ cookies: async () => mocks.store, headers: async () => mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/auth-use-cases", () => ({
  registerAccount: mocks.registerAccount,
  signInUser: mocks.signInUser,
  signOutUser: mocks.signOutUser,
}));
vi.mock("@/server/container", () => {
  const scope = {
    resolve: (name: string) => (name === "logger" ? mocks.logger : name === "env" ? mocks.env : mocks.secure.value),
  };
  return { withRequestScope: (fn: (s: typeof scope) => unknown) => fn(scope) };
});

const session = { token: "tok", expiresAt: new Date("2026-02-01T00:00:00Z") };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.logger.child.mockReturnValue(mocks.logger);
  mocks.secure.value = false;
});

describe("registerAction", () => {
  const fields = { email: "a@b.pl", password: "correct horse battery", accountName: "Firma", displayName: "Ala" };

  it("registers, stores the session cookie and redirects to the panel", async () => {
    mocks.registerAccount.mockResolvedValue(session);

    await expect(registerAction(null, form({ ...fields, extra: "ignored" }))).rejects.toThrow("NEXT_REDIRECT:/backend");

    expect(mocks.registerAccount).toHaveBeenCalledWith(expect.anything(), fields, "203.0.113.7", mocks.logger);
    expect(mocks.store.set).toHaveBeenCalledWith("validuo_session", "tok", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });
  });

  it("uses the __Host- cookie in production", async () => {
    mocks.secure.value = true;
    mocks.registerAccount.mockResolvedValue(session);

    await registerAction(null, form(fields)).catch(() => undefined);

    expect(mocks.store.set.mock.calls[0]?.[0]).toBe("__Host-validuo_session");
  });

  it("returns field errors as form state without a cookie or redirect", async () => {
    mocks.registerAccount.mockRejectedValue(new ValidationError("Popraw pola.", { password: ["Za krótkie."] }));

    expect(await registerAction(null, form({ email: "a@b.pl", password: "secret", accountName: "Firma" }))).toEqual({
      message: "Popraw pola.",
      fieldErrors: { password: ["Za krótkie."] },
      // Non-secret fields come back so the cleared form can be refilled; the password never does.
      values: { email: "a@b.pl", accountName: "Firma" },
    });
    expect(mocks.store.set).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("returns a domain error (taken e-mail) as the form message", async () => {
    mocks.registerAccount.mockRejectedValue(new ConflictError("Ten adres e-mail jest już zajęty."));

    expect(await registerAction(null, form(fields))).toEqual({
      message: "Ten adres e-mail jest już zajęty.",
      fieldErrors: {},
      values: { email: "a@b.pl", accountName: "Firma", displayName: "Ala" },
    });
  });

  it("lets an unexpected failure propagate", async () => {
    mocks.registerAccount.mockRejectedValue(new Error("db down"));

    await expect(registerAction(null, form(fields))).rejects.toThrow("db down");
  });

  it("passes missing fields on as null so the schema reports them", async () => {
    mocks.registerAccount.mockRejectedValue(new ValidationError("Popraw pola.", {}));

    await registerAction(null, new FormData());

    expect(mocks.registerAccount.mock.calls[0]?.[1]).toEqual({
      email: null,
      password: null,
      accountName: null,
      displayName: null,
    });
  });
});

describe("signInAction", () => {
  it("signs in, sets the cookie and redirects", async () => {
    mocks.signInUser.mockResolvedValue(session);

    await expect(signInAction(null, form({ email: "a@b.pl", password: "x" }))).rejects.toThrow(
      "NEXT_REDIRECT:/backend",
    );

    expect(mocks.signInUser).toHaveBeenCalledWith(
      expect.anything(),
      { email: "a@b.pl", password: "x" },
      "203.0.113.7",
      mocks.logger,
    );
    expect(mocks.store.set).toHaveBeenCalledOnce();
  });

  it("shows the neutral failure message and sets no cookie", async () => {
    const { UnauthorizedError } = await import("@validuo/core/errors");
    mocks.signInUser.mockRejectedValue(new UnauthorizedError("Nieprawidłowy adres e-mail lub hasło."));

    expect(await signInAction(null, form({ email: "a@b.pl", password: "x" }))).toEqual({
      message: "Nieprawidłowy adres e-mail lub hasło.",
      fieldErrors: {},
      values: { email: "a@b.pl" },
    });
    expect(mocks.store.set).not.toHaveBeenCalled();
  });
});

describe("signOutAction", () => {
  it("revokes the session, deletes the cookie and goes to sign-in", async () => {
    mocks.store.get.mockReturnValue({ value: "tok" });

    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT:/sign-in");

    expect(mocks.signOutUser).toHaveBeenCalledWith(expect.anything(), "tok", mocks.logger);
    expect(mocks.store.delete).toHaveBeenCalledWith("validuo_session");
  });

  it("copes with no session cookie", async () => {
    mocks.store.get.mockReturnValue(undefined);

    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT:/sign-in");

    expect(mocks.signOutUser).toHaveBeenCalledWith(expect.anything(), null, mocks.logger);
  });
});
