import { describe, expect, it } from "vitest";

import { assertSameOrigin } from "./origin-check";
import { HttpError } from "./http-error";

const request = (method: string, origin?: string) =>
  new Request("http://localhost:3000/api/auth/sign-in", { method, ...(origin && { headers: { origin } }) });

describe("assertSameOrigin", () => {
  it("lets safe methods through without an Origin", () => {
    expect(() => assertSameOrigin(request("GET"), undefined)).not.toThrow();
  });

  it("accepts a mutation from the request's own origin when APP_ORIGIN is unset", () => {
    expect(() => assertSameOrigin(request("POST", "http://localhost:3000"), undefined)).not.toThrow();
  });

  it("rebuilds the origin from the Host header, which Next.js does not normalise", () => {
    const viaHost = (origin: string) =>
      new Request("http://localhost:3000/api/x", { method: "POST", headers: { host: "127.0.0.1:3000", origin } });

    expect(() => assertSameOrigin(viaHost("http://127.0.0.1:3000"), undefined)).not.toThrow();
    expect(() => assertSameOrigin(viaHost("http://localhost:3000"), undefined)).toThrow(HttpError);
  });

  it("compares with APP_ORIGIN when it is set", () => {
    expect(() =>
      assertSameOrigin(request("DELETE", "https://app.example.com"), "https://app.example.com"),
    ).not.toThrow();
    expect(() => assertSameOrigin(request("POST", "http://localhost:3000"), "https://app.example.com")).toThrow(
      HttpError,
    );
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("rejects a %s without Origin (fail closed)", (method) => {
    expect(() => assertSameOrigin(request(method), undefined)).toThrow(HttpError);
  });

  it("rejects a foreign Origin with 403", () => {
    try {
      assertSameOrigin(request("POST", "https://evil.example"), undefined);
      expect.unreachable();
    } catch (error) {
      expect((error as HttpError).status).toBe(403);
    }
  });
});
