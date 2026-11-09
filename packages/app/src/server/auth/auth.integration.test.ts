import { testDatabaseUrl } from "@validuo/db/testing/vitest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as ContainerModule from "../container";

let containerModule: typeof ContainerModule;
type RouteModule = { POST: (request: Request, segment: { params: Promise<object> }) => Promise<Response> };
let register: RouteModule["POST"];
let signIn: RouteModule["POST"];
let signOut: RouteModule["POST"];

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", testDatabaseUrl());
  containerModule = await import("../container");
  register = (await import("../../app/api/auth/register/route")).POST;
  signIn = (await import("../../app/api/auth/sign-in/route")).POST;
  signOut = (await import("../../app/api/auth/sign-out/route")).POST;
});

afterAll(async () => {
  await containerModule.getContainer().dispose();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  await containerModule
    .getContainer()
    .resolve("orm")
    .em.fork()
    .execute("truncate table sessions, permissions, persons, users, accounts, login_attempts cascade");
});

const origin = "http://localhost";
const call = (route: RouteModule["POST"], body: unknown, headers: Record<string, string> = {}) =>
  route(
    new Request("http://localhost/api/auth/x", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { origin, ...headers },
    }),
    { params: Promise.resolve({}) },
  );
const cookieOf = (response: Response) => response.headers.getSetCookie()[0]?.split(";")[0] ?? "";
const registration = {
  email: "Ala@Example.pl",
  password: "correct horse battery",
  accountName: "Firma",
  displayName: "Ala",
};

async function actorFor(cookie: string) {
  const token = cookie.split("=")[1] ?? "";
  return containerModule.withRequestScope((scope) => scope.resolve("authService").authenticate(token));
}

describe("account registration and sign-in over the real stack", () => {
  it("registers, authenticates through the cookie and gives the founder full account permissions", async () => {
    const response = await call(register, registration);
    expect(response.status).toBe(201);

    const actor = await actorFor(cookieOf(response));
    expect(actor?.permissions.map((p) => p.action).sort()).toEqual(["manage_permissions", "read", "write"]);
    expect(actor?.permissions.every((p) => p.scope === "account" && p.scopeId === actor.accountId)).toBe(true);
  });

  it("answers 409 for a taken e-mail (case-insensitively) and creates nothing new", async () => {
    await call(register, registration);

    const response = await call(register, { ...registration, email: "ALA@example.pl", accountName: "Inna" });

    expect(response.status).toBe(409);
    expect(response.headers.getSetCookie()).toEqual([]);
    const [row] = await containerModule
      .getContainer()
      .resolve("orm")
      .em.fork()
      .execute<{ n: string }[]>("select count(*)::text as n from accounts");
    expect(row?.n).toBe("1");
  });

  it("signs in with the right password, refuses a wrong one and blocks after five failures", async () => {
    await call(register, registration);
    const credentials = { email: "ala@example.pl", password: registration.password };

    expect((await call(signIn, credentials)).status).toBe(200);
    for (let n = 0; n < 5; n++) {
      expect((await call(signIn, { ...credentials, password: "wrong password!!" })).status).toBe(401);
    }
    expect((await call(signIn, credentials)).status).toBe(429);
  });

  it("keeps accounts apart: each person sees only permissions of their own account", async () => {
    const first = await actorFor(cookieOf(await call(register, registration)));
    const second = await actorFor(
      cookieOf(await call(register, { ...registration, email: "ola@example.pl", accountName: "Druga" })),
    );

    expect(first?.accountId).not.toBe(second?.accountId);
    expect(second?.permissions.every((p) => p.scopeId === second.accountId)).toBe(true);
  });

  it("ends the session on sign-out", async () => {
    const cookie = cookieOf(await call(register, registration));
    expect(await actorFor(cookie)).not.toBeNull();

    const response = await call(signOut, {}, { cookie });

    expect(response.status).toBe(200);
    expect(await actorFor(cookie)).toBeNull();
  });

  it("refuses a cross-site registration before touching the database", async () => {
    const response = await call(register, registration, { origin: "https://evil.example" });

    expect(response.status).toBe(403);
  });
});
