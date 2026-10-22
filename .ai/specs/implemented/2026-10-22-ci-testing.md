# 2026-10-22 — CI dla pull requestów, testy jednostkowe ze 100% pokryciem, integracja (testcontainers) i agent-browser

## Cel

Każdy pull request do `main` przechodzi automatyczne kontrole: build, lint (z typecheckiem i formatem), testy jednostkowe z progiem 100% pokrycia oraz testy integracyjne na PostgreSQL uruchamianym przez testcontainers, łącznie z tymczasową instancją aplikacji testowaną przez `agent-browser`. Zasada 100% pokrycia nowych funkcji jest zapisana w `AGENTS.md`, a istniejący kod jest pokryty w 100%.

## Kontekst

- Jest Vitest (projekty `unit`, `integration`), integracja wymaga dziś `TEST_DATABASE_URL`, CI używa usługi `postgres:17`.
- Standard (rozdz. 10) przewidywał Playwright dla scenariuszy przeglądarkowych — użytkownik wybrał `agent-browser` (CLI do automatyzacji przeglądarki dla agentów AI). Standard i `AGENTS.md` zostaną zaktualizowane.
- Sandbox nie ma Dockera ani bibliotek Chromium: testcontainers i agent-browser weryfikujemy w GitHub Actions na PR; lokalnie integracja działa przez `TEST_DATABASE_URL` (opt-in, strzeżone).

## Zakres

### Narzędzia (root, devDependencies, wersje przypięte)
`@vitest/coverage-v8`, `testcontainers` + `@testcontainers/postgresql`, `agent-browser` (dokładna wersja).

### Vitest — trzy projekty
| Projekt | Pliki | Środowisko |
| --- | --- | --- |
| `unit` | `packages/*/{src,testing}/**/*.test.{ts,tsx}` (bez `*.integration.test.ts`) | node, bez bazy i sieci |
| `integration` | `packages/*/src/**/*.integration.test.ts` | globalSetup: PostgreSQL (testcontainers `postgres:17` albo `TEST_DATABASE_URL`) + migracje MikroORM; URL przez `provide`/`inject` |
| `e2e` | `packages/app/e2e/**/*.spec.ts` | globalSetup: baza jak wyżej + `next start` (zbudowana aplikacja) na wolnym porcie; testy sterują przeglądarką przez `agent-browser` |

Skrypty: `test:unit` (z pokryciem, próg 100%), `test:integration`, `test:e2e` (wymaga `npm run build`), `app:ephemeral` (baza + aplikacja do ręcznych/agentowych testów przez `agent-browser`, do Ctrl+C).

### Pokrycie
- Provider v8, zakres: `packages/*/src/**/*.{ts,tsx}`; wykluczone tylko: pliki testów, `*.d.ts`, wygenerowane migracje (`packages/db/src/migrations/**`). Progi 100% (linie, gałęzie, funkcje, instrukcje).
- Infrastruktura testów leży **poza `src`** (`packages/db/testing`, `packages/app/testing`, `packages/app/e2e`) — nie jest kodem produkcyjnym; jej działanie dowodzi przebieg integracji/E2E (czyste funkcje, np. strażnik bazy, mają testy jednostkowe).
- Testy jednostkowe dla całego istniejącego kodu `src` (core, db, app — w tym strony, layouty, route handler, instrumentation, konfiguracja CLI — oraz prymitywy ui). Komponenty renderowane `react-dom/server` w środowisku node.
- Drobne refaktory pod testowalność: `createMigrationOrmConfig(env)` (wspólne dla CLI i harnessu testów), `loadRootEnv(dir = repositoryRoot)`.

### Harness integracji
- `@validuo/db/testing`: `requireTestDatabaseUrl` (bez zmian), `startTestDatabase()` (testcontainers lub `TEST_DATABASE_URL`, migracje `orm.migrator.up()`), `testDatabaseUrl()` (`inject`), globalSetup projektu `integration`.
- `packages/app/testing`: `startAppServer({ databaseUrl })` (spawn `next start` w osobnej grupie procesów, czekanie na `/api/health`, `stop()` zabija całą grupę — lekcja o osieroconym `next-server`), klient `agent-browser` (`--json`, osobna `--session`), globalSetup `e2e`, skrypt `ephemeral-app.ts`.
- E2E smoke: strona główna, `/backend` z „Połączono”, `/api/health` (`ApiResult`).

### CI (`.github/workflows/ci.yml`), na `pull_request` i `push` do `main`
Joby: **Lint** (`lint`, `format:check`, `typecheck`), **Unit tests** (`test:unit` z progiem 100%), **Build** (`build`), **Integration tests** (`build`, `agent-browser install --with-deps`, `test:integration`, `test:e2e`; Docker z runnera dla testcontainers).

### Dokumentacja
`AGENTS.md`: jednoznaczna zasada 100% pokrycia testami jednostkowymi każdej nowej funkcji (i każdej zmiany kodu w `src`), bez nowych wykluczeń i `v8 ignore` bez zgody człowieka; opis testów, testcontainers, `app:ephemeral` + `agent-browser`. Standard: rozdz. 1 i 10 (agent-browser zamiast Playwright, testcontainers, 100%). `README.md`, `.ai/lessons.md`, log przebiegu.

### Git
Po zielonej weryfikacji: push `d68e6db`, `b7c7d73` na `origin/main`; gałąź `feat/engineering-standards` (commit standardu + commit CI/testów), PR do `main` z opisem wg checklisty rozdz. 10; obserwacja przebiegu CI na PR i poprawki do zielonego wyniku.

## Kryteria akceptacji
1. `npm run test:unit` raportuje 100% (statements/branches/functions/lines) dla `packages/*/src` i kończy się błędem przy spadku.
2. `lint`, `format:check`, `typecheck`, `build` — OK lokalnie.
3. `test:integration` i `test:e2e` przechodzą w GitHub Actions (testcontainers + agent-browser); lokalnie `test:integration` przechodzi z `TEST_DATABASE_URL`.
4. Workflow uruchamia się dla PR i pokazuje cztery osobne checki.
5. `AGENTS.md` zawiera zasadę 100% pokrycia.

## Realizacja

- Zgodnie z przeglądem planu: zależności w pakietach-właścicielach z dokładnymi wersjami (`testcontainers`, `@testcontainers/postgresql` → `@validuo/db`; `agent-browser`, `tsx` → `@validuo/app`; `@vitest/coverage-v8` → root), osobne wejście `@validuo/db/testing/vitest` (bez Vitest w skryptach `tsx`), `teardownTimeout` 30 s, `next start` w osobnej grupie procesów z drenowaniem stdout/stderr i sprzątaniem przy `exit`, w CI `sysctl kernel.apparmor_restrict_unprivileged_userns=0` zamiast `--no-sandbox`.
- Zmiana stosu testów (testcontainers, agent-browser zamiast Playwright) — na wyraźne polecenie użytkownika z 2026-10-22; standard i `AGENTS.md` zaktualizowane.
- Wynik: PR #1, przebieg CI `39863346185` — Lint, Unit tests (73 testy, 100% we wszystkich metrykach), Build, Integration tests (5 testów integracyjnych na PostgreSQL z testcontainers, 3 scenariusze agent-browser) — wszystkie zielone. Log: `.ai/runs/2026-10-22-ci-testing.md`.
