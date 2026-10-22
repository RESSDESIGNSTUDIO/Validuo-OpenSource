<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Validuo — architektura i założenia

Validuo to aplikacja webowa SaaS (pracownicy, grupy, działy, dokumenty, szkolenia, uprawnienia, terminy i przypomnienia) w monorepo npm workspaces. Poniższe założenia są **obowiązujące**. Zmiana któregokolwiek z nich (inna biblioteka, inny podział pakietów, inny kierunek zależności) wymaga najpierw specyfikacji w `.ai/specs/` i akceptacji człowieka.

**Pełny standard inżynieryjny: [`.ai/specs/engineering-standards.md`](.ai/specs/engineering-standards.md)** — nazewnictwo, reguły domenowe (role, plany, limity, terminy, zaproszenia, audyt), API, transakcje, bezpieczeństwo, testy i checklista code review. Stosuj go przy każdej implementacji i każdym review; ten plik jest jego skrótem operacyjnym dla obecnego stanu repo.

## Stos technologiczny

| Obszar | Technologia | Uwagi |
| --- | --- | --- |
| Runtime | **Node.js 24 LTS**, **npm 11** | `.nvmrc`, `engines`, `packageManager`; CI używa tych samych wersji. |
| Framework | **Next.js 16.4** (App Router, Turbopack) + **React 19.3** | Tylko App Router, runtime Node.js dla kodu z bazą. Przed użyciem API Next.js czytaj `node_modules/next/dist/docs/`. |
| Język | **TypeScript 5.x**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | Nie podbijaj do TS 6.1+/7 — `typescript-eslint` (przez `eslint-config-next`) ich jeszcze nie wspiera. Bez `any` i nieuzasadnionych `as`. |
| Baza danych | **PostgreSQL 17** | Runtime: `DATABASE_URL` (konto o minimalnych prawach). Migracje: opcjonalnie osobne konto `MIGRATION_DATABASE_URL`. **Bez Supabase** (ani Auth, ani Storage, ani CLI). |
| ORM i migracje | **MikroORM 7** (`@mikro-orm/postgresql`, `@mikro-orm/migrations`) | `defineEntity`, Unit of Work, jawna lista encji, `em` per scope; jedyny migrator schematu. Bez innego ORM/query buildera (Prisma, Drizzle, surowy `pg`). |
| DI | **Awilix 13** | Jedyny kontener DI. Bez singletonów modułowych i „service locatora”. |
| Walidacja | **Zod 4** | Env, body/params/query, DTO. Dane z HTTP, JSON z DB i integracji to `unknown` do czasu walidacji. |
| CSS | **Tailwind CSS 4** | Wspólne tokeny motywu w `@validuo/ui`. |
| UI — panel | **shadcn/ui** (styl `radix-nova`, Radix UI, lucide-react) | Panel `/backend` składany z komponentów `@validuo/ui`. |
| Jakość | **ESLint** (granice pakietów), **Prettier** (jedyny formatter) | |
| Testy | **Vitest** (unit z progiem **100%** pokrycia, `@vitest/coverage-v8`), **testcontainers** (PostgreSQL 17 dla integracji), **agent-browser** (scenariusze przeglądarkowe na tymczasowej instancji aplikacji) | Zasady: sekcja „Testy” niżej. |
| Menedżer pakietów | **npm** (workspaces) | Nie zmieniaj na pnpm/yarn/bun. Jeden `package-lock.json` w root. |

Nowa biblioteka musi rozwiązywać konkretny problem, którego nie pokrywają obecne narzędzia. Wersje ustala lockfile; nie używamy `latest` (także w `npx`).

## Struktura monorepo

