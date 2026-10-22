import { resolve } from "node:path";

// Import nazwany: Next kompiluje ten plik do CommonJS (domyślny import @next/env byłby undefined).
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Pliki .env* trzymamy w katalogu głównym monorepo (wspólne dla app i CLI MikroORM).
loadEnvConfig(resolve(import.meta.dirname, "../.."), process.env.NODE_ENV !== "production");

const nextConfig: NextConfig = {
  // Pakiety MikroORM v7 spoza domyślnej listy Next.js — ładowane przez Node, nie bundlowane.
  serverExternalPackages: ["@mikro-orm/postgresql", "@mikro-orm/sql", "@mikro-orm/migrations", "kysely"],
};

export default nextConfig;
