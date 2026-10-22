# @validuo/db — dane i MikroORM

Obowiązują zasady z głównego `AGENTS.md` (zwłaszcza sekcja „Baza danych”). Ten plik dodaje szczegóły pakietu.

## Struktura

- `src/config.ts` — `createOrmConfig(env)`: konfiguracja runtime (PostgreSQL, encje, pula, debug).
- `src/mikro-orm.config.ts` — konfiguracja CLI: runtime + `Migrator` + ścieżki migracji; ładuje `.env*` z katalogu głównego repo. Wskazana w `package.json` (`mikro-orm.configPaths`).
- `src/entities/` — encje (`<nazwa>.entity.ts`) i jawna lista `entities` w `index.ts`.
- `src/migrations/` — migracje i `.snapshot.json` (commitowane).
- `src/di.ts` — `dbModule`: `orm` (singleton, zamykany przy `dispose`) i `em` (scoped fork); rozszerza `Cradle`.
- `src/health.ts` — `checkDatabase(orm)`.

## Zasady

- Encje: `defineEntity` + `p` (bez dekoratorów). Klucze główne domyślnie `p.uuid().primary().onCreate(() => crypto.randomUUID())`, znaczniki czasu `p.datetime()`. Nazwy tabel/kolumn generuje naming strategy (snake_case) — nie nadpisuj bez powodu.
- Po zmianie encji: `npm run db:migration:create`, przejrzyj SQL, `npm run db:migrate` na **lokalnej/tymczasowej** bazie, commituj migrację i snapshot.
- Nie używaj `schema:update --run`, `schema:fresh`, `schema:drop`, `migration:fresh` na współdzielonych bazach (MikroORM 7 domyślnie usuwa nieznane tabele).
- Repozytoria i serwisy danych rejestruj jako `scoped` i wstrzykuj im `em`.
- Nie importuj z `next` ani `@validuo/app` (wymusza ESLint). Wyjątek: `@next/env` w konfiguracji CLI (te same reguły ładowania `.env*` co w aplikacji).
- Nowe pakiety `@mikro-orm/*` dopisz do `serverExternalPackages` w `packages/app/next.config.ts`.
