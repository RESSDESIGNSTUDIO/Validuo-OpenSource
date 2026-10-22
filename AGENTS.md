<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Validuo — architektura i założenia

Validuo to aplikacja webowa w monorepo (npm workspaces). Poniższe założenia są **obowiązujące**. Zmiana któregokolwiek z nich (inna biblioteka, inny podział pakietów, inny kierunek zależności) wymaga najpierw specyfikacji w `.ai/specs/` i akceptacji człowieka.

## Stos technologiczny

| Obszar | Technologia | Uwagi |
| --- | --- | --- |
| Framework | **Next.js 16.4** (App Router, Turbopack) + **React 19.3** | Tylko App Router. Przed użyciem API Next.js czytaj `node_modules/next/dist/docs/`. |
| Język | **TypeScript 5.x**, `strict` | Nie podbijaj do TS 6.1+/7 — `typescript-eslint` (przez `eslint-config-next`) ich jeszcze nie wspiera. |
| Baza danych | **PostgreSQL** | Adres w `DATABASE_URL`. |
| ORM | **MikroORM 7** (`@mikro-orm/postgresql`) | Migracje, pula połączeń, Unit of Work. Nie dodawaj innego ORM ani query buildera (Prisma, Drizzle, surowy `pg`). |
| DI | **Awilix 13** | Jedyny kontener DI. Bez singletonów modułowych i ręcznego „service locatora”. |
| CSS — frontend | **Tailwind CSS 4** | Strony publiczne stylowane wyłącznie klasami Tailwind. |
| UI — backend | **shadcn/ui** (styl `radix-nova`, Radix UI, lucide-react) | Panel zaplecza składany z komponentów shadcn z `@validuo/ui`. |
| Menedżer pakietów | **npm** (workspaces) | Nie zmieniaj na pnpm/yarn/bun. Jeden `package-lock.json` w root. |

## Struktura monorepo

```
.
├── packages/
│   ├── app/    @validuo/app  — aplikacja Next.js (trasy, strony, route handlers, composition root DI)
│   ├── core/   @validuo/core — części wielokrotnego użytku bez frameworka (DI, env, błędy)
│   ├── db/     @validuo/db   — MikroORM: konfiguracja, encje, migracje, moduł DI
│   └── ui/     @validuo/ui   — komponenty shadcn/ui, `cn`, motyw i globalny CSS Tailwind
├── tsconfig.base.json        — wspólna konfiguracja TypeScript
├── eslint.config.mjs         — jedna konfiguracja ESLint dla całego repo (w tym granice pakietów)
└── .env.example              — wzór zmiennych środowiskowych (pliki .env* trzymamy w root)
```

Każdy pakiet ma własny `AGENTS.md` ze szczegółowymi zasadami — przeczytaj go przed zmianami w danym pakiecie.

## Kierunek zależności między pakietami

```
app ──► core, db, ui
db  ──► core
ui  ──► (brak pakietów workspace)
core ──► (brak pakietów workspace; bez React i Next.js)
```

- Pakiety współdzielone (`core`, `db`, `ui`) **nigdy** nie importują z `@validuo/app` ani z `next`. ESLint (`no-restricted-imports`) to wymusza — nie wyłączaj tej reguły.
- Cykle zależności są zabronione. Jeśli dwa pakiety potrzebują wspólnego kodu, przenieś go do `core`.
- Pakiety nie mają kroku budowania: pole `exports` w `package.json` wskazuje bezpośrednio pliki `.ts`/`.tsx`, a Turbopack transpiluje je automatycznie. Nowy publiczny moduł pakietu = nowy wpis w `exports`. Importuj tylko przez publiczne ścieżki (`@validuo/db`, `@validuo/core/di`, `@validuo/ui/components/button`), nigdy przez ścieżki względne do innego pakietu.
- Zależności npm instaluj w pakiecie, który ich używa: `npm install <pkg> -w @validuo/<pakiet>`. W root tylko narzędzia całego repo (ESLint, TypeScript, `@types/node`).
- Nowy pakiet: katalog `packages/<nazwa>`, nazwa `@validuo/<nazwa>`, `"type": "module"`, `"private": true`, `tsconfig.json` rozszerzający `../../tsconfig.base.json`, skrypt `typecheck`, własne `AGENTS.md` + `CLAUDE.md` (`@AGENTS.md`). Zaktualizuj ten plik, `README.md` i reguły granic w `eslint.config.mjs`.

