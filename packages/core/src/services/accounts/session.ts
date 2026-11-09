import type { SessionRepository } from "../../ports/accounts";
import type { TokenGenerator } from "../../ports/security";
import { AUTH_LIMITS } from "./auth-limits";

/** Session handed to the transport layer, which puts `token` in a cookie. */
export type IssuedSession = { token: string; expiresAt: Date };

type SessionDeps = { sessionRepository: SessionRepository; tokenGenerator: TokenGenerator };

/** New token on every sign-in; only its digest is stored. */
export async function issueSession(
  { sessionRepository, tokenGenerator }: SessionDeps,
  personId: string,
  accountId: string,
  now: Date,
): Promise<IssuedSession> {
  const token = tokenGenerator.generate();
  const expiresAt = new Date(now.getTime() + AUTH_LIMITS.sessionAbsoluteMs);
  await sessionRepository.create({ personId, accountId, tokenHash: tokenGenerator.hash(token), expiresAt, now });
  return { token, expiresAt };
}
