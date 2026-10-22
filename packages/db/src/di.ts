import { MikroORM, type EntityManager } from "@mikro-orm/postgresql";
import type { DatabaseConfig } from "@validuo/core/config";
import { asFunction, type Registrations } from "@validuo/core/di";

import { createOrmConfig } from "./config";

export type DbCradle = {
  /** Process-wide ORM with the connection pool; connects lazily on the first query. */
  orm: MikroORM;
  /** `EntityManager` forked per scope (request/job) — use it instead of the global `orm.em`. */
  em: EntityManager;
};

export function dbRegistrations(database: DatabaseConfig): Registrations<DbCradle> {
  return {
    orm: asFunction(() => new MikroORM(createOrmConfig(database)))
      .singleton()
      .disposer((orm) => orm.close()),
    em: asFunction(({ orm }: Pick<DbCradle, "orm">) => orm.em.fork()).scoped(),
  };
}