## Dependency Injection (Awilix)

- Kontener tworzy `createAppContainer()` z `@validuo/core/di`: tryb `PROXY` (zależności wstrzykiwane jako obiekt, odporne na minifikację) i `strict: true` (Awilix wykrywa m.in. singleton zależny od zależności `scoped`).
- Typy rejestracji opisuje interfejs `Cradle` z `@validuo/core/di`. Każdy pakiet/moduł rozszerza go przez declaration merging (`declare module "@validuo/core/di" { interface Cradle { ... } }`) i eksportuje funkcję `DiModule` rejestrującą swoje zależności (wzór: `packages/db/src/di.ts`).
- Klasy i fabryki przyjmują zależności z cradle: `constructor({ em }: Pick<Cradle, "em">)` / `asFunction(({ orm }) => ...)`. Nie importuj instancji serwisów bezpośrednio.
- **Composition root** jest jeden: `packages/app/src/server/container.ts`. Tylko tam składa się listę modułów. `getContainer()` daje kontener główny (singletony na proces); `withRequestScope(fn)` tworzy scope na jedno żądanie / jedną server action i zwalnia go po zakończeniu.
- Cykle życia: `singleton` — bezstanowe lub kosztowne zasoby (ORM, klienci zewnętrznych API); `scoped` — wszystko, co korzysta z `em` lub danych żądania; `transient` — tylko gdy naprawdę potrzebna nowa instancja przy każdym rozwiązaniu.
- Kontener i serwisy są wyłącznie serwerowe (`import "server-only"` w kodzie aplikacji). Nigdy nie importuj ich w Client Components.

## Baza danych (MikroORM)

- Encje definiujemy **bez dekoratorów** przez `defineEntity` + `p` z `@mikro-orm/core` (bez `reflect-metadata`), po jednej na plik: `packages/db/src/entities/<nazwa>.entity.ts`. Typ encji: `InferEntity<typeof XSchema>`. Każdą encję dopisz do jawnej listy w `packages/db/src/entities/index.ts` — skanowanie katalogów nie działa w bundlu Next.js.
- Schemat zmieniamy **wyłącznie migracjami**: `npm run db:migration:create` → przejrzyj wygenerowany SQL → `npm run db:migrate`. Commituj migracje razem z `packages/db/src/migrations/.snapshot.json`. Nie edytuj migracji już zastosowanych na współdzielonych środowiskach — dodaj nową.
- **Nigdy** nie uruchamiaj `schema:update --run`, `schema:fresh`, `schema:drop` ani `migration:fresh` na współdzielonej bazie. W MikroORM 7 `schema.update()` domyślnie **usuwa tabele, których nie zna**. Eksperymenty rób na osobnej, tymczasowej bazie (`createdb`/`initdb`), a skrypty testowe nigdy nie mogą mieć „fallbacku” na `process.env.DATABASE_URL`.
- Pracuj na `em` z bieżącego scope (rozwidlony `EntityManager`), nie na globalnym `orm.em`.
- Konfiguracja wyłącznie przez env (`DATABASE_URL`, `DB_POOL_MIN`, `DB_POOL_MAX`, `DB_DEBUG`) — patrz `.env.example`. ORM tworzony jest raz na proces (singleton w DI) i łączy się leniwie przy pierwszym zapytaniu.
- Stan połączenia sprawdzaj przez `checkDatabase(orm)` z `@validuo/db` — `orm.checkConnection()` zwraca „Connection not established” do czasu pierwszego zapytania.
- `@validuo/db` importuj tylko w kodzie serwerowym. Pakiety MikroORM są w `serverExternalPackages` (`packages/app/next.config.ts`) — nowe pakiety `@mikro-orm/*` dopisz tam również.

