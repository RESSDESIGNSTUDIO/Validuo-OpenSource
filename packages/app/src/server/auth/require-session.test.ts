import { UnauthorizedError } from "@validuo/core/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RequestScope } from "../container";
import { requireSession, sessionTokenFromCookies } from "./require-session";

const { store, authService } = vi.hoisted(() => ({
  store: { get: vi.fn() },
  authService: { authenticate: vi.fn() },
}));
vi.mock("next/headers", () => ({ cookies: async () => store }));

const scopeWith = (secure: boolean) =>
  ({ resolve: (name: string) => (name === "authService" ? authService : secure) }) as unknown as RequestScope;
const actor = { personId: "p1", accountId: "acc-1", permissions: [] };

beforeEach(() => vi.clearAllMocks());

describe("requireSession", () => {
  it("returns the actor of a valid session", async () => {
    authService.authenticate.mockResolvedValue(actor);

    expect(await requireSession(scopeWith(false), "tok")).toBe(actor);
    expect(authService.authenticate).toHaveBeenCalledWith("tok");
  });

  it("refuses a request without a token without touching storage", async () => {
    await expect(requireSession(scopeWith(false), null)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(authService.authenticate).not.toHaveBeenCalled();
  });

  it("refuses an unknown, revoked or expired session", async () => {
    authService.authenticate.mockResolvedValue(null);

    await expect(requireSession(scopeWith(false), "stale")).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("sessionTokenFromCookies", () => {
  it.each([
    [false, "validuo_session"],
    [true, "__Host-validuo_session"],
  ])("reads the token from the %s cookie name", async (secure, name) => {
    store.get.mockReturnValue({ value: "tok" });

    expect(await sessionTokenFromCookies(scopeWith(secure))).toBe("tok");
    expect(store.get).toHaveBeenCalledWith(name);
  });

  it("returns null without the cookie", async () => {
    store.get.mockReturnValue(undefined);

    expect(await sessionTokenFromCookies(scopeWith(false))).toBeNull();
  });
});
