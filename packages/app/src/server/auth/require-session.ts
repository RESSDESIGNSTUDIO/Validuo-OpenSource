import "server-only";

import { UnauthorizedError } from "@validuo/core/errors";
import type { Actor } from "@validuo/core/policies/access";
import { cookies } from "next/headers";

import type { RequestScope } from "../container";
import { sessionCookieName } from "./session-cookie";

/**
 * Verifies the session and returns the actor with permissions read from storage. Every protected
 * Route Handler, Server Action and page calls this itself — a layout, redirect or hidden button
 * is not authorisation. Pair it with `assertCan` from `@validuo/core/policies/access`.
 */
export async function requireSession(scope: RequestScope, token: string | null): Promise<Actor> {
  if (token === null) {
    throw new UnauthorizedError("Zaloguj się, aby kontynuować.");
  }
  const actor = await scope.resolve("authService").authenticate(token);
  if (actor === null) {
    throw new UnauthorizedError("Sesja wygasła. Zaloguj się ponownie.");
  }
  return actor;
}

/** Session token of the current request for Server Components and Server Actions. */
export async function sessionTokenFromCookies(scope: RequestScope): Promise<string | null> {
  const store = await cookies();
  return store.get(sessionCookieName(scope.resolve("secureCookies")))?.value ?? null;
}
