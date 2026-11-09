"use server";

import { AppError, ValidationError } from "@validuo/core/errors";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { registerAccount, signInUser, signOutUser } from "@/server/auth/auth-use-cases";
import { sessionCookieAttributes, sessionCookieName } from "@/server/auth/session-cookie";
import { withRequestScope, type RequestScope } from "@/server/container";
import { clientIp } from "@/server/http/client-ip";
import type { Logger } from "@/server/logging/logger";

import type { AuthFormState } from "../auth-form-state";

type Field = "email" | "password" | "accountName" | "displayName";

// Only text fields are read; anything else (files, missing) reaches the schema as `null` → "Podaj …".
function readFields(formData: FormData, names: readonly Field[]): Record<string, FormDataEntryValue | null> {
  return Object.fromEntries(names.map((name) => [name, formData.get(name)]));
}

// Expected failures become form state; anything unexpected propagates to the error boundary / log.
function toFormState(error: unknown): AuthFormState {
  if (error instanceof ValidationError) {
    return { message: error.message, fieldErrors: copy(error.fieldErrors) };
  }
  if (error instanceof AppError) {
    return { message: error.message, fieldErrors: {} };
  }
  throw error;
}

function copy(fieldErrors: ValidationError["fieldErrors"]): Record<string, string[]> {
  return Object.fromEntries(Object.entries(fieldErrors).map(([field, messages]) => [field, [...messages]]));
}

async function inScope<T>(
  operation: string,
  work: (scope: RequestScope, logger: Logger, ip: string | null) => Promise<T>,
): Promise<T> {
  return withRequestScope(async (scope) => {
    const ip = clientIp(await headers(), scope.resolve("env").auth.trustedProxy);
    return work(scope, scope.resolve("logger").child({ operation }), ip);
  });
}

export async function registerAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  return inScope("auth.register", async (scope, logger, ip) => {
    try {
      const session = await registerAccount(
        scope,
        readFields(formData, ["email", "password", "accountName", "displayName"]),
        ip,
        logger,
      );
      const secure = scope.resolve("secureCookies");
      (await cookies()).set(
        sessionCookieName(secure),
        session.token,
        sessionCookieAttributes(session.expiresAt, secure),
      );
    } catch (error) {
      return toFormState(error);
    }
    redirect("/backend");
  });
}

export async function signInAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  return inScope("auth.signIn", async (scope, logger, ip) => {
    try {
      const session = await signInUser(scope, readFields(formData, ["email", "password"]), ip, logger);
      const secure = scope.resolve("secureCookies");
      (await cookies()).set(
        sessionCookieName(secure),
        session.token,
        sessionCookieAttributes(session.expiresAt, secure),
      );
    } catch (error) {
      return toFormState(error);
    }
    redirect("/backend");
  });
}

export async function signOutAction(): Promise<void> {
  return inScope("auth.signOut", async (scope, logger) => {
    const secure = scope.resolve("secureCookies");
    const store = await cookies();
    await signOutUser(scope, store.get(sessionCookieName(secure))?.value ?? null, logger);
    store.delete(sessionCookieName(secure));
    redirect("/sign-in");
  });
}
