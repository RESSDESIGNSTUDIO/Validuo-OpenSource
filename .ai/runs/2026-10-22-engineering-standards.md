# 2026-10-22 — Wdrożenie Engineering Standards

## Cel
Dostosować fundament monorepo do `.ai/specs/engineering-standards.md` (prośba użytkownika: „zaimplementuj specs engineering-standards”). Plan i odstępstwa: `.ai/specs/implemented/2026-10-22-engineering-standards-adoption.md`.

## Kroki i decyzje
- Standard to dokument stały, a nie jednorazowa funkcja, i sam zastrzega YAGNI (foldery domen i abstrakcje dopiero z pierwszą funkcją). Wdrożono więc fundament, narzędzia i dokumentację, bez zgadywania reguł domenowych. `engineering-standards.md` zostaje w `.ai/specs/` jako obowiązujący standard (linkowany z `AGENTS.md`).
- Sondy wykonalności przed implementacją: Supabase CLI (`db push --db-url` na tymczasowym PG 17), wspólny loader env w `next.config.ts`/`tsx`/Node, dokumentacja `instrumentation`.
- Niezależny przegląd planu (subagent): przyjęto przeniesienie `ApiResult` do `app`, strażniki `instrumentation`, odroczenie `db:schema:diff`, helper bloków ESLint, porównywanie host/port/bazy w strażniku testów. Formatowanie całości ograniczono wykluczeniami (shadcn, markdown).
- Zależności: `zod` i `@next/env` (core); `vitest`, `prettier`, `supabase` (root, dev); usunięto `@mikro-orm/migrations`.
- Kod: `core` (`config`, `config/load-env`, `errors`, generyczne `di`), `db` (`createOrmConfig(config)`, `dbRegistrations`, `testing`, wrapper Supabase CLI), `app` (logger JSON, composition root z `AppCradle`, `apiHandler` + `HttpError`, `/api/health` w `ApiResult`, `/backend` bez surowych błędów, `instrumentation.ts`).
- Narzędzia: `.nvmrc`, `engines`, `exactOptionalPropertyTypes`, ESLint z granicami wg standardu, Prettier, Vitest (`unit`/`integration`), CI GitHub Actions, `supabase/config.toml` (`project_id = "validuo"`, PG 17).
- Dokumentacja: `AGENTS.md` (root i pakiety), `README.md`, `.env.example`, wnioski w `.ai/lessons.md`.

## Weryfikacja (środowisko agenta: Node 24.21, npm 11.19, PostgreSQL 17.11 z `initdb`)
- `npm run lint`, `format:check`, `typecheck`, `test:unit` (21 testów), `build` (bez `DATABASE_URL`) — OK.
- `npm run test:integration` na `validuo_test` (4 testy) — OK; bez `TEST_DATABASE_URL` i dla bazy `postgres` — odmowa z kodem 1.
- ESLint: 12 zakazanych importów w plikach próbnych wykrytych, dozwolone (Awilix w `core/src/di`, `@validuo/ui/*` w `ui`) przepuszczone; pliki usunięte.
- `next start`: z bazą — `/`, `/backend` 200, `/api/health` 200 `ApiResult` z `x-request-id` i `no-store`; z niedostępną bazą — 503 `ServiceUnavailable`, `/backend` pokazuje tylko „Niedostępna”, przyczyna w logu JSON z `requestId`; bez `DATABASE_URL` — błąd konfiguracji przy starcie, 500 na każde żądanie.
- `npm run db:migrate` / `db:migration:list` / `db:migration:new` na tymczasowych bazach: migracja próbna zastosowana raz, ponowne uruchomienie bez zmian, pusta lista migracji OK, brak `MIGRATION_DATABASE_URL` → błąd. Migracja próbna usunięta.
- Podgląd `next dev` (port 3000, HMR) — `/`, `/backend`, `/api/health` 200.
- Nie uruchomiono: workflow CI na GitHubie (brak dostępu ze środowiska agenta), Playwright (brak bibliotek systemowych Chromium; odroczony), weryfikacja wizualna UI.

## Problemy
- Osierocony `next-server` po zabiciu procesu-rodzica dał fałszywie pozytywny wynik (odpowiadał stary serwer) — wykryte po `EADDRINUSE` w logu, procesy zamknięte po weryfikacji `cwd`/`environ`.
- Vitest gubi komunikat błędu z `globalSetup` — setup wypisuje go sam.
- Szczegóły: `.ai/lessons.md`.

## Kolejne kroki (osobne specyfikacje)
- Supabase Auth (`server/auth/require-session.ts`), ochrona CSRF/origin i rate limiting przed pierwszymi chronionymi mutacjami.
- Import istniejącego schematu Supabase do `supabase/migrations` (np. `supabase db pull`), rola runtime bez `BYPASSRLS`, testy RLS; obraz `supabase/postgres` w CI.
- Pierwsza domena (np. grupy/pracownicy) wg procedury z rozdz. 8: walidatory, porty, repozytoria, Unit of Work, polityki planów i limitów.
- Playwright z pierwszym scenariuszem E2E (logowanie); zamknięcie puli przy zadaniach w tle.

## Korekta użytkownika: bez Supabase
Użytkownik odrzucił Supabase w całości. Przywrócono migracje MikroORM i usunięto Supabase z kodu, zależności, CI, standardu i dokumentacji — specyfikacja `.ai/specs/implemented/2026-10-22-remove-supabase.md`, log `.ai/runs/2026-10-22-remove-supabase.md`. Opisane wyżej kroki z Supabase CLI są nieaktualne.
