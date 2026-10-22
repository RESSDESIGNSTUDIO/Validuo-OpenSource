# 2026-10-22 — Wdrożenie Engineering Standards w repozytorium

## Cel

Dostosować obecny fundament monorepo (`packages/{app,core,db,ui}`) do dokumentu `.ai/specs/engineering-standards.md` tak, żeby kolejne funkcje (pracownicy, grupy, zaproszenia…) powstawały od razu zgodnie ze standardem: właściwe granice pakietów, narzędzia jakości i testów, walidacja konfiguracji, wspólne mapowanie błędów API i właściciel migracji.

## Kontekst

- Fundament z `2026-10-22-monorepo-architecture` działa (lint, typecheck, build, `/api/health`, `/backend`), ale powstał przed standardem.
- Standard sam zastrzega (rozdz. 2, 4, 9): foldery domen i abstrakcje powstają **dopiero wraz z pierwszą używającą ich funkcją**. Ten przebieg nie tworzy więc pustych `domain/`, `policies/`, `features/`, `ui/src/backend/` ani reguł domenowych bez zaakceptowanej reguły produktu.
- Jedyny istniejący endpoint to `GET /api/health`; jedyna strona korzystająca z danych to `/backend`. To one są pierwszymi konsumentami wspólnej warstwy HTTP.
- Środowisko: Node 24.21, npm 11.19, PostgreSQL 17 (lokalnie `initdb`/`pg_ctl`), brak bibliotek systemowych Chromium (Playwright nie uruchomi się lokalnie).

## Zakres

### 1. Runtime i narzędzia (rozdz. 1, 7, 10)

- `.nvmrc` (`24`), `engines` `node >=24 <25`, `npm >=11`; `packageManager` już przypięty.
- `tsconfig.base.json`: dodać `exactOptionalPropertyTypes` (`strict` i `noUncheckedIndexedAccess` już są). Błędy naprawić typami, nie `any`/`as`.
- **Jeden formatter — Prettier 3** (root): `.prettierrc.json` zgodny z obecnym stylem (podwójne cudzysłowy, średniki, szerokość 120), `.prettierignore` (m.in. `*.md` — blok `nextjs-agent-rules` musi zostać bajt w bajt, lockfile, `.next`). Skrypty `format`, `format:check`. Jednorazowe sformatowanie kodu (całe drzewo i tak jest jeszcze niezacommitowane).
- **Zod 4** w `@validuo/core` (walidacja env teraz, schematy wejścia przy pierwszym endpoincie z body).
- **Vitest** (root, `vitest.config.ts` z projektami):
  - `unit` — `packages/*/src/**/*.test.ts` bez integracyjnych,
  - `integration` — `packages/*/src/**/*.integration.test.ts`, wyłącznie na bazie z `TEST_DATABASE_URL`.
  - Skrypty: `test:unit`, `test:integration`, `test` (= unit). Nazwy jednoznacznie wskazują rodzaj testów.
  - Strażnik bazy testowej (`@validuo/db/testing` → `requireTestDatabaseUrl()`): wymaga `TEST_DATABASE_URL`, odrzuca URL równy `DATABASE_URL` oraz bazę, której nazwa nie zawiera `test`. **Bez fallbacku na `DATABASE_URL`** (lekcja z 2026-10-22).
- **Playwright — odroczony** do pierwszego scenariusza E2E (logowanie). Brak krytycznych przepływów do pokrycia, a lokalnie nie da się go uruchomić; nie dodajemy niezweryfikowanej konfiguracji.
- **CI** `.github/workflows/ci.yml`: Node z `.nvmrc`, `npm ci`; kroki `lint`, `format:check`, `typecheck`, `test:unit`, `build`; osobny job `test:integration` z usługą `postgres:17`.

### 2. Granice pakietów w ESLint (rozdz. 2)

Jeden blok `no-restricted-imports` na pakiet (w flat config późniejszy blok nadpisuje opcje reguły, więc każdy blok jest kompletny):

