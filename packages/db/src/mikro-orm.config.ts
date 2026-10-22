import { parseServerEnv } from "@validuo/core/config";
import { loadRootEnv } from "@validuo/core/config/load-env";

import { createMigrationOrmConfig } from "./migration-config";

// Same `.env*` files and the same validation as the Next.js app.
loadRootEnv();

/** Config for the MikroORM CLI (`npm run db -- <command>`, `npm run db:migrate`, …). */
export default createMigrationOrmConfig(parseServerEnv(process.env));
