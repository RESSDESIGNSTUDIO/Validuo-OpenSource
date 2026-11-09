import { TooManyRequestsError } from "../../errors/app-error";
import { accountOwnerPermissions } from "../../permissions/catalog";
import type {
  AccountRepository,
  LoginAttemptRepository,
  PermissionRepository,
  PersonRepository,
  SessionRepository,
  UserRepository,
} from "../../ports/accounts";
import type { Clock, PasswordHasher, TokenGenerator } from "../../ports/security";
import type { UnitOfWork } from "../../ports/transactions/unit-of-work.port";
import { AUTH_LIMITS, windowStart } from "./auth-limits";
import { issueSession, type IssuedSession } from "./session";

export type RegisterCommand = {
  /** Normalised and validated by `registerSchema`. */
  email: string;
  password: string;
  accountName: string;
  displayName: string;
  /** Client IP, known only behind a trusted proxy. */
  ip: string | null;
};

type AccountServiceDeps = {
  accountRepository: AccountRepository;
  userRepository: UserRepository;
  personRepository: PersonRepository;
  permissionRepository: PermissionRepository;
  sessionRepository: SessionRepository;
  loginAttemptRepository: LoginAttemptRepository;
  passwordHasher: PasswordHasher;
  tokenGenerator: TokenGenerator;
  clock: Clock;
  unitOfWork: UnitOfWork;
};

export class AccountService {
  constructor(private readonly deps: AccountServiceDeps) {}

  /**
   * Creates the account and its first person with full permissions, and signs them in. One
   * transaction: a taken e-mail (`ConflictError` from the user repository) leaves nothing behind.
   */
  async register({ email, password, accountName, displayName, ip }: RegisterCommand): Promise<IssuedSession> {
    const { loginAttemptRepository, passwordHasher, tokenGenerator, clock, unitOfWork } = this.deps;
    const now = clock.now();

    if (ip !== null) {
      const ipKey = tokenGenerator.hash(ip);
      const window = windowStart(now, AUTH_LIMITS.registerIp.windowMs);
      if ((await loginAttemptRepository.count("register_ip", ipKey, window)) >= AUTH_LIMITS.registerIp.max) {
        throw new TooManyRequestsError("Zbyt wiele rejestracji z tego adresu. Spróbuj ponownie później.");
      }
      await loginAttemptRepository.hit("register_ip", ipKey, window);
    }

    // Hashing is slow; do it before the transaction so no connection is held meanwhile.
    const passwordHash = await passwordHasher.hash(password);

    return unitOfWork.run(async () => {
      const account = await this.deps.accountRepository.create({ name: accountName });
      const user = await this.deps.userRepository.create({ email, passwordHash });
      const person = await this.deps.personRepository.create({ accountId: account.id, userId: user.id, displayName });
      await this.deps.permissionRepository.grant({
        accountId: account.id,
        personId: person.id,
        actions: accountOwnerPermissions(),
      });
      return issueSession(this.deps, person.id, account.id, now);
    });
  }
}