```
.
├── packages/
│   ├── app/    @validuo/app  — Next.js: trasy, strony, route handlers, sesja, adaptery integracji, composition root DI
│   ├── core/   @validuo/core — reguły biznesowe, przypadki użycia, porty, schematy, błędy, env, DI (bez frameworka i ORM)
│   ├── db/     @validuo/db   — MikroORM: konfiguracja, encje, migracje, repozytoria (adaptery portów z core), transakcje
│   └── ui/     @validuo/ui   — prymitywy shadcn/ui, generyczne wzorce panelu, `cn`, motyw i globalny CSS Tailwind
├── tsconfig.base.json        — wspólna konfiguracja TypeScript
├── eslint.config.mjs         — jedna konfiguracja ESLint dla całego repo (w tym granice pakietów)
├── vitest.config.ts          — projekty testów `unit` (pokrycie 100%), `integration`, `e2e`
├── .github/workflows/ci.yml  — checki PR: Lint, Unit tests (100%), Build, Integration tests (testcontainers + agent-browser)
└── .env.example              — wzór zmiennych środowiskowych (pliki .env* trzymamy w root)
```

Każdy pakiet ma własny `AGENTS.md` ze szczegółowymi zasadami — przeczytaj go przed zmianami w danym pakiecie. Docelowe miejsce każdej odpowiedzialności (np. `core/src/services/<domena>/`, `db/src/repositories/<domena>/`, `app/src/features/<domena>/`) opisuje rozdz. 9 standardu. **Foldery domen i abstrakcje tworzymy dopiero razem z pierwszą funkcją, która ich potrzebuje** — bez pustych struktur „na przyszłość”, modułowego runtime i auto-discovery.

## Kierunek zależności między pakietami

```
app ──► ui
app ──► core
app ──► db ──► core
ui, core ──► (brak pakietów workspace)
```

- `core`: bez `@validuo/*`, React, Next.js, MikroORM/`pg`/`kysely`, `server-only`. `awilix` tylko w `core/src/di/`. Usługi w `core` **nie przyjmują `EntityManager`** — dostają porty repozytoriów (i kontrakt transakcyjny), które implementuje `db`.
- `db`: bez `@validuo/app`, `@validuo/ui`, React, Next.js.
- `ui`: nie zna ORM, DI, sekretów ani pakietów `app`/`db`/`core` — dostaje dane i callbacki przez propsy.
- `app`: composition root; adaptery integracji niezwiązanych z bazą (poczta, storage) w `app/src/server/adapters/`.
- Wszędzie: `awilix` tylko przez `@validuo/core/di`; importy między pakietami wyłącznie przez publiczne `exports` (np. `@validuo/core/errors`, `@validuo/db`, `@validuo/ui/components/button`), nigdy ścieżkami względnymi do cudzego `src`.
- Granice wymusza ESLint (`no-restricted-imports` w `eslint.config.mjs`) — nie wyłączaj tej reguły. Dynamiczny `import()` nie jest przez nią sprawdzany — pilnuj go w review.
- Cykle zależności są zabronione. Pakiety nie mają kroku budowania: `exports` wskazuje pliki `.ts`/`.tsx`, Turbopack je transpiluje. Nowy publiczny moduł = nowy wpis w `exports`.
- Zależności npm instaluj w pakiecie, który ich używa: `npm install <pkg> -w @validuo/<pakiet>`. W root tylko narzędzia całego repo (ESLint, Prettier, TypeScript, Vitest, `@types/node`).
- Nowy pakiet: katalog `packages/<nazwa>`, nazwa `@validuo/<nazwa>`, `"type": "module"`, `"private": true`, `tsconfig.json` rozszerzający `../../tsconfig.base.json`, skrypt `typecheck`, własne `AGENTS.md` + `CLAUDE.md` (`@AGENTS.md`). Zaktualizuj ten plik, `README.md` i reguły granic w `eslint.config.mjs`.

## Nazewnictwo (skrót — pełna tabela w rozdz. 2 standardu)

