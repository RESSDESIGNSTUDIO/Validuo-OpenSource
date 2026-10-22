import path from "node:path";

import { Migrator } from "@mikro-orm/migrations";
import { defineConfig } from "@mikro-orm/postgresql";
// Import domyślny: CLI ładuje ten plik jako ESM, a @next/env to moduł CommonJS bez nazwanych eksportów.
import nextEnv from "@next/env";

import { createOrmConfig } from "./config";

// Pliki .env* leżą w katalogu głównym monorepo — te same, które ładuje Next.js.
nextEnv.loadEnvConfig(path.resolve(import.meta.dirname, "../../.."), process.env.NODE_ENV !== "production");

/** Konfiguracja dla CLI MikroORM (`npm run db -- <komenda>`): runtime + migracje. */
export default defineConfig({
  ...createOrmConfig(),
  extensions: [Migrator],
  migrations: {
    // Ścieżki absolutne — niezależne od katalogu, z którego uruchomiono CLI.
    path: path.join(import.meta.dirname, "migrations"),
    pathTs: path.join(import.meta.dirname, "migrations"),
    glob: "!(*.d).ts",
    snapshot: true,
    // Stała nazwa zamiast domyślnej `.snapshot-<dbName>.json` — niezależna od środowiska.
    snapshotName: ".snapshot",
  },
});
