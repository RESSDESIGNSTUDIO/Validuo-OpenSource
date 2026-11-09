import { describe, expect, it } from "vitest";

import { appUrl } from "../testing/vitest";

const unique = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.pl`;
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${appUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: appUrl(), ...headers },
    body: JSON.stringify(body),
  });

describe("authentication API on the production build", () => {
  it("registers, answers with a hardened session cookie and signs in again", async () => {
    const email = unique();
    const registration = { email, password: "correct horse battery", accountName: "Firma E2E", displayName: "Ala" };

    const registered = await post("/api/auth/register", registration);

    expect(registered.status).toBe(201);
    const cookie = registered.headers.getSetCookie()[0] ?? "";
    expect(cookie).toMatch(/^__Host-validuo_session=[A-Za-z0-9_-]{43};/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Domain");
    expect(registered.headers.get("cache-control")).toBe("no-store");

    expect((await post("/api/auth/sign-in", { email, password: registration.password })).status).toBe(200);
    expect((await post("/api/auth/sign-in", { email, password: "definitely wrong" })).status).toBe(401);
  });

  it("refuses a cross-site mutation and a duplicate e-mail", async () => {
    const email = unique();
    const registration = { email, password: "correct horse battery", accountName: "Firma", displayName: "Ala" };
    await post("/api/auth/register", registration);

    expect((await post("/api/auth/register", registration, { origin: "https://evil.example" })).status).toBe(403);
    expect((await post("/api/auth/register", registration)).status).toBe(409);
  });

  it("reports field errors without echoing the submitted values", async () => {
    const response = await post("/api/auth/register", {
      email: "not-an-email",
      password: "tooshort1",
      accountName: "",
      displayName: "Ala",
    });
    const text = await response.text();

    expect(response.status).toBe(422);
    expect(JSON.parse(text).error.fieldErrors.password).toBeDefined();
    expect(text).not.toContain("tooshort1");
  });
});