- Kod, identyfikatory i komentarze **po angielsku**; teksty produktu (UI, komunikaty błędów dla użytkownika) **po polsku**. Komentarz wyjaśnia nieoczywiste „dlaczego”.
- Foldery domen w liczbie mnogiej, ta sama nazwa we wszystkich warstwach (`employees`, `groups`); pliki i foldery kebab-case.
- `EmployeeService`, `EmployeeRepository` (port w `core`), `MikroOrmEmployeeRepository` (adapter w `db`), `MailGateway`/`FileStoragePort`, klucze DI camelCase (`employeeService`), schematy `employeeCreateSchema`, błędy `ForbiddenError`, zdarzenia `groups.invitation.created`.
- Encje: `EmployeeSchema` w `db/src/entities/<domena>/<nazwa>.entity.ts`; tabele snake_case w liczbie mnogiej. Nazwy tabel, wartości enumów i sygnatury RPC to kontrakty — konwencja nie jest powodem do ich zmiany.
- Testy: `<nazwa>.test.ts` / `.test.tsx` (unit), `<nazwa>.integration.test.ts` (PostgreSQL), E2E `packages/app/e2e/<scenariusz>.spec.ts`.

## Dependency Injection (Awilix)

- Kontener tworzy `createAppContainer<AppCradle>(registrations)` z `@validuo/core/di`: tryb `PROXY` i `strict: true` (Awilix wykrywa m.in. singleton zależny od zależności `scoped`).
- **Bez declaration merging.** Pakiet eksportuje typ swojego fragmentu cradle i rejestracje: `dbRegistrations(config): Registrations<DbCradle>`. Pełny typ `AppCradle` i lista rejestracji powstają tylko w composition root — `Registrations<AppCradle>` sprawdza, że każdy klucz ma resolver właściwego typu.
- Klasy i fabryki deklarują tylko to, czego potrzebują: `constructor({ employeeRepository }: { employeeRepository: EmployeeRepository })`, `asFunction(({ orm }: Pick<DbCradle, "orm">) => ...)`. Domeny nigdy nie wołają `container.resolve()`.
- **Composition root** jest jeden: `packages/app/src/server/container.ts`. `getContainer()` — kontener główny (singletony na proces; konfiguracja env walidowana przy pierwszym użyciu); `withRequestScope(fn)` — scope na jedno żądanie / server action / zadanie, zwalniany w `finally`.
- Cykle życia: `singleton` — ORM, logger, konfiguracja, bezstanowi klienci integracji (nigdy sesja, użytkownik, tenant ani scoped repozytorium); `scoped` — `em`, repozytoria, usługi z kontekstem aktora, kontekst żądania; `transient` — tylko gdy naprawdę potrzebne.
- Kontener i serwisy są wyłącznie serwerowe (`import "server-only"` w kodzie aplikacji). Nigdy nie importuj ich w Client Components.

## Konfiguracja (env)

- Jedno miejsce walidacji: `parseServerEnv(process.env)` z `@validuo/core/config` (Zod). Błąd wymienia nazwy zmiennych i problem, **nigdy wartości**. Nowa zmienna = schemat w `core/src/config/env.ts` + `.env.example` + `README.md`.
- Pliki `.env*` leżą w root i ładuje je jeden loader `loadRootEnv()` z `@validuo/core/config/load-env` (na bazie `@next/env`) — w `next.config.ts` i w narzędziach DB.
- `src/instrumentation.ts` waliduje env przy starcie serwera (poza `next build`): przy błędnej konfiguracji serwer od razu loguje przyczynę i odpowiada 500 na każde żądanie. Build nie potrzebuje ani bazy, ani sekretów.
- `.env.example` zawiera tylko bezpieczne przykłady. Sekrety nigdy w `NEXT_PUBLIC_*`.

## Baza danych

