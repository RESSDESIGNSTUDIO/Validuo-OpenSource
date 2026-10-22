import { loadRootEnv } from "@validuo/core/config/load-env";
import type { NextConfig } from "next";

// `.env*` files live in the monorepo root and are shared with the database tooling.
loadRootEnv();

const nextConfig: NextConfig = {
  // MikroORM v7 packages missing from Next.js' default list — loaded by Node, not bundled.
  serverExternalPackages: ["@mikro-orm/postgresql", "@mikro-orm/sql", "@mikro-orm/migrations", "kysely"],
};

export default nextConfig;
