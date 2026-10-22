# 2026-10-22 — CI dla PR, 100% pokrycia, testcontainers i agent-browser

## Cel
Polecenie użytkownika: CI dla każdego PR (build, lint, testy jednostkowe, integracja z PostgreSQL z testcontainers umożliwiająca test tymczasowej instancji aplikacji przez agent-browser), zasada 100% pokrycia nowych funkcji w `AGENTS.md`, testy jednostkowe pokrywające 100% istniejącego kodu, potem push `main`, gałąź, commit i PR. Specyfikacja: `.ai/specs/implemented/2026-10-22-ci-testing.md`.

## Kroki i decyzje
- Najpierw commit dotychczasowej pracy (standard bez Supabase) na nowej gałęzi `feat/engineering-standards` — drugi commit zawiera wyłącznie CI i testy.
- Rozpoznanie: brak Dockera i Chromium w sandboxie; `agent-browser` 0.39.2 ma binarkę w paczce i tryb `--json`; `gh` zalogowany (`repo`, `workflow`).
- Niezależny przegląd planu (subagent) — przyjęte poprawki opisane w specyfikacji.
- Vitest: projekty `unit` (pokrycie v8, próg 100% dla `packages/*/src`), `integration` (global setup: testcontainers `postgres:17` + migracje MikroORM; `TEST_DATABASE_URL` jako strzeżona alternatywa bez Dockera), `e2e` (baza + `next start` + agent-browser).
- Testy jednostkowe: 73 testy w 18 plikach — core, db (fałszywe `orm`, leniwy ORM bez połączenia, konfiguracja CLI), app (strony i layouty przez `renderToStaticMarkup`, route handler, instrumentation, composition root, `apiHandler`, logger), ui (prymitywy shadcn). Refaktory pod testowalność: `createMigrationOrmConfig`, `loadRootEnv(dir)`, usunięta martwa gałąź w `parseServerEnv`.
- CI: cztery joby — Lint, Unit tests (100% coverage), Build, Integration tests (testcontainers + agent-browser).
- Dokumentacja: `AGENTS.md` (sekcja „Testy” z zasadą 100%), `packages/{app,db}/AGENTS.md`, standard (rozdz. 1 i 10), README, `.ai/lessons.md`.
- Git: `git push origin main` (`d567152..b7c7d73`), push gałęzi, PR #1 do `main`.

## Weryfikacja
- Lokalnie: `lint`, `format:check`, `typecheck`, `test:unit` (100%), `build`; `test:integration` z `TEST_DATABASE_URL` (5/5); `test:e2e` — aplikacja startuje i jest sprzątana, test HTTP przechodzi, scenariusze przeglądarkowe nie mogą działać bez Chrome.
- GitHub Actions, przebieg `39863346185` na PR #1: wszystkie cztery checki zielone; `agent-browser doctor` — headless launch OK; integracja 5/5 na kontenerze PostgreSQL; E2E 3/3.

## Problemy
- Nowy `next-server` po buildzie okazał się workerem podglądu `next dev` (PPID), nie osieroconym procesem testów — nie ruszany.

## Kolejne kroki
- Ochrona gałęzi `main` w ustawieniach GitHuba: wymagane checki (Lint, Unit tests, Build, Integration tests) przed mergem — decyzja i uprawnienia po stronie właściciela repo.
- Zasady PR/merge (strategia merge, review) do spisania w `AGENTS.md` po decyzji użytkownika.