- **Schemat zmieniamy wyłącznie migracjami MikroORM**: zmiana encji → `npm run db:migration:create` → przejrzyj wygenerowany SQL (uzupełnij ręcznie constraints, indeksy, granty, ew. polityki RLS i triggery, których ORM nie generuje) → `npm run db:migrate`. Commituj migracje razem z `packages/db/src/migrations/.snapshot.json`. Nie edytuj migracji już zastosowanych na współdzielonych środowiskach — dodaj nową. Zmiana destrukcyjna wymaga świadomej decyzji, backupu i procedury odtworzenia.
- CLI MikroORM łączy się kontem `MIGRATION_DATABASE_URL` (domyślnie `DATABASE_URL`). **Nigdy** nie uruchamiaj `schema:update --run`, `schema:fresh`, `schema:drop` ani `migration:fresh` na współdzielonej bazie — w MikroORM 7 `schema.update()` domyślnie **usuwa tabele, których nie zna**. Eksperymenty na osobnej, tymczasowej bazie (`initdb`/`createdb`); skrypty testowe nigdy nie mają „fallbacku” na `process.env.DATABASE_URL`.
- Encje: `defineEntity` + `p` z `@mikro-orm/core` (bez dekoratorów i `reflect-metadata`), jedna na plik (`entities/<domena>/<nazwa>.entity.ts`); każdą dopisz do listy w `packages/db/src/entities/index.ts` (skanowanie katalogów nie działa w bundlu Next.js).
- Pracuj na `em` z bieżącego scope, nie na globalnym `orm.em`. Serwisy nie zwracają encji ORM do Reacta — repozytorium mapuje na modele/DTO. Zapytanie po samym `id` bez zakresu dostępu to błąd.
- Stan połączenia: `checkDatabase(orm)` z `@validuo/db` (`orm.checkConnection()` przed pierwszym zapytaniem zawsze zgłasza brak połączenia).
- `@validuo/db` tylko w kodzie serwerowym. Pakiety MikroORM są w `serverExternalPackages` (`packages/app/next.config.ts`) — nowe `@mikro-orm/*` dopisz tam również.

## API i błędy

