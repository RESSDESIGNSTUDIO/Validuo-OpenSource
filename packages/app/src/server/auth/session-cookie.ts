import "server-only";

const BASE_NAME = "validuo_session";

/** `__Host-` pins the cookie to this host, forbids `Domain` and requires `Secure` + `Path=/`. */
export function sessionCookieName(secure: boolean): string {
  return secure ? `__Host-${BASE_NAME}` : BASE_NAME;
}

export type SessionCookieAttributes = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  expires: Date;
};

export function sessionCookieAttributes(expiresAt: Date, secure: boolean): SessionCookieAttributes {
  return { httpOnly: true, secure, sameSite: "lax", path: "/", expires: expiresAt };
}

/** `Set-Cookie` header value that stores the session token. */
export function serializeSessionCookie(token: string, expiresAt: Date, secure: boolean): string {
  return serialize(sessionCookieName(secure), token, sessionCookieAttributes(expiresAt, secure));
}

/** `Set-Cookie` header value that makes the browser drop the session cookie. */
export function serializeClearedSessionCookie(secure: boolean): string {
  return serialize(sessionCookieName(secure), "", sessionCookieAttributes(new Date(0), secure));
}

/** Token from a `Cookie` request header, or `null`. */
export function readSessionToken(cookieHeader: string | null, secure: boolean): string | null {
  const name = sessionCookieName(secure);
  for (const part of (cookieHeader ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator !== -1 && part.slice(0, separator).trim() === name) {
      const value = part.slice(separator + 1).trim();
      return value === "" ? null : value;
    }
  }
  return null;
}

function serialize(name: string, value: string, attributes: SessionCookieAttributes): string {
  return [
    `${name}=${value}`,
    `Expires=${attributes.expires.toUTCString()}`,
    `Path=${attributes.path}`,
    "HttpOnly",
    ...(attributes.secure ? ["Secure"] : []),
    "SameSite=Lax",
  ].join("; ");
}
