# Validuo

Validuo to aplikacja webowa zbudowana na Next.js, React i TypeScript, z bazą PostgreSQL obsługiwaną przez MikroORM. Kod jest zorganizowany jako monorepo (npm workspaces) z wyraźnym podziałem na aplikację i pakiety wielokrotnego użytku.

## Stos technologiczny

| Obszar | Technologia |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack), [React 19](https://react.dev) |
| Język | [TypeScript 5](https://www.typescriptlang.org) (`strict`) |
| Baza danych | [PostgreSQL](https://www.postgresql.org) |
| ORM | [MikroORM 7](https://mikro-orm.io): encje, migracje, pula połączeń, Unit of Work |
| Dependency Injection | [Awilix 13](https://github.com/jeffijoe/awilix) |
| Style (frontend) | [Tailwind CSS 4](https://tailwindcss.com) |
| Komponenty (backend) | [shadcn/ui](https://ui.shadcn.com) (Radix UI, lucide-react) |
| Monorepo | npm workspaces |

## Architektura

### Pakiety

```
packages/
├── app/   @validuo/app   Aplikacja Next.js: trasy, strony, route handlers, composition root DI
├── core/  @validuo/core  Części wielokrotnego użytku bez frameworka: kontener DI, env, błędy
├── db/    @validuo/db    Warstwa danych: konfiguracja MikroORM, encje, migracje, moduł DI
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

- `core` nie zależy od żadnego pakietu workspace ani od React/Next.js. To fundament współdzielony przez resztę.
- `db` korzysta z `core` (DI, odczyt env) i niczego nie wie o Next.js.
- `ui` jest samodzielną biblioteką komponentów React.
- `app` składa wszystko w całość i jako jedyny pakiet zależy od Next.js.

Granice wymusza ESLint (`no-restricted-imports` w `eslint.config.mjs`): pakiety współdzielone nie mogą importować z `@validuo/app` ani z `next`, a `core` nie może importować innych pakietów, Reacta ani Next.js.

Pakiety nie mają kroku budowania. Pole `exports` w ich `package.json` wskazuje bezpośrednio pliki źródłowe TypeScript, a Turbopack transpiluje pakiety workspace automatycznie. Wspólne ustawienia kompilatora są w `tsconfig.base.json`.

### Aplikacja: frontend i backend

Aplikacja (`packages/app/src/app`) ma jeden root layout i dwie grupy tras o różnym podejściu do UI:

| Grupa tras | URL | UI |
| --- | --- | --- |
| `(frontend)` | `/`, strony publiczne | Własny wygląd budowany **klasami Tailwind**, bez komponentów shadcn |
| `(backend)/backend` | `/backend` | Panel zaplecza budowany z **komponentów shadcn/ui** z `@validuo/ui` |
| `api/` | `/api/*` | Route handlers, np. `GET /api/health` |

Obie grupy korzystają z tego samego wejścia Tailwinda i tokenów motywu (`packages/ui/src/styles/globals.css`), więc kolory, promienie i typografia są spójne w całej aplikacji. Panel `/backend` nie ma jeszcze uwierzytelniania.

### Dependency Injection

Kontener Awilix działa w trybie `PROXY` (zależności wstrzykiwane jako obiekt, odporne na minifikację) i `strict` (wykrywa błędne cykle życia, np. singleton zależny od zależności `scoped`).

- `@validuo/core/di` udostępnia `createAppContainer()`, interfejs `Cradle` i typ `DiModule`.
- Każdy pakiet eksportuje własny moduł DI i rozszerza `Cradle` przez declaration merging. Dzięki temu `container.resolve("orm")` jest w pełni typowane. Przykład: `dbModule` w `packages/db/src/di.ts` rejestruje `orm` (singleton) i `em` (`EntityManager` rozwidlany per scope).
- **Composition root** to `packages/app/src/server/container.ts`:
  - `getContainer()` to kontener główny, tworzony raz na proces i przechowywany w `globalThis`, żeby HMR nie mnożył pul połączeń;
  - `withRequestScope(fn)` tworzy scope na jedno żądanie lub jedną server action i zwalnia go po zakończeniu.

```ts
import { withRequestScope } from "@/server/container";

export async function GET() {
  return withRequestScope(async (scope) => {
    const em = scope.resolve("em"); // osobny EntityManager dla tego żądania
    // ...
    return Response.json({ ok: true });
  });
}
```

### Warstwa danych

- **Konfiguracja**: `createOrmConfig()` (`packages/db/src/config.ts`) czyta `DATABASE_URL`, rozmiar puli (`DB_POOL_MIN`/`DB_POOL_MAX`) i `DB_DEBUG`. ORM powstaje raz na proces i łączy się leniwie przy pierwszym zapytaniu.
- **Encje** definiujemy bez dekoratorów, przez `defineEntity` z `@mikro-orm/core`. Każdą encję trzeba dopisać do jawnej listy w `packages/db/src/entities/index.ts`, bo skanowanie katalogów nie działa w bundlu Next.js.
- **Migracje** leżą w `packages/db/src/migrations` razem ze snapshotem schematu. Generuje je i uruchamia CLI MikroORM (`packages/db/src/mikro-orm.config.ts`), a pliki TypeScript ładuje `tsx`.
- **Integracja z Next.js**: pakiety MikroORM są w `serverExternalPackages`, więc Node ładuje je bezpośrednio, a bundler ich nie pakuje. `@validuo/db` używamy wyłącznie w kodzie serwerowym.

### Zmienne środowiskowe

Pliki `.env*` leżą w **katalogu głównym** repozytorium. Ładują je zarówno Next.js (`packages/app/next.config.ts`), jak i CLI MikroORM, w obu przypadkach przez `@next/env`, więc obowiązują te same reguły (`.env`, `.env.local`, `.env.development` itd.). Wzór jest w `.env.example`.

| Zmienna | Wymagana | Opis |
| --- | --- | --- |
| `DATABASE_URL` | tak | Adres PostgreSQL, np. `postgres://user:pass@localhost:5432/validuo` |
| `DB_POOL_MIN` / `DB_POOL_MAX` | nie | Rozmiar puli połączeń (domyślnie `0` / `10`) |
| `DB_DEBUG` | nie | `true` włącza logowanie zapytań SQL |

## Uruchomienie

Wymagania: Node.js 24+, npm 11+, PostgreSQL.

```bash
npm install
cp .env.example .env          # uzupełnij DATABASE_URL
npm run db:migrate            # zastosuj migracje
npm run dev                   # http://localhost:3000
```

- `/` to strona publiczna (Tailwind),
- `/backend` to panel (shadcn/ui) ze stanem połączenia z bazą,
- `/api/health` zwraca `200 {"status":"ok","db":"ok"}`, a gdy baza jest niedostępna: `503`.

## Skrypty

Uruchamiaj je z katalogu głównego.

| Polecenie | Opis |
| --- | --- |
| `npm run dev` | Serwer deweloperski (argumenty po `--`, np. `npm run dev -- --port 4000`) |
| `npm run build` | Build produkcyjny aplikacji |
| `npm start` | Start zbudowanej aplikacji |
| `npm run lint` | ESLint dla całego repozytorium |
| `npm run typecheck` | Sprawdzenie typów w każdym pakiecie |
| `npm run db:migration:create` | Nowa migracja na podstawie zmian w encjach |
| `npm run db:migrate` | Zastosowanie oczekujących migracji |
| `npm run db:migration:down` | Cofnięcie ostatniej migracji |
| `npm run db:migration:list` | Lista wykonanych migracji |
| `npm run db -- <komenda>` | Dowolna komenda CLI MikroORM, np. `npm run db -- debug` |

## Typowe zadania

**Nowa encja.** Utwórz `packages/db/src/entities/<nazwa>.entity.ts`:

```ts
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const ProjectSchema = defineEntity({
  name: "Project",
  properties: {
    id: p.uuid().primary().onCreate(() => crypto.randomUUID()),
    name: p.string(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type Project = InferEntity<typeof ProjectSchema>;
```

Następnie dopisz `ProjectSchema` do listy w `entities/index.ts`, uruchom `npm run db:migration:create`, przejrzyj wygenerowany SQL i wykonaj `npm run db:migrate`.

**Nowy serwis w DI.** Zdefiniuj klasę lub fabrykę, która przyjmuje zależności z cradle (`constructor({ em }: Pick<Cradle, "em">)`). Zarejestruj ją w module DI (`DiModule`) z odpowiednim cyklem życia i rozszerz `Cradle`. Moduł dodaj do listy w `packages/app/src/server/container.ts`.

**Nowy komponent shadcn.** Uruchom w katalogu głównym `npx shadcn@latest add <komponent> -c packages/app`. Komponent trafi do `packages/ui/src/components/`, a importuje się go jako `@validuo/ui/components/<komponent>`.

## Praca z agentami AI

Zasady dla agentów kodujących są w `AGENTS.md`: główny plik opisuje architekturę i proces, a pliki w każdym pakiecie dodają szczegóły. Katalog `.ai/` zawiera specyfikacje (`specs/`), logi przebiegów (`runs/`) i wnioski (`lessons.md`).
