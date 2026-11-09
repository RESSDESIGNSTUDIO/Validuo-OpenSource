import "server-only";

import { HttpError } from "./http-error";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF guard for cookie-authenticated mutations (also sign-in and registration, against login
 * CSRF). Fails closed: a mutating request must carry an `Origin` equal to the application's own.
 * `appOrigin` is `APP_ORIGIN`; without it the origin of the request URL is used, which behind a
 * TLS-terminating proxy is not the public one — set `APP_ORIGIN` there.
 */
export function assertSameOrigin(request: Request, appOrigin: string | undefined): void {
  if (!MUTATING_METHODS.has(request.method)) {
    return;
  }
  const expected = appOrigin ?? new URL(request.url).origin;
  if (request.headers.get("origin") !== expected) {
    throw new HttpError(403, "CrossOrigin", "Żądanie pochodzi z niedozwolonego źródła.");
  }
}
