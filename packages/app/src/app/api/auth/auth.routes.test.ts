import { UnauthorizedError } from "@validuo/core/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as register } from "./register/route";
import { POST as signIn } from "./sign-in/route";
import { POST as signOut } from "./sign-out/route";

const { logger, services, env } = vi.hoisted(() => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
  logger.child.mockReturnValue(logger);
  return {
    logger,
    env: { auth: { appOrigin: undefined as string | undefined, trustedProxy: false } },
    services: {
      accountService: { register: vi.fn() },
      authService: { signIn: vi.fn(), signOut: vi.fn() },
    },
  };
});

vi.mock("@/server/container", () => {
  const registry: Record<string, unknown> = { logger, env, secureCookies: false, ...services };
  const scope = { resolve: (name: string) => registry[name] };
  return { getContainer: () => scope, withRequestScope: (fn: (s: typeof scope) => unknown) => fn(scope) };
});

const origin = "http://localhost";
const segment = { params: Promise.resolve({}) };
const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/auth/x", { method: "POST", body, headers: { origin, ...headers } });

const session = { token: "tok", expiresAt: new Date("2026-02-01T00:00:00Z") };
const registration = {
  email: "ala@example.pl",
  password: "correct horse battery",
  accountName: "Firma",
  displayName: "Ala",
};

beforeEach(() => {
  vi.clearAllMocks();
  logger.child.mockReturnValue(logger);
  env.auth.trustedProxy = false;
});

describe("POST /api/auth/register", () => {
  it("creates the account, answers 201 and sets the session cookie", async () => {
    services.accountService.register.mockResolvedValue(session);

    const response = await register(post(JSON.stringify(registration)), segment);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, data: { signedIn: true } });
    expect(response.headers.getSetCookie()[0]).toMatch(/^validuo_session=tok; .*HttpOnly.*SameSite=Lax/);
    expect(services.accountService.register).toHaveBeenCalledWith(expect.objectContaining({ ip: null }));
  });

  it("passes the proxy-provided client IP only when the proxy is trusted", async () => {
    services.accountService.register.mockResolvedValue(session);
    env.auth.trustedProxy = true;

    await register(post(JSON.stringify(registration), { "x-forwarded-for": "203.0.113.7" }), segment);

    expect(services.accountService.register).toHaveBeenCalledWith(expect.objectContaining({ ip: "203.0.113.7" }));
  });

  it("answers 422 with field errors and no cookie for invalid input", async () => {
    const response = await register(post(JSON.stringify({ ...registration, password: "short" })), segment);

    expect(response.status).toBe(422);
    expect((await response.json()).error.fieldErrors.password).toBeDefined();
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("answers 403 to a cross-site request and 400 to malformed JSON", async () => {
    expect((await register(post("{}", { origin: "https://evil.example" }), segment)).status).toBe(403);
    expect((await register(post("{nope"), segment)).status).toBe(400);
  });
});

describe("POST /api/auth/sign-in", () => {
  it("signs in and sets the cookie", async () => {
    services.authService.signIn.mockResolvedValue(session);

    const response = await signIn(post(JSON.stringify({ email: "ala@example.pl", password: "x" })), segment);

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()[0]).toContain("validuo_session=tok");
  });

  it("answers 401 with a neutral message and sets no cookie", async () => {
    services.authService.signIn.mockRejectedValue(new UnauthorizedError("Nieprawidłowy adres e-mail lub hasło."));

    const response = await signIn(post(JSON.stringify({ email: "ala@example.pl", password: "x" })), segment);

    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});

describe("POST /api/auth/sign-out", () => {
  it("revokes the session from the cookie and clears it", async () => {
    const response = await signOut(post("", { cookie: "validuo_session=tok" }), segment);

    expect(services.authService.signOut).toHaveBeenCalledWith("tok");
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()[0]).toContain("validuo_session=; Expires=Thu, 01 Jan 1970");
  });

  it("still clears the cookie when there is no session", async () => {
    const response = await signOut(post(""), segment);

    expect(services.authService.signOut).not.toHaveBeenCalled();
    expect(response.headers.getSetCookie()).toHaveLength(1);
  });
});