| Pakiet | Zabronione |
| --- | --- |
| `core` | `@validuo/*`, React, Next.js, `@mikro-orm/*`, `pg`, `kysely`, `server-only`; `awilix` poza `src/di/**` |
| `db` | `@validuo/app`, `@validuo/ui`, React, Next.js (`@next/env` dozwolony — to loader env, nie framework), `awilix` (tylko przez `@validuo/core/di`) |
| `ui` | `@validuo/*` poza własnym `@validuo/ui/*`, Next.js, `@mikro-orm/*`, `awilix`, `server-only` |
| `app` | `awilix` (tylko przez `@validuo/core/di`); `(frontend)` dodatkowo `@validuo/ui/components/*` |
| wszystkie | względne importy do `src` innego pakietu (`regex`) |

### 3. `@validuo/core` (rozdz. 2, 4, 5, 7)

Struktura zgodna z rozdz. 9, jawne wejścia w `exports` (bez wejścia `.`/barrela — `contracts` musi być wolne od kodu serwerowego):

- `src/config/env.ts` → `@validuo/core/config`: schemat Zod zmiennych serwera, `parseServerEnv(env)` → `ServerEnv` (`{ nodeEnv, database: { url, poolMin, poolMax, debug } }`), błąd `ConfigurationError` z listą nazw zmiennych i opisem problemu **bez wartości** (sekrety). Zastępuje `requireEnv`/`intEnv`/`boolEnv` (usuwamy, bez martwego kodu).
- `src/errors/` → `@validuo/core/errors`: `app-error.ts` — `AppError` z `code: AppErrorCode` (`Unauthorized`, `Forbidden`, `NotFound`, `Validation`, `Conflict`, `PlanLimit`) i podklasy `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError` (`fieldErrors`), `ConflictError`, `PlanLimitError`; `configuration-error.ts` — `ConfigurationError` (błąd startowy, **nie** `AppError` → w API zawsze 500 z neutralnym komunikatem). Błędy nie znają HTTP.
- `src/contracts/` → `@validuo/core/contracts`: `ApiResult<T>` (dokładnie wg rozdz. 4). Bez zależności serwerowych.
- `src/di/` → `@validuo/core/di`: **koniec declaration merging**. `createAppContainer<TCradle>()`, `DiModule<TCradle>`, `AppContainer<TCradle>` generyczne; każdy pakiet eksportuje typ swojego fragmentu cradle (np. `DbCradle`), a pełny typ `AppCradle` powstaje w composition root (rozdz. 5: „typowanie konkretnych rejestracji powstaje w composition root”). Tryb `PROXY` + `strict` bez zmian.

### 4. `@validuo/db` (rozdz. 5)

- `createOrmConfig(database: DatabaseConfig)` — czysta funkcja na zwalidowanej konfiguracji; `createDbModule(database)` → `DiModule<DbCradle>` (`orm` singleton z disposerem, `em` scoped fork). `DbCradle` eksportowany typ.
- **Migracje: jedynym właścicielem schematu jest Migrator MikroORM** (`packages/db/src/migrations` + `.snapshot.json`, skrypty `db:migration:create`/`db:migrate`/`db:migration:down`/`db:migration:list`). CLI łączy się kontem `MIGRATION_DATABASE_URL` (opcjonalne, domyślnie `DATABASE_URL`) — konto migracyjne oddzielne od runtime (rozdz. 6). Projekt **nie używa Supabase**.
- `src/testing/` → `@validuo/db/testing`: `requireTestDatabaseUrl()`.
- `checkDatabase(orm)` bez zmian.

### 5. `@validuo/app` (rozdz. 4, 5, 6)

