import { describe, expect, it } from "vitest";

import {
  readSessionToken,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  sessionCookieAttributes,
  sessionCookieName,
} from "./session-cookie";

const expiresAt = new Date("2026-02-01T00:00:00Z");

describe("session cookie", () => {
  it("uses the __Host- prefix only when the cookie is Secure", () => {
    expect(sessionCookieName(true)).toBe("__Host-validuo_session");
    expect(sessionCookieName(false)).toBe("validuo_session");
  });

  it("is HttpOnly, SameSite=Lax and host-wide, with Secure when requested", () => {
    expect(serializeSessionCookie("tok", expiresAt, true)).toBe(
      "__Host-validuo_session=tok; Expires=Sun, 01 Feb 2026 00:00:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    expect(serializeSessionCookie("tok", expiresAt, false)).toBe(
      "validuo_session=tok; Expires=Sun, 01 Feb 2026 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax",
    );
    expect(sessionCookieAttributes(expiresAt, true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  });

  it("clears the cookie with an expired date", () => {
    expect(serializeClearedSessionCookie(false)).toBe(
      "validuo_session=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax",
    );
  });

  it("reads the token from a Cookie header", () => {
    expect(readSessionToken("a=1; validuo_session=tok; b=2", false)).toBe("tok");
    expect(readSessionToken("__Host-validuo_session=tok", true)).toBe("tok");
  });

  it.each([null, "", "a=1", "validuo_session=", "validuo_session", "__Host-validuo_session=tok"])(
    "finds no token in %j",
    (header) => {
      expect(readSessionToken(header, false)).toBeNull();
    },
  );
});
