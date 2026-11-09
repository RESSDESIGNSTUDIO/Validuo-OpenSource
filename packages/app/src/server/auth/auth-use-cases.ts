import "server-only";

import { hasErrorCode } from "@validuo/core/errors";
import type { IssuedSession } from "@validuo/core/services/accounts";
import { parseInput, registerSchema, signInSchema } from "@validuo/core/validators";

import type { RequestScope } from "../container";
import type { Logger } from "../logging/logger";

/**
 * The account use cases as the transport layers (Route Handlers and Server Actions) call them:
 * input validation, the domain call and audit logging live here once. Never log passwords,
 * tokens or e-mail addresses.
 */
export async function registerAccount(
  scope: RequestScope,
  rawInput: unknown,
  ip: string | null,
  logger: Logger,
): Promise<IssuedSession> {
  const input = parseInput(registerSchema, rawInput);
  const session = await scope.resolve("accountService").register({ ...input, ip });
  logger.info("auth.register.created");
  return session;
}

export async function signInUser(
  scope: RequestScope,
  rawInput: unknown,
  ip: string | null,
  logger: Logger,
): Promise<IssuedSession> {
  const input = parseInput(signInSchema, rawInput);
  try {
    return await scope.resolve("authService").signIn({ ...input, ip });
  } catch (error) {
    if (hasErrorCode(error, "TooManyRequests")) {
      logger.warn("auth.sign_in.blocked");
    } else if (hasErrorCode(error, "Unauthorized")) {
      logger.warn("auth.sign_in.failed");
    }
    throw error;
  }
}

export async function signOutUser(scope: RequestScope, token: string | null, logger: Logger): Promise<void> {
  if (token !== null) {
    await scope.resolve("authService").signOut(token);
    logger.info("auth.sign_out");
  }
}