- Route Handlers owijamy `apiHandler(operation, handler)` z `app/src/server/http/api-handler.ts`: scope DI na żądanie, `requestId` (nagłówek `x-request-id`), `cache-control: no-store`, odpowiedź `ApiResult<T>` (`app/src/lib/api/api-result.ts`) i jedno mapowanie błędów.
- Błędy domenowe: `AppError` z `@validuo/core/errors` (`UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404, `ValidationError` 422 z `fieldErrors`, `ConflictError` 409, `PlanLimitError` 409) — nie znają HTTP. Błędy transportu (400, 429, 503…): `HttpError` z `app/src/server/http/http-error.ts`. Wszystko inne → 500 z neutralnym komunikatem; szczegóły tylko w logu.
- Logi: `logger` z DI (JSON, jedna linia); w handlerze `context.logger` ma już `requestId` i `operation`. Nigdy JWT, linków zaproszeń, signed URLs, haseł ani treści dokumentów. Bez pustego `catch`.
- Wejście waliduj schematami Zod (body, params, query, limity rozmiaru i paginacji); nigdy `em.assign(entity, rawBody)`. Aktor, plan, rola i tenant pochodzą z zaufanej warstwy, nie z payloadu.
- Route Handler i Server Action wywołują ten sam przypadek użycia; każda chroniona operacja sama weryfikuje sesję i uprawnienie (layout/redirect/ukryty przycisk to nie autoryzacja).

## UI: frontend (Tailwind) i backend (shadcn/ui)

- **Frontend** — `packages/app/src/app/(frontend)`: strony publiczne stylowane wyłącznie klasami Tailwind (tokeny motywu dozwolone). **Nie** importuj tam `@validuo/ui/components/*` (wymusza ESLint).
- **Backend** — `packages/app/src/app/(backend)/backend` (URL `/backend`): panel z komponentów shadcn/ui z `@validuo/ui`. Generyczne wzorce panelu (formularze, tabele, feedback) → `ui/src/backend/`; komponenty domenowe → `app/src/features/<domena>/components/`.
- Komponenty shadcn dodajemy CLI z katalogu głównego przypiętą wersją: `npx shadcn add <komponent> -c packages/app` — trafiają do `packages/ui/src/components/`. Nie kopiuj ich ręcznie. Prymitywy i `globals.css` nie są formatowane Prettierem (zostaje styl CLI, diffy z upstreamem są czytelne). Nowy kod może wymagać poprawek pod `exactOptionalPropertyTypes` i — jak każdy kod w `src` — musi mieć testy jednostkowe ze 100% pokrycia.
- Importy: `@validuo/ui/components/<nazwa>`, `@validuo/ui/lib/utils` (`cn`), `@validuo/ui/hooks/<nazwa>`.
- Motyw (tokeny CSS), `@import "tailwindcss"` i `@source` pakietu `ui`: jedno miejsce — `packages/ui/src/styles/globals.css`, importowane w `packages/app/src/app/globals.css`. Nie twórz drugiego wejścia Tailwinda.
- Domyślnie Server Components; `"use client"` tylko dla interakcji i hooków przeglądarki. Stany: ładowanie, pusta lista, błąd, zapis, brak dostępu; dostępność (klawiatura, etykiety, focus); układ < 700 px, 700–1099 px, ≥ 1100 px.

## Aplikacja Next.js (`packages/app`)

- `src/app/` — trasy; `src/server/` — kod tylko serwerowy (zaczyna się od `import "server-only"`); `src/lib/` — kod współdzielony z klientem; `src/components/` — komponenty aplikacji. Alias `@/*` → `packages/app/src/*` (tylko w `app`).
- Strony i route handlers są cienkie: sesja, walidacja wejścia, wywołanie przypadku użycia, mapowanie wyniku. Server Components czytają dane przez serwerowe przypadki użycia, nie przez HTTP do własnego `/api`.
- Strony czytające bazę muszą być renderowane na żądanie (np. `await connection()` z `next/server`). Prywatnych danych nie czytamy podczas statycznego generowania.
- `next.config.ts` jest kompilowany przez Next.js do CommonJS — `@next/env` ładuje tam wyłącznie `loadRootEnv()` (wspólny loader działa w CJS i ESM).

## Testy

- **Zasada: każda nowa funkcja musi mieć 100% pokrycia testami jednostkowymi** — 100% instrukcji, gałęzi, funkcji i linii dla całego kodu w `packages/*/src`, który dodaje lub zmienia. Dotyczy także poprawek błędów, refaktorów i komponentów dodanych przez `shadcn add`. Funkcja bez takich testów nie jest skończona.
- Próg wymusza `npm run test:unit` (`thresholds: { 100: true }` w `vitest.config.ts`) i check **Unit tests** w CI — PR poniżej 100% nie może zostać zmergowany.
- Z pomiaru wyłączone są wyłącznie: pliki testów, `*.d.ts` i wygenerowane migracje (`packages/db/src/migrations/**`). **Nie dodawaj nowych wykluczeń, `/* v8 ignore */` ani nie obniżaj progów bez wyraźnej zgody człowieka.** Kod nietestowalny jednostkowo refaktoryzuj (wstrzykiwane zależności, czyste funkcje), zamiast go wykluczać.
- Infrastruktura testów leży poza `src` i nie jest kodem produkcyjnym: `packages/db/testing` (`@validuo/db/testing`: `startTestDatabase`, `requireTestDatabaseUrl`; `@validuo/db/testing/vitest`: `testDatabaseUrl()`), `packages/app/testing` (`startAppServer`, `createAgentBrowser`, `appUrl()`), `packages/app/e2e`.
- Testy jednostkowe: obok kodu, bez bazy i sieci; zależności przez mocki/porty testowe (`vi.mock`, fałszywe implementacje portów). Komponenty i strony renderuj `react-dom/server` (`renderToStaticMarkup`, async Server Components: `await Page()`).
- Testy integracyjne (`*.integration.test.ts`): global setup uruchamia **PostgreSQL 17 przez testcontainers** (wymaga Dockera) i stosuje migracje MikroORM; URL bazy z `testDatabaseUrl()`. Bez Dockera ustaw `TEST_DATABASE_URL` (baza z `test` w nazwie, różna od `DATABASE_URL`). Nigdy nie używaj `DATABASE_URL` w testach.
- Testy E2E (`packages/app/e2e/*.spec.ts`): global setup startuje bazę jak wyżej i zbudowaną aplikację (`npm run build` wcześniej) przez `next start` na wolnym porcie; scenariusze sterują przeglądarką przez **agent-browser** (`createAgentBrowser()` — przypięta wersja, `--json`, osobna `--session`).
- **Ręczne / agentowe testy UI:** `npm run build && npm run app:ephemeral` uruchamia tymczasową bazę i aplikację i wypisuje URL; potem `npx agent-browser --session <nazwa> open <url>`, `snapshot`, `screenshot`, `close`. Pierwsze użycie: `npx agent-browser install` (Linux: `--with-deps`). Jeśli środowisko nie pozwala uruchomić Chrome lub Dockera, napisz to wprost w raporcie.

## Polecenia (uruchamiaj z katalogu głównego)

| Polecenie | Opis |
| --- | --- |
| `npm run dev` | Serwer deweloperski Next.js (`packages/app`). Argumenty przekazuj po `--`. |
| `npm run build` / `npm start` | Build i start produkcyjny (wymuszają `NODE_ENV=production`). |
| `npm run lint` | ESLint dla całego repo. |
| `npm run format` / `npm run format:check` | Prettier: formatowanie / sprawdzenie (CI). |
| `npm run typecheck` | `tsc --noEmit` w każdym pakiecie (w `app` poprzedzone `next typegen`). |
| `npm run test:unit` (`npm test`) | Vitest — testy jednostkowe z pokryciem; błąd poniżej 100%. Raport HTML: `coverage/`. |
| `npm run test:integration` | Vitest — testy na PostgreSQL 17 (testcontainers albo `TEST_DATABASE_URL`). |
| `npm run test:e2e` | Vitest + agent-browser na tymczasowej instancji aplikacji (wymaga `npm run build`, Dockera lub `TEST_DATABASE_URL`, Chrome z `npx agent-browser install`). |
| `npm run app:ephemeral` | Tymczasowa baza + aplikacja do testów ręcznych/agentowych przez agent-browser (Ctrl+C kończy). |
| `npm run db:migration:create` | Generuje migrację z różnicy encji i snapshotu (`packages/db/src/migrations`). |
| `npm run db:migrate` / `npm run db:migration:down` | Stosuje / cofa migracje (konto `MIGRATION_DATABASE_URL`, domyślnie `DATABASE_URL`). |
| `npm run db:migration:list` | Lista wykonanych migracji. |
| `npm run db -- <komenda>` | Dowolna komenda CLI MikroORM (np. `debug`, `migration:pending`) — bez `schema:update --run`/`schema:fresh`/`schema:drop`. |

## Git, pull requesty i merge

- **Nikt nie pushuje bezpośrednio do `main`** (dotyczy też agentów AI). Każda zmiana idzie przez gałąź i pull request. GitHub nie pozwala wymusić ochrony gałęzi w tym planie repozytorium, więc zasada obowiązuje z konwencji — nie obchodź jej.
- **Nazwy gałęzi:** `<typ>/<krótki-opis>`, typ: `feat`, `fix`, `refactor`, `docs`, `ci`, `test`, `chore` (np. `feat/employee-groups`). Gałąź powstaje od aktualnego `main`.
- **Commity i tytuł PR:** styl Conventional Commits (`feat:`, `fix:`, `docs:`, `ci:`…), opis po polsku. Jeden PR = jeden zrozumiały cel, bez przypadkowych rename i aktualizacji zależności; powiąż go ze specyfikacją z `.ai/specs/`.
- **Opis PR** wypełnia szablon `.github/pull_request_template.md`: Cel, Zmiany, Weryfikacja (rzeczywiste wyniki), checklista review z rozdz. 10 standardu, Ograniczenia.
- **Warunki merge'a:** wszystkie checki CI zielone — **Lint**, **Unit tests (100% coverage)**, **Build**, **Integration tests** — gałąź aktualna względem `main` oraz akceptacja człowieka. PR z czerwonym checkiem nie jest mergowany; nie obchodź CI (`--admin`, wyłączanie checków, obniżanie progów).
- **Sposób merge'a: wyłącznie squash** (ustawienie repozytorium). Tytuł i opis PR stają się commitem na `main`, więc tytuł musi być w stylu Conventional Commits.
- **Gałęzie po merge'u są usuwane automatycznie.** Historia pozostaje w PR (commity, diff, dyskusja, wyniki CI); usuniętą gałąź przywraca przycisk „Restore branch".
- **Agent AI** samodzielnie tworzy gałąź, commituje i otwiera PR, ale **nigdy nie merguje bez wyraźnego polecenia człowieka**, nie robi force-pusha na wspólne gałęzie i nie pushuje do `main`. Po otwarciu PR obserwuje CI i naprawia czerwone checki na tej samej gałęzi.
- Po zmianie reguł procesu w tej sekcji zaktualizuj też `.github/pull_request_template.md` i `README.md`.

# Spec-Driven Development i pamięć projektu (`.ai/`)

Ten projekt wykorzystuje katalog `.ai/` jako jedyne źródło prawdy dla specyfikacji, logów autonomicznych przebiegów AI oraz wniosków/lekcji. **Każdy agent AI pracujący w tym repozytorium musi przestrzegać poniższych zasad.**

## `.ai/specs/` — specyfikacje (SDD)

- Przed rozpoczęciem nietrywialnej pracy (nowa funkcja, refaktor, zmiana architektury) utwórz plik specyfikacji w `.ai/specs/`. Jeśli zadanie jest na tyle duże, że wymagałoby specyfikacji, a jej brak — zatrzymaj się i najpierw ją napisz.
- Format nazwy: `YYYY-MM-DD-slug.md` (np. `2026-10-21-user-auth-refresh.md`).
- Specyfikacja opisuje: cel, kontekst, zakres, kryteria akceptacji, ew. plan implementacji.
- Po zakończeniu i wdrożeniu pracy opisanej w specyfikacji, przenieś plik do `.ai/specs/implemented/` (bez zmiany nazwy).
- Specyfikacje porzucone, zastąpione lub nieaktualne przenoś do `.ai/specs/archive/` — nigdy nie usuwaj.

## `.ai/runs/` — logi autonomicznych przebiegów AI

- Każdy autonomiczny przebieg agenta AI (praca w tle, pętle typu `/loop`, dłuższe sesje bez bieżącego nadzoru człowieka) musi zostawić log w `.ai/runs/`.
- Format nazwy: `YYYY-MM-DD-slug.md`.
- Log zawiera: cel przebiegu, podjęte kroki/decyzje, napotkane problemy, wynik końcowy i ewentualne kolejne kroki.

## `.ai/lessons.md` i `.ai/lessons/` — wnioski i długoterminowa pamięć

- Przed rozpoczęciem pracy przejrzyj `.ai/lessons.md` — mogą tam być wskazówki dotyczące tego zadania lub obszaru kodu.
- Po naprawieniu nietrywialnego błędu, odkryciu pułapki, ustaleniu nieoczywistej zasady działania projektu lub wypracowaniu usprawnienia — zapisz wniosek.
- Krótkie, ogólne wnioski dopisuj bezpośrednio do `.ai/lessons.md`.
- Dłuższe lub tematyczne notatki zapisuj jako osobne pliki w `.ai/lessons/` i dodaj odnośnik w `.ai/lessons.md`.
- Każdy wniosek zawiera: co się stało, dlaczego to ważne, co robić inaczej następnym razem.
- Po każdej korekcie od użytkownika zapisz wniosek tak, żeby ten sam błąd się nie powtórzył. Jeśli wniosek jest trwałą regułą pracy (nie jednorazowym faktem), dopisz go też zwięźle do `AGENTS.md`.

## Zasady pracy

### Planowanie
- Złożone zadania (wiele plików, kilka możliwych podejść, niejasne wymagania) zaczynaj od planu, nie od kodu. Plan zapisz w specyfikacji w `.ai/specs/` i dopracuj go tak, aby implementacja przeszła za jednym podejściem.
- Gdy implementacja zaczyna iść źle, przerwij ją i wróć do planu. Nie forsuj nieudanego podejścia.
- Gdy specyfikacja przeczy obowiązującemu założeniu z tego pliku (biblioteka, narzędzie, właściciel schematu, dostawca usług), wskaż konflikt i zapytaj człowieka **przed** implementacją — zapis w specyfikacji nie jest akceptacją zmiany architektury.
- Przy większych zmianach zleć niezależny przegląd planu (np. subagentowi w roli senior/staff engineera) przed rozpoczęciem implementacji.

### Weryfikacja
- Nie uznawaj zadania za skończone bez weryfikacji. Minimum to `npm run lint`, `npm run format:check`, `npm run typecheck` (`tsc --noEmit` w każdym pakiecie — w root nie ma `tsconfig.json`, więc samo `npx tsc --noEmit` nic nie sprawdzi) i `npm run test:unit` (100% pokrycia); przy zmianach w routingu, konfiguracji, zależnościach lub buildzie także `npm run build`, przy zmianach w `db`/SQL — `npm run test:integration`, a przy zmianach UI lub zachowania aplikacji — `npm run test:e2e` lub sprawdzenie przez `app:ephemeral` + agent-browser. Te same kontrole uruchamia CI dla każdego PR.
- Testy proporcjonalne do ryzyka (rozdz. 10 standardu): reguły i przypadki użycia — unit z portami testowymi; izolacja tenantów/grup, RLS na roli runtime, atomowość i wyścigi — integracja na PostgreSQL (dwie niezależne transakcje dla współbieżności). Raport podaje środowisko i rzeczywisty wynik — nie deklaruj wyniku testu, którego nie uruchomiono.
- Przed oddaniem przejdź checklistę review z rozdz. 10 standardu.
- Zmiany w `packages/db` (encje, migracje, konfiguracja) weryfikuj na osobnej, tymczasowej bazie, nigdy na współdzielonej.
- Zmiany UI sprawdź w działającej aplikacji (`npm run dev`), testując główną ścieżkę i przypadki brzegowe. Jeśli nie da się tego sprawdzić, napisz to wprost.
- Gdy poprawka okazuje się łatką, rozważ odrzucenie jej i wdrożenie eleganckiego rozwiązania z wykorzystaniem wiedzy zdobytej w trakcie pracy.

### Naprawianie błędów
- Błędy naprawiaj samodzielnie, zaczynając od analizy faktycznych danych: logów, komunikatów błędów, wyników lintera i buildu. Szukaj przyczyny źródłowej, zamiast maskować objawy.
- Po naprawie nietrywialnego błędu zapisz wniosek zgodnie z zasadami sekcji o `.ai/lessons.md`.

### Kontekst i równoległość
- Wyszukiwanie, research i niezależne podzadania deleguj subagentom, żeby główny kontekst pozostał czysty.
- Niezależne zadania mogą działać równolegle, każde w osobnym git worktree, aby nie nadpisywały wzajemnie swoich zmian.
- Jeśli zauważysz, że ta sama sekwencja kroków lub ten sam prompt powtarza się kilka razy (codziennie albo w kolejnych sesjach), od razu zapisz ją jako skill lub komendę w `.claude/` (bez pytania o zgodę), poinformuj o tym użytkownika i commituj ją do repozytorium.

## Egzekwowanie

- Te zasady obowiązują każdego agenta AI pracującego w tym repozytorium, niezależnie od narzędzia czy modelu.
- Nie pomijaj tworzenia specyfikacji, logowania przebiegów ani zapisywania wniosków z powodu pośpiechu — są one częścią procesu, nie opcjonalnym dodatkiem.
