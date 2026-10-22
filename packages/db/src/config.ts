import { defineConfig, type Options } from "@mikro-orm/postgresql";
import type { DatabaseConfig } from "@validuo/core/config";

import { entities } from "./entities";

/** Runtime MikroORM options built from the validated configuration (`parseServerEnv`). */
export function createOrmConfig(database: DatabaseConfig): Options {
  return defineConfig({
    clientUrl: database.url,
    entities,
    pool: { min: database.poolMin, max: database.poolMax },
    debug: database.debug,
    discovery: {
      // There are no domain entities yet; without this MikroORM refuses to start.
      warnWhenNoEntities: false,
    },
  });
}