- `src/server/logging/logger.ts`: `Logger` (info/warn/error, kontekst strukturalny) + implementacja JSON na `console`; singleton `logger` w DI. Nie loguje sekretów (serializacja błędu: `name`, `message`, `code`, `stack`).
- `src/server/container.ts`: `AppCradle = DbCradle & { env; logger }`, budowa leniwa przy pierwszym `getContainer()` (env parsowany wtedy, nie przy imporcie → build nie wymaga bazy ani env). `withRequestScope` jak dotąd (`finally` → `dispose`).
- `src/server/http/api-handler.ts`: `apiHandler(operation, handler)` → Route Handler; tworzy request scope, `requestId` (z bezpiecznego nagłówka `x-request-id` lub nowy UUID; zwracany w nagłówku i w błędach), mapuje `AppError` → status (401/403/404/422/409/409), `HttpError` warstwy transportu (np. `ServiceUnavailable` 503) i nieoczekiwane → 500 z neutralnym komunikatem po polsku, loguje 5xx z `requestId`, `operation`, `code`. Odpowiedź zawsze w formacie `ApiResult`. Pomocnicze parsery body/params/query dodamy przy pierwszym endpoincie z wejściem (rozdz. 4: „tworzone, gdy pojawia się pierwszy używający ich endpoint”).
- `GET /api/health` przez `apiHandler`: `200 {ok:true,data:{status:"ok",db:"ok"}}` / `503 {ok:false,error:{code:"ServiceUnavailable",…}}`; szczegóły błędu bazy tylko w logu.
- `/backend`: przestaje wyświetlać surowy komunikat błędu bazy (panel nie ma jeszcze sesji — rozdz. 6: surowych błędów nie zwracamy do przeglądarki); powód tylko w logu.
- Wspólny loader env oparty na `@next/env` dla Next.js i narzędzi DB (rozdz. 7) — jeśli `next.config.ts` (kompilowany do CJS) da się bezpiecznie połączyć z modułem współdzielonym; w przeciwnym razie dwa wywołania tego samego `loadEnvConfig` z tym samym katalogiem root i zapis w lekcjach.
- Fail-fast konfiguracji przy starcie serwera (`instrumentation.ts`), o ile `register()` nie jest wywoływany podczas `next build`.

### 6. Dokumentacja i proces

- `AGENTS.md` (root i pakietów): standard jako obowiązujące źródło (`.ai/specs/engineering-standards.md`), zaktualizowane granice, struktura `core`, nazewnictwo (skrót + odesłanie), migracje MikroORM, testy, formatter, env. Usunięcie sprzecznych zapisów (`Cradle` merging, `requireEnv`).
- `README.md`: stos, skrypty, testy, migracje, env (`TEST_DATABASE_URL`, `MIGRATION_DATABASE_URL`).
- `.env.example`: tylko bezpieczne przykłady.
- Log przebiegu w `.ai/runs/`, wnioski w `.ai/lessons.md`.
- `engineering-standards.md` zostaje w `.ai/specs/` jako stały, obowiązujący standard (nie jest jednorazową pracą, więc nie trafia do `implemented/`); ta specyfikacja po wdrożeniu → `implemented/`.

## Poza zakresem (osobne specyfikacje, gdy pojawi się funkcja)

Uwierzytelnianie (`server/auth/require-session.ts`, mechanizm do wyboru), ochrona CSRF/origin dla mutacji, rate limiting, RLS i rola runtime, polityki grup/planów i limity, `deadline-status`, encje i repozytoria domen, `UnitOfWork`, outbox, Storage, `lib/api/api-call.ts`, `ui/src/backend/*`, Playwright/E2E, `makeCrudRoute`. Reguły domenowe wymagają zaakceptowanych reguł produktu i istniejącego kontraktu SQL — nie zgadujemy ich.

## Kryteria akceptacji

