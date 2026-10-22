import { defineConfig, type Options } from "@mikro-orm/postgresql";
import { boolEnv, intEnv, requireEnv, type Env } from "@validuo/core";

import { entities } from "./entities";

/**
 * Konfiguracja MikroORM używana w runtime aplikacji (bez Migratora).
 *
 * Zmienne środowiskowe:
 * - `DATABASE_URL` — wymagany adres PostgreSQL,
 * - `DB_POOL_MIN` / `DB_POOL_MAX` — rozmiar puli połączeń (domyślnie 0 / 10),
 * - `DB_DEBUG` — logowanie zapytań SQL.
 */
export function createOrmConfig(env: Env = process.env): Options {
  return defineConfig({
    clientUrl: requireEnv("DATABASE_URL", env),
    entities,
    pool: {
      min: intEnv("DB_POOL_MIN", 0, env),
      max: intEnv("DB_POOL_MAX", 10, env),
    },
    debug: boolEnv("DB_DEBUG", false, env),
    discovery: {
      // Domena nie ma jeszcze encji; bez tego MikroORM rzuca błąd przy starcie.
      warnWhenNoEntities: false,
    },
  });
}
