# 2026-10-22 — Rezygnacja z Supabase, migracje wyłącznie przez MikroORM

## Cel
Usunąć Supabase z projektu (CLI, katalog `supabase/`, odwołania w standardzie i dokumentacji) i wrócić do pierwotnego założenia: PostgreSQL + MikroORM jako jedyny ORM i jedyny migrator schematu.

## Kontekst
Przy wdrażaniu `engineering-standards.md` migracje przeniesiono do Supabase CLI, bo tak mówił ówczesny tekst standardu. Użytkownik zdecydował: projekt nie używa Supabase — ani Auth, ani Storage, ani CLI.

## Zakres
- Kod i narzędzia: usunięcie `supabase` (devDependency), `supabase/`, `packages/db/scripts/supabase-db.ts`; przywrócenie `@mikro-orm/migrations`, Migratora w `packages/db/src/mikro-orm.config.ts`, `packages/db/src/migrations/` (+ `.snapshot.json` przy pierwszej migracji), skryptów `db:migration:create`/`db:migrate`/`db:migration:down`/`db:migration:list`, wpisu w `serverExternalPackages`, wykluczeń ESLint/Prettier dla migracji.
- Konto migracyjne (rozdz. 6 standardu) zostaje: opcjonalne `MIGRATION_DATABASE_URL` w `parseServerEnv` (`migrationDatabaseUrl`, domyślnie `DATABASE_URL`), używane przez CLI MikroORM.
- CI: krok `npm run db:migrate` na bazie testowej (z `DATABASE_URL` ustawionym tylko dla tego kroku), potem testy integracyjne.
- Standard `engineering-standards.md`: migracje MikroORM w `packages/db/src/migrations`; uwierzytelnianie i magazyn plików jako mechanizmy do wyboru w osobnych specyfikacjach (za portami); RLS bez JWT Supabase (kontekst przez `SET LOCAL` w transakcji); usunięte `service_role`, publishable key, Data API, odnośniki Supabase.
- Dokumentacja: `AGENTS.md` (root, `db`, `app`), `README.md`, `.env.example`, `.ai/lessons.md`, specyfikacja wdrożenia standardu.

## Kryteria akceptacji
1. Brak Supabase w kodzie, zależnościach, lockfile, CI i dokumentacji (poza jawną regułą „bez Supabase” i notą historyczną).
2. `lint`, `format:check`, `typecheck`, `test:unit`, `build`, `test:integration` przechodzą.
3. `db:migration:create` → `db:migrate` → `db:migration:list` → `db:migration:down` działają na tymczasowej bazie kontem `MIGRATION_DATABASE_URL`.
