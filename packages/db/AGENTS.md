# @validuo/db — persystencja (MikroORM)

Obowiązują zasady z głównego `AGENTS.md` (zwłaszcza „Baza danych”) i rozdz. 5 `.ai/specs/engineering-standards.md`. Ten plik dodaje szczegóły pakietu.

## Struktura

- `src/config.ts` — `createOrmConfig(database: DatabaseConfig)`: opcje runtime z zwalidowanej konfiguracji (`parseServerEnv`).
- `src/di.ts` — typ `DbCradle` (`orm` singleton z disposerem `orm.close()`, `em` scoped fork) i `dbRegistrations(database)`; składane w `packages/app/src/server/container.ts`.
- `src/entities/` — encje `<domena>/<nazwa>.entity.ts` i jawna lista `entities` w `index.ts`.
- `src/health.ts` — `checkDatabase(orm)`.
- `testing/` (poza `src`, infrastruktura testów) — `@validuo/db/testing`: `startTestDatabase()` (PostgreSQL 17 z testcontainers albo `TEST_DATABASE_URL`, migracje MikroORM), `requireTestDatabaseUrl()`; `@validuo/db/testing/vitest`: `testDatabaseUrl()`; `postgres.global-setup.ts` projektu `integration`.
- `src/mikro-orm.config.ts` — konfiguracja CLI MikroORM (`npm run db -- <komenda>`, `db:migration:*`): `loadRootEnv()` + `parseServerEnv`, Migrator, połączenie kontem `MIGRATION_DATABASE_URL` (domyślnie `DATABASE_URL`). Wskazana w `package.json` (`mikro-orm.configPaths`).
- `src/migrations/` — migracje i `.snapshot.json` (commitowane; wyłączone z ESLint i Prettiera).
- Docelowo (z pierwszą funkcją): `src/repositories/<domena>/mikro-orm-<nazwa>.repository.ts` (adaptery portów z `core`), `src/transactions/mikro-orm-unit-of-work.ts`.

## Zasady

- **Migracje MikroORM to jedyny sposób zmiany schematu.** Po zmianie encji: `npm run db:migration:create`, przejrzyj SQL (dopisz ręcznie to, czego ORM nie generuje: złożone FK/constraints tenantów, indeksy, granty, polityki RLS, triggery), `npm run db:migrate` na **lokalnej/tymczasowej** bazie, commituj migrację i snapshot. Nie uruchamiaj `schema:update --run`/`schema:fresh`/`schema:drop`/`migration:fresh` na współdzielonych bazach (MikroORM 7 domyślnie usuwa nieznane tabele).
- Encje: `defineEntity` + `p` (bez dekoratorów), nazwa `<Name>Schema`, typ `InferEntity<typeof XSchema>`. Kolumny snake_case generuje naming strategy (`accountId` → `account_id`), ale nazwę tabeli podawaj jawnie w liczbie mnogiej (`tableName: "employee_groups"`) — domyślnie byłaby w pojedynczej. Nazwy istniejących tabel i enumów są kontraktem.
- Repozytoria implementują porty z `core`, są `scoped`, dostają `em` z bieżącego scope, zwracają modele/DTO (nie encje), pobierają relacje jawnie (bez N+1), zawsze filtrują po zweryfikowanym zakresie dostępu (nigdy samo `id`). SQL parametryzowany; sortowanie i identyfikatory z allowlist.
- Operacja atomowa: jedna transakcja na jednym `EntityManager` obejmuje zmianę, kontrolę konfliktu/limitu (z blokadą lub inną sprawdzoną ochroną współbieżności) i wpis audytu/outboxa. SMTP/Storage poza transakcją (outbox).
- Nie importuj z `@validuo/app`, `@validuo/ui`, `next`, React ani bezpośrednio `awilix` (wymusza ESLint).
- Nowe pakiety `@mikro-orm/*` dopisz do `serverExternalPackages` w `packages/app/next.config.ts`.
- Kod w `src` ma 100% pokrycia testami jednostkowymi (bez bazy: fałszywe `orm`/`em` lub leniwy ORM bez połączenia). Testy integracyjne (`*.integration.test.ts`) wyłącznie na bazie z `testDatabaseUrl()`; uprawnienia i RLS testujemy na roli runtime, nie na właścicielu tabel.
