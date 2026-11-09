import { MikroORM, type EntityManager } from "@mikro-orm/postgresql";
import type { DatabaseConfig } from "@validuo/core/config";
import { asClass, asFunction, type Registrations } from "@validuo/core/di";
import type {
  AccountRepository,
  LoginAttemptRepository,
  PermissionRepository,
  PersonRepository,
  SessionRepository,
  UserRepository,
} from "@validuo/core/ports/accounts";
import type { UnitOfWork } from "@validuo/core/ports/transactions";

import { createOrmConfig } from "./config";
import { MikroOrmAccountRepository } from "./repositories/accounts/mikro-orm-account.repository";
import { MikroOrmLoginAttemptRepository } from "./repositories/accounts/mikro-orm-login-attempt.repository";
import { MikroOrmPermissionRepository } from "./repositories/accounts/mikro-orm-permission.repository";
import { MikroOrmPersonRepository } from "./repositories/accounts/mikro-orm-person.repository";
import { MikroOrmSessionRepository } from "./repositories/accounts/mikro-orm-session.repository";
import { MikroOrmUserRepository } from "./repositories/accounts/mikro-orm-user.repository";
import { MikroOrmUnitOfWork } from "./transactions/mikro-orm-unit-of-work";

export type DbCradle = {
  /** Process-wide ORM with the connection pool; connects lazily on the first query. */
  orm: MikroORM;
  /** `EntityManager` forked per scope (request/job) — use it instead of the global `orm.em`. */
  em: EntityManager;
  /** Repositories and the transaction share the scope's `em`, so they must be scoped too. */
  accountRepository: AccountRepository;
  userRepository: UserRepository;
  personRepository: PersonRepository;
  permissionRepository: PermissionRepository;
  sessionRepository: SessionRepository;
  loginAttemptRepository: LoginAttemptRepository;
  unitOfWork: UnitOfWork;
};

export function dbRegistrations(database: DatabaseConfig): Registrations<DbCradle> {
  return {
    orm: asFunction(() => new MikroORM(createOrmConfig(database)))
      .singleton()
      .disposer((orm) => orm.close()),
    em: asFunction(({ orm }: Pick<DbCradle, "orm">) => orm.em.fork()).scoped(),
    accountRepository: asClass(MikroOrmAccountRepository).scoped(),
    userRepository: asClass(MikroOrmUserRepository).scoped(),
    personRepository: asClass(MikroOrmPersonRepository).scoped(),
    permissionRepository: asClass(MikroOrmPermissionRepository).scoped(),
    sessionRepository: asClass(MikroOrmSessionRepository).scoped(),
    loginAttemptRepository: asClass(MikroOrmLoginAttemptRepository).scoped(),
    unitOfWork: asClass(MikroOrmUnitOfWork).scoped(),
  };
}
