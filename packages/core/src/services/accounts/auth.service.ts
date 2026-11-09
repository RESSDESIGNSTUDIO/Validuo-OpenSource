import { TooManyRequestsError, UnauthorizedError } from "../../errors/app-error";
import type { Actor } from "../../policies/access.policy";
import type {
  LoginAttemptRepository,
  PermissionRepository,
  PersonRepository,
  SessionRepository,
  UserRepository,
} from "../../ports/accounts";
import type { Clock, PasswordHasher, TokenGenerator } from "../../ports/security";
import { AUTH_LIMITS, windowStart } from "./auth-limits";
import { issueSession, type IssuedSession } from "./session";

export type SignInCommand = {
  /** Normalised by the input schema. */
  email: string;
  password: string;
  /** Client IP, known only behind a trusted proxy. */
  ip: string | null;
};

type AuthServiceDeps = {
  userRepository: UserRepository;
  personRepository: PersonRepository;
  permissionRepository: PermissionRepository;
  sessionRepository: SessionRepository;
  loginAttemptRepository: LoginAttemptRepository;
  passwordHasher: PasswordHasher;
  tokenGenerator: TokenGenerator;
  clock: Clock;
};

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  async signIn({ email, password, ip }: SignInCommand): Promise<IssuedSession> {
    const { userRepository, personRepository, loginAttemptRepository, passwordHasher, tokenGenerator, clock } =
      this.deps;
    const now = clock.now();
    // The pair, not the e-mail alone: a stranger failing from another address must not lock the
    // owner out. Without a known IP the pair is the e-mail by itself.
    const pairKey = tokenGenerator.hash(ip === null ? email : `${email}\n${ip}`);
    const ipKey = ip === null ? null : tokenGenerator.hash(ip);
    const pairWindow = windowStart(now, AUTH_LIMITS.loginEmailIp.windowMs);
    const ipWindow = windowStart(now, AUTH_LIMITS.loginIp.windowMs);

    const failedByPair = await loginAttemptRepository.count("email_ip", pairKey, pairWindow);
    const failedByIp = ipKey === null ? 0 : await loginAttemptRepository.count("ip", ipKey, ipWindow);
    if (failedByPair >= AUTH_LIMITS.loginEmailIp.max || failedByIp >= AUTH_LIMITS.loginIp.max) {
      throw new TooManyRequestsError("Zbyt wiele prób logowania. Spróbuj ponownie później.");
    }

    const user = await userRepository.findByEmail(email);
    // Verified even for an unknown e-mail, so timing does not reveal whether the account exists.
    const passwordOk = await passwordHasher.verify(user?.passwordHash ?? null, password);
    const person = user !== null && passwordOk ? await personRepository.findByUserId(user.id) : null;

    if (person === null) {
      await loginAttemptRepository.hit("email_ip", pairKey, pairWindow);
      if (ipKey !== null) {
        await loginAttemptRepository.hit("ip", ipKey, ipWindow);
      }
      throw new UnauthorizedError("Nieprawidłowy adres e-mail lub hasło.");
    }

    await loginAttemptRepository.clear("email_ip", pairKey);
    return issueSession(this.deps, person.id, person.accountId, now);
  }

  async signOut(token: string): Promise<void> {
    const { sessionRepository, tokenGenerator, clock } = this.deps;
    await sessionRepository.revoke(tokenGenerator.hash(token), clock.now());
  }

  /**
   * Resolves a session token to the actor, or `null` when the token is unknown, revoked, expired
   * or idle for too long. Permissions are read from storage on every call, so a change applies
   * from the next request.
   */
  async authenticate(token: string): Promise<Actor | null> {
    const { sessionRepository, permissionRepository, tokenGenerator, clock } = this.deps;
    const now = clock.now();
    const tokenHash = tokenGenerator.hash(token);

    const session = await sessionRepository.findActive(tokenHash, now);
    if (session === null) {
      return null;
    }
    const idleFor = now.getTime() - session.lastSeenAt.getTime();
    if (idleFor > AUTH_LIMITS.sessionIdleMs) {
      await sessionRepository.revoke(tokenHash, now);
      return null;
    }
    if (idleFor >= AUTH_LIMITS.sessionTouchIntervalMs) {
      await sessionRepository.touch(session.id, now);
    }
    const permissions = await permissionRepository.listForPerson(session.accountId, session.personId);
    return { personId: session.personId, accountId: session.accountId, permissions };
  }
}