1. `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:unit`, `npm run build` przechodzą.
2. `npm run test:integration` przechodzi na tymczasowej instancji PostgreSQL 17 (`initdb` w katalogu tymczasowym, inny port); odmawia uruchomienia bez `TEST_DATABASE_URL` i dla bazy bez `test` w nazwie.
3. ESLint zgłasza błąd dla przykładowych zakazanych importów (core → `@mikro-orm/core`, ui → `@validuo/core`, db → `awilix`, względny import do cudzego `src`) — sprawdzone tymczasowym plikiem, który potem usuwamy.
4. `/api/health` zwraca `ApiResult` 200 przy działającej bazie i 503 przy niedostępnej, z nagłówkiem `x-request-id`; błąd bazy tylko w logu JSON.
5. Brak declaration merging `Cradle`; `container.resolve("orm")` nadal typowane w `app`.
6. Migracje MikroORM (`create`/`up`/`list`/`down`) sprawdzone na tymczasowej bazie kontem `MIGRATION_DATABASE_URL`.
7. Dokumentacja nie zawiera sprzecznych zasad (`requireEnv`, declaration merging, Supabase).

## Plan implementacji

1. Sondy wykonalności: import modułu współdzielonego w `next.config.ts`, czy `register()` z `instrumentation.ts` działa podczas `next build`.
2. Zależności: `zod` i `@next/env` (core), `vitest`, `prettier` (root dev).
3. `core`: config/errors/contracts/di + testy unit.
4. `db`: config/di/testing, konfiguracja CLI z Migratorem; testy integracyjne.
5. `app`: logger, container, api-handler (+ testy unit), health, `/backend`, instrumentation.
6. ESLint, Prettier (format całości), tsconfig, CI.
7. Dokumentacja, weryfikacja wg kryteriów, log przebiegu, lekcje.

## Realizacja i odstępstwa od planu (po przeglądzie planu i implementacji)

- `ApiResult<T>` trafił do `packages/app/src/lib/api/api-result.ts`, a nie do `@validuo/core/contracts` — używa go tylko `app` (serwer i przyszły helper klienta). `core/contracts` powstanie z pierwszym schematem/DTO.
- DI: zamiast `DiModule<T>` — typowane mapy `Registrations<T>` (`dbRegistrations(config)`), składane przez spread w `Registrations<AppCradle>`; Awilix sam nie sprawdza nazw ani typów rejestracji.
- `db:schema:diff` (pomocniczy dump SQL) zbędny — migracje generuje Migrator MikroORM (`db:migration:create`).
- Zamknięcie puli przy SIGTERM świadomie odroczone: Next (`next start`) sam drenuje żądania i kończy proces; własny handler zamknąłby pulę w trakcie trwających żądań, a `NEXT_MANUAL_SIG_HANDLE` jest udokumentowane tylko dla Pages Router. Wrócić przy zadaniach w tle (worker z własnym cyklem życia).
- Prettier nie formatuje prymitywów shadcn (`packages/ui/src/components/`) ani `packages/ui/src/styles/globals.css` — zostaje styl CLI, żeby `shadcn add`/`diff` dawały czytelne zmiany. Markdown również wyłączony (blok `nextjs-agent-rules`).
- `instrumentation.ts` pomija `next build` (`NEXT_PHASE`) i importuje tylko `@validuo/core/config`.
- Komentarze w kodzie przetłumaczone na angielski (rozdz. 7 standardu).
- `ui/src/lib/utils.ts` zostaje (alias shadcn `utils`) zamiast `lib/cn.ts` z rozdz. 9.
- Integracja w CI na `postgres:17`: krok `npm run db:migrate` na bazie testowej, potem `test:integration`.

Weryfikacja: `.ai/runs/2026-10-22-engineering-standards.md`.

## Korekta po wdrożeniu (2026-10-22)

Pierwotnie (wg ówczesnej treści standardu) migracje przeniesiono do Supabase CLI. Użytkownik odrzucił Supabase w całości: przywrócono Migrator MikroORM, usunięto `supabase/`, CLI i wrapper skryptów, a z `engineering-standards.md` usunięto zależności od Supabase (Auth, Storage, RLS z JWT, `supabase/migrations`). Szczegóły: `.ai/specs/implemented/2026-10-22-remove-supabase.md`.