## UI: frontend (Tailwind) i backend (shadcn/ui)

- **Frontend** — grupa tras `packages/app/src/app/(frontend)`: strony publiczne stylowane wyłącznie klasami Tailwind (można używać tokenów motywu, np. `bg-background`, `text-muted-foreground`). **Nie** importuj tam komponentów z `@validuo/ui/components/*`.
- **Backend** — grupa tras `packages/app/src/app/(backend)/backend` (URL `/backend`): panel zaplecza składany z komponentów shadcn/ui z `@validuo/ui`. Własny układ ograniczaj do kompozycji komponentów i klas pomocniczych Tailwind.
- Komponenty shadcn dodajemy CLI z katalogu głównego: `npx shadcn@latest add <komponent> -c packages/app` — trafiają do `packages/ui/src/components/`. Nie kopiuj ich ręcznie z dokumentacji.
- Importy: `@validuo/ui/components/<nazwa>`, `@validuo/ui/lib/utils` (`cn`), `@validuo/ui/hooks/<nazwa>`.
- Motyw (tokeny CSS shadcn), `@import "tailwindcss"` i `@source` dla pakietu `ui` są w jednym miejscu: `packages/ui/src/styles/globals.css`. Aplikacja importuje go w `packages/app/src/app/globals.css`. Nie twórz drugiego wejścia Tailwinda.
- Komponenty specyficzne dla aplikacji: `packages/app/src/components/`; komponenty wielokrotnego użytku: `@validuo/ui`.
- Domyślnie Server Components; `"use client"` tylko tam, gdzie potrzebna jest interakcja lub hooki przeglądarki.

## Aplikacja Next.js (`packages/app`)

- `src/app/` — trasy (App Router); `src/server/` — kod tylko serwerowy (zaczyna się od `import "server-only"`); `src/components/` — komponenty aplikacji. Alias `@/*` → `packages/app/src/*` (tylko w `app`).
- Strony i route handlers są cienkie: walidacja wejścia, wywołanie serwisu z kontenera DI, zwrócenie odpowiedzi. Logika biznesowa należy do serwisów rejestrowanych w DI.
- Strony czytające bazę muszą być renderowane na żądanie (np. `await connection()` z `next/server`), inaczej build spróbuje je prerenderować.
- `next.config.ts` jest kompilowany przez Next.js do CommonJS — z pakietów CJS (np. `@next/env`) importuj tam nazwami, nie domyślnie.

## Polecenia (uruchamiaj z katalogu głównego)

| Polecenie | Opis |
| --- | --- |
| `npm run dev` | Serwer deweloperski Next.js (`packages/app`). Argumenty przekazuj po `--`. |
| `npm run build` / `npm start` | Build i start produkcyjny (wymuszają `NODE_ENV=production`). |
| `npm run lint` | ESLint dla całego repo. |
| `npm run typecheck` | `tsc --noEmit` w każdym pakiecie (w `app` poprzedzone `next typegen`). |
| `npm run db:migration:create` | Generuje migrację z różnicy encji i snapshotu. |
| `npm run db:migrate` / `npm run db:migration:down` | Stosuje / cofa migracje. |
| `npm run db:migration:list` | Lista wykonanych migracji. |
| `npm run db -- <komenda>` | Dowolna komenda CLI MikroORM (np. `debug`, `migration:pending`). |

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
- Przy większych zmianach zleć niezależny przegląd planu (np. subagentowi w roli senior/staff engineera) przed rozpoczęciem implementacji.

### Weryfikacja
- Nie uznawaj zadania za skończone bez weryfikacji. Minimum to `npm run lint` i `npm run typecheck` (`tsc --noEmit` w każdym pakiecie — w root nie ma `tsconfig.json`, więc samo `npx tsc --noEmit` nic nie sprawdzi), a przy zmianach w routingu, konfiguracji, zależnościach lub buildzie także `npm run build`.
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
