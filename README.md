# Validuo

Validuo to aplikacja webowa SaaS do zarządzania pracownikami, grupami, strukturą działów, dokumentami, szkoleniami i uprawnieniami — z monitorowaniem terminów ważności, zaproszeniami, przypomnieniami i historią zmian. Zbudowana na Next.js, React i TypeScript, z PostgreSQL obsługiwanym przez MikroORM, w monorepo npm workspaces.

Obowiązujące standardy inżynieryjne (architektura, nazewnictwo, reguły domenowe, bezpieczeństwo, testy, checklista review): [`.ai/specs/engineering-standards.md`](.ai/specs/engineering-standards.md).

## Stos technologiczny

| Obszar | Technologia |
| --- | --- |
| Runtime | [Node.js 24 LTS](https://nodejs.org), npm 11 (`.nvmrc`, `engines`, `packageManager`) |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack), [React 19](https://react.dev) |
| Język | [TypeScript 5](https://www.typescriptlang.org) (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Baza danych | [PostgreSQL 17](https://www.postgresql.org) |
| ORM i migracje | [MikroORM 7](https://mikro-orm.io): `defineEntity`, migracje, Unit of Work, pula połączeń |
| Dependency Injection | [Awilix 13](https://github.com/jeffijoe/awilix) |
| Walidacja | [Zod 4](https://zod.dev) |
| Style | [Tailwind CSS 4](https://tailwindcss.com); panel: [shadcn/ui](https://ui.shadcn.com) (Radix UI, lucide-react) |
| Jakość | ESLint (granice pakietów), Prettier |
| Testy | [Vitest](https://vitest.dev) (unit, 100% pokrycia), [Testcontainers](https://node.testcontainers.org/) (PostgreSQL 17), [agent-browser](https://github.com/vercel-labs/agent-browser) (E2E) |
| Monorepo | npm workspaces |

## Architektura

### Pakiety

```
packages/
├── app/   @validuo/app   Next.js: trasy, strony, route handlers, warstwa HTTP, logger, composition root DI
├── core/  @validuo/core  Reguły biznesowe, przypadki użycia, porty, błędy, walidacja env, kontener DI
├── db/    @validuo/db    Persystencja: konfiguracja MikroORM, encje, migracje, repozytoria, rejestracje DI
└── ui/    @validuo/ui    Komponenty interfejsu: shadcn/ui, `cn`, motyw i globalny CSS Tailwind
```

Zależności między pakietami są jednokierunkowe:

```
@validuo/app ──► @validuo/ui
      │
      ├────────► @validuo/db ──► @validuo/core
      │                               ▲
      └───────────────────────────────┘
```

- `core` nie zależy od żadnego pakietu workspace, Reacta, Next.js ani MikroORM. Usługi dostają porty repozytoriów, nie `EntityManager`.
- `db` implementuje porty z `core` i niczego nie wie o Next.js ani UI.
- `ui` jest samodzielną biblioteką komponentów React — dostaje dane i callbacki przez propsy.
- `app` składa wszystko w całość: sesja, HTTP, strony, adaptery integracji, kontener DI.

Granice wymusza ESLint (`no-restricted-imports` w `eslint.config.mjs`), łącznie z zakazem importu `awilix` poza `@validuo/core/di` i importów względnych do cudzego `src`. Pakiety nie mają kroku budowania — `exports` wskazuje pliki TypeScript, a Turbopack je transpiluje. Foldery domen (`services/employees`, `repositories/groups`, `features/…`) powstają razem z pierwszą funkcją, która ich potrzebuje.

### Aplikacja: frontend i backend

| Grupa tras | URL | UI |
| --- | --- | --- |
| `(frontend)` | `/`, strony publiczne | Własny wygląd budowany **klasami Tailwind**, bez komponentów shadcn |
| `(backend)/backend` | `/backend` | Panel budowany z **komponentów shadcn/ui** z `@validuo/ui` |
| `api/` | `/api/*` | Route handlers, np. `GET /api/health` |

Obie grupy korzystają z tego samego wejścia Tailwinda i tokenów motywu (`packages/ui/src/styles/globals.css`). Panel `/backend` nie ma jeszcze uwierzytelniania (osobna specyfikacja).

### API

Route Handlers owija `apiHandler` (`packages/app/src/server/http/api-handler.ts`): osobny scope DI na żądanie, identyfikator `x-request-id`, `cache-control: no-store` i odpowiedź w formacie `ApiResult`:

```ts
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]>; requestId?: string } };
```

Błędy domenowe (`@validuo/core/errors`) mapowane są na statusy: `Unauthorized` 401, `Forbidden` 403, `NotFound` 404, `Validation` 422, `Conflict` i `PlanLimit` 409. Błędy transportu (`HttpError`, np. 503) mają własny status, a każdy inny błąd daje 500 z neutralnym komunikatem — szczegóły trafiają wyłącznie do logu JSON.

```ts
import { apiHandler } from "@/server/http/api-handler";

export const GET = apiHandler("groups.list", async ({ scope, logger }) => {
  const groups = await scope.resolve("groupService").list(/* zaufany kontekst aktora */);
  return { data: groups };
});
```

### Dependency Injection

Kontener Awilix działa w trybie `PROXY` i `strict`. Pakiety eksportują typ fragmentu cradle i rejestracje (`dbRegistrations(config): Registrations<DbCradle>`), a **composition root** (`packages/app/src/server/container.ts`) składa je w `Registrations<AppCradle>` — brak lub zły typ rejestracji to błąd kompilacji.

- `getContainer()` — kontener główny tworzony leniwie raz na proces (w `globalThis`, żeby HMR nie mnożył pul połączeń);
- `withRequestScope(fn)` — scope na jedno żądanie / server action / zadanie, zwalniany w `finally`.

### Warstwa danych

- **Konfiguracja**: `createOrmConfig(database)` (`packages/db/src/config.ts`) na zwalidowanej konfiguracji. ORM powstaje raz na proces i łączy się leniwie przy pierwszym zapytaniu.
- **Encje** definiujemy bez dekoratorów przez `defineEntity`, jedna na plik (`entities/<domena>/<nazwa>.entity.ts`). Każdą encję trzeba dopisać do jawnej listy w `packages/db/src/entities/index.ts`.
- **Migracje** generuje i stosuje CLI MikroORM (`packages/db/src/mikro-orm.config.ts`); pliki leżą w `packages/db/src/migrations` razem ze snapshotem schematu. CLI łączy się kontem migracyjnym `MIGRATION_DATABASE_URL` (domyślnie `DATABASE_URL`), dzięki czemu konto runtime może mieć minimalne prawa.
- **Integracja z Next.js**: pakiety MikroORM są w `serverExternalPackages`; `@validuo/db` używamy wyłącznie w kodzie serwerowym.

### Zmienne środowiskowe

Pliki `.env*` leżą w **katalogu głównym**. Ładuje je jeden loader (`loadRootEnv()` z `@validuo/core/config/load-env`, na bazie `@next/env`) — w `next.config.ts` i w narzędziach DB — a waliduje `parseServerEnv()` (Zod). Serwer sprawdza konfigurację przy starcie (`src/instrumentation.ts`); `next build` jej nie potrzebuje. Wzór: `.env.example`.

| Zmienna | Wymagana | Opis |
| --- | --- | --- |
| `DATABASE_URL` | tak | Adres PostgreSQL dla runtime (konto o minimalnych prawach), `postgres://…` |
| `DB_POOL_MIN` / `DB_POOL_MAX` | nie | Rozmiar puli połączeń (domyślnie `0` / `10`) |
| `DB_DEBUG` | nie | `true` włącza logowanie zapytań SQL |
| `MIGRATION_DATABASE_URL` | nie | Konto migracyjne (właściciel tabel) dla CLI MikroORM; domyślnie `DATABASE_URL` |
| `TEST_DATABASE_URL` | nie | Tylko dla testów bez Dockera: baza z `test` w nazwie, różna od `DATABASE_URL` (domyślnie testy startują PostgreSQL przez testcontainers) |

## Uruchomienie

Wymagania: Node.js 24, npm 11, PostgreSQL 17.

```bash
npm install
cp .env.example .env          # uzupełnij DATABASE_URL
npm run db:migrate            # zastosuj migracje
npm run dev                   # http://localhost:3000
```

- `/` to strona publiczna (Tailwind),
- `/backend` to panel (shadcn/ui) ze stanem połączenia z bazą,
- `/api/health` zwraca `200 {"ok":true,"data":{"status":"ok","db":"ok"}}`, a gdy baza jest niedostępna: `503` z kodem `ServiceUnavailable`.

## Skrypty

Uruchamiaj je z katalogu głównego.

| Polecenie | Opis |
| --- | --- |
| `npm run dev` | Serwer deweloperski (argumenty po `--`, np. `npm run dev -- --port 4000`) |
| `npm run build` | Build produkcyjny aplikacji |
| `npm start` | Start zbudowanej aplikacji |
| `npm run lint` | ESLint dla całego repozytorium |
| `npm run format` / `npm run format:check` | Prettier: formatowanie / sprawdzenie |
| `npm run typecheck` | Sprawdzenie typów w każdym pakiecie |
| `npm run test:unit` (`npm test`) | Testy jednostkowe z pokryciem — błąd poniżej 100% |
| `npm run test:integration` | Testy integracyjne na PostgreSQL 17 z testcontainers (`*.integration.test.ts`) |
| `npm run test:e2e` | Scenariusze agent-browser na tymczasowej instancji aplikacji (po `npm run build`) |
| `npm run app:ephemeral` | Tymczasowa baza + aplikacja do ręcznych/agentowych testów przez agent-browser |
| `npm run db:migration:create` | Nowa migracja na podstawie zmian w encjach |
| `npm run db:migrate` | Zastosowanie oczekujących migracji |
| `npm run db:migration:down` | Cofnięcie ostatniej migracji |
| `npm run db:migration:list` | Lista wykonanych migracji |
| `npm run db -- <komenda>` | Dowolna komenda CLI MikroORM, np. `npm run db -- debug` |

CI (`.github/workflows/ci.yml`) uruchamia dla każdego pull requesta cztery checki: **Lint** (ESLint, Prettier, typecheck), **Unit tests** (próg 100% pokrycia), **Build** i **Integration tests** (PostgreSQL z testcontainers, migracje, scenariusze agent-browser na tymczasowej instancji aplikacji).

### Testy

- **Każda nowa funkcja musi mieć 100% pokrycia testami jednostkowymi** (zasada z `AGENTS.md`, wymuszana przez `npm run test:unit` i CI).
- Integracja i E2E potrzebują Dockera (testcontainers). Bez Dockera wskaż jednorazową bazę:

```bash
createdb validuo_test
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/validuo_test npm run test:integration
```

  Baza musi mieć `test` w nazwie i różnić się od `DATABASE_URL` — testy nigdy nie korzystają z `DATABASE_URL`.
- E2E i testy ręczne przez [agent-browser](https://github.com/vercel-labs/agent-browser):

```bash
npx agent-browser install       # Chrome for Testing (Linux: --with-deps)
npm run build
npm run test:e2e                # scenariusze z packages/app/e2e
npm run app:ephemeral           # tymczasowa instancja; potem np. npx agent-browser --session s open <url>
```

## Typowe zadania

**Nowa funkcja** — procedura z rozdz. 8 standardu: schemat wejścia (`core/src/validators/<domena>/`), przypadek użycia w `core/src/services/<domena>/` na portach, adapter w `db/src/repositories/<domena>/`, rejestracja w composition root, Route Handler przez `apiHandler` lub Server Action, UI z istniejących prymitywów, testy reguł, izolacji dostępu i zachowania.

**Nowa encja i migracja.** Utwórz `packages/db/src/entities/groups/group.entity.ts`:

```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const GroupSchema = defineEntity({
  name: "Group",
  tableName: "groups",
  properties: {
    id: p.uuid().primary().onCreate(() => crypto.randomUUID()),
    organizationId: p.uuid(),
    name: p.string(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type Group = InferEntity<typeof GroupSchema>;
```

Dopisz `GroupSchema` do listy w `packages/db/src/entities/index.ts`, uruchom `npm run db:migration:create`, przejrzyj wygenerowany SQL (uzupełnij FK, indeksy i constraints zakresu tenantów), wykonaj `npm run db:migrate` na lokalnej bazie i commituj migrację razem z `.snapshot.json`. Nazwę tabeli w liczbie mnogiej podawaj jawnie (`tableName`).

**Nowa rejestracja w DI.** Klasa lub fabryka deklaruje tylko potrzebne zależności (`constructor({ groupRepository }: { groupRepository: GroupRepository })`). Dodaj klucz do `AppCradle` i resolver (z właściwym cyklem życia, zwykle `.scoped()`) w `buildContainer()` w `packages/app/src/server/container.ts`.

**Nowy komponent shadcn.** `npx shadcn add <komponent> -c packages/app` w katalogu głównym. Komponent trafi do `packages/ui/src/components/` i importuje się go jako `@validuo/ui/components/<komponent>`.

## Praca z agentami AI

Zasady dla agentów kodujących są w `AGENTS.md`: główny plik opisuje architekturę i proces, a pliki w każdym pakiecie dodają szczegóły. Katalog `.ai/` zawiera specyfikacje (`specs/`), logi przebiegów (`runs/`) i wnioski (`lessons.md`).
