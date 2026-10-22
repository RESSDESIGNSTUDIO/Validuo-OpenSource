# 2026-10-22 — Rezygnacja z Supabase

## Cel
Korekta użytkownika po wdrożeniu standardu: „nie chcemy Supabase, korzystamy z MikroORM + PostgreSQL, tak jak miało być na początku”. Specyfikacja: `.ai/specs/implemented/2026-10-22-remove-supabase.md`.

## Kroki i decyzje
- Usunięto `supabase` (devDependency, lockfile), `supabase/` (`config.toml`, `migrations/`), `packages/db/scripts/supabase-db.ts` i skrypty `db:migration:new`/`db:migrate` oparte na Supabase CLI.
- Przywrócono Migrator MikroORM: `@mikro-orm/migrations`, `packages/db/src/migrations/`, skrypty `db:migration:create`/`db:migrate`/`db:migration:down`/`db:migration:list`, `serverExternalPackages`, wykluczenia ESLint/Prettier dla migracji.
- Konto migracyjne z rozdz. 6 standardu zachowano jako opcjonalne `MIGRATION_DATABASE_URL` (`ServerEnv.migrationDatabaseUrl`, domyślnie `DATABASE_URL`) — używane tylko przez CLI MikroORM; runtime `DatabaseConfig` bez zmian.
- CI: `npm run db:migrate` z `DATABASE_URL` bazy testowej tylko w tym kroku, potem `test:integration`.
- Standard `engineering-standards.md`: migracje MikroORM; uwierzytelnianie i magazyn plików do wyboru w osobnych specyfikacjach (za portami, bez własnej kryptografii); RLS bez JWT Supabase (`SET LOCAL` w transakcji); usunięte `service_role`, publishable key, Data API, `supabase/` i odnośniki.
- Dokumentacja: `AGENTS.md` (root: stos z regułą „bez Supabase”, migracje, polecenia; nowa reguła pracy o konflikcie specyfikacji z `AGENTS.md`), `packages/{db,app,core}/AGENTS.md`, `README.md`, `.env.example`, `.ai/lessons.md` (usunięty wpis o Supabase CLI, dodany wniosek z korekty).

## Weryfikacja (tymczasowy PostgreSQL 17 na porcie 54329)
- `lint`, `format:check`, `typecheck`, `test:unit` (22), `build` — OK; `test:integration` (4) po `db:migrate` jak w CI — OK.
- Encja próbna: `db:migration:create` → `db:migrate` (tabela `probes` utworzona) → `db:migration:list` → `db:migration:down` (tabela usunięta) — OK; encja i migracja próbna usunięte.
- CLI łączy się `MIGRATION_DATABASE_URL`, gdy ustawione (runtime `DATABASE_URL` wskazywał nieistniejący port), a bez niego — `DATABASE_URL`.
- `grep -i supabase`: brak w kodzie, zależnościach, lockfile i CI; pozostaje tylko reguła „bez Supabase” w `AGENTS.md` i noty historyczne w `.ai/`.

## Problemy
- Prettier wcześniej przeformatował `env.ts`, więc pierwsza podmiana tekstu nie trafiła i CLI dostał `clientUrl: undefined` („No database specified”). Wykryte testem CLI, naprawione; pole przeniesione do `ServerEnv`, żeby nie zaśmiecać konfiguracji runtime.
