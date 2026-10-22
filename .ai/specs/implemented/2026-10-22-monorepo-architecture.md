# Monorepo i architektura bazowa Validuo

## Cel

Przekształcić starter Next.js w monorepo aplikacji **Validuo** z czterema pakietami (`app`, `core`, `db`, `ui`), z działającym szkieletem stosu: Next.js + React + TypeScript, PostgreSQL + MikroORM (migracje, pula połączeń), Awilix (DI), Tailwind (frontend) i shadcn/ui (backend). Spisać założenia w `AGENTS.md` i opisać architekturę w `README.md`.

## Kontekst

- Repo zawiera starter `create-next-app` (Next 16.3.4, React 19.2.8) w `src/`, bez Tailwinda i bez bazy.
- Środowisko udostępnia PostgreSQL 17 i zmienną `DATABASE_URL` (baza `open-mercato`).
- Podgląd (`openmercato.toml`) uruchamia `npm run dev -- --hostname 0.0.0.0 --port 3000` w katalogu głównym — skrypt `dev` w root musi przekazywać argumenty do pakietu `app`.
- `next dev` dopisuje blok `nextjs-agent-rules` do `AGENTS.md` w katalogu projektu Next.js — po przeniesieniu aplikacji będzie to `packages/app/AGENTS.md`, więc ten plik musi już zawierać blok.

## Zakres

### Narzędzia i wersje
- npm workspaces (`packages/*`), bez dodatkowego orkiestratora (Turbo itp.) — można dodać później.
- Aktualizacja do najnowszych stabilnych: Next 16.4.x, React 19.3.x, eslint-config-next 16.4.x. TypeScript zostaje na 5.x (7.x to natywny port, którego Next nie wspiera jeszcze oficjalnie przy type-checku).
- MikroORM 7.x (`@mikro-orm/postgresql`, `@mikro-orm/migrations`, `@mikro-orm/cli`), Awilix 13.x, Tailwind 4.x (`@tailwindcss/postcss`), shadcn 4.x (styl `radix-nova`, `radix-ui`, `lucide-react`).
- Wszystkie pakiety: `"type": "module"`, `private`, TypeScript bez kroku budowania (eksporty wskazują na pliki `.ts`/`.tsx`; Turbopack transpiluje pakiety workspace automatycznie).
- Wspólny `tsconfig.base.json` w root, jedna konfiguracja ESLint w root.

### Pakiety
| Pakiet | Nazwa | Rola | Może zależeć od |
| --- | --- | --- | --- |
| `packages/core` | `@validuo/core` | kod wielokrotnego użytku bez zależności od frameworka: DI (Awilix), konfiguracja/env, błędy, typy | — |
| `packages/db` | `@validuo/db` | MikroORM: konfiguracja, encje, migracje, CLI, rejestracja w DI | `core` |
| `packages/ui` | `@validuo/ui` | shadcn/ui, `cn`, globalny CSS i motyw Tailwind | — |
| `packages/app` | `@validuo/app` | Next.js App Router: strony, route handlers, server actions, composition root DI | `core`, `db`, `ui` |

### Aplikacja
- Grupy tras: `src/app/(frontend)` — strony publiczne stylowane Tailwindem; `src/app/(backend)/backend` — panel zaplecza zbudowany z komponentów shadcn z `@validuo/ui`.
- `src/app/api/health/route.ts` — sprawdzenie zdrowia (aplikacja + połączenie z bazą).
- Composition root: `src/server/container.ts` (`server-only`) — buduje kontener Awilix raz na proces (cache w `globalThis` dla HMR), rejestruje moduły `core` i `db`; per-request scope z rozwidlonym `EntityManager`.

### Baza
- Konfiguracja z `DATABASE_URL`, pula połączeń konfigurowalna (`DB_POOL_MIN`/`DB_POOL_MAX`).
- Encje definiowane bez dekoratorów (`defineEntity`), lista encji jawnie w `src/entities/index.ts` (bez skanowania plików — działa w bundlu Next.js).
- Migracje w `packages/db/src/migrations`, skrypty `db:migration:create`, `db:migrate`, `db:migration:list`, `db:migration:down` w root.
- Brak encji domenowych na start (domena nie jest jeszcze zdefiniowana).

### Dokumentacja
- `AGENTS.md` (root): sekcja architektury i zasad monorepo + aktualizacja kroków weryfikacji (`npm run typecheck` zamiast `npx tsc --noEmit` w root).
- `packages/*/AGENTS.md` + `CLAUDE.md` (`@AGENTS.md`): krótkie, specyficzne dla pakietu zasady; w `packages/app/AGENTS.md` blok `nextjs-agent-rules`.
- `README.md`: opis Validuo, architektura, struktura, uruchomienie, skrypty.
- `.env.example` z `DATABASE_URL`.

## Poza zakresem
- Encje domenowe, uwierzytelnianie, autoryzacja panelu `/backend`.
- Testy jednostkowe/E2E (do osobnej specyfikacji).
- CI, Docker, deployment.

## Kryteria akceptacji
1. `npm install` w root instaluje wszystkie pakiety; brak `src/` w root.
2. `npm run lint`, `npm run typecheck` i `npm run build` przechodzą.
3. `npm run dev -- --hostname 0.0.0.0 --port 3000` w root uruchamia aplikację; `/` (Tailwind) i `/backend` (shadcn) renderują się poprawnie, style z `@validuo/ui` są wygenerowane.
4. `GET /api/health` zwraca `200` i `db: "ok"` przy działającej bazie oraz `503` przy niedostępnej.
5. `npm run db:migration:list` działa z CLI MikroORM; `db:migration:create` generuje migrację w `packages/db/src/migrations` (sprawdzone na tymczasowej encji, potem usuniętej).
6. `npx shadcn add <komponent> -c packages/app` instaluje komponent do `packages/ui`.
7. `AGENTS.md` i `README.md` opisują architekturę i zasady.

## Plan implementacji
1. Research API MikroORM 7 / Awilix 13 / szablonu monorepo shadcn (wygenerowany referencyjnie w `/tmp`).
2. Przeniesienie aplikacji do `packages/app`, utworzenie `core`, `db`, `ui`, root `package.json` z workspaces i skryptami.
3. Konfiguracja TS, ESLint, PostCSS/Tailwind, shadcn (`components.json` w `app` i `ui`).
4. DI + MikroORM + health check.
5. Strony `(frontend)` i `(backend)`.
6. Dokumentacja, weryfikacja (lint, typecheck, build, dev, migracje), wnioski w `.ai/lessons.md`.

## Ustalenia z implementacji (2026-10-22)
- `/api/health` nie zwraca treści błędu (endpoint publiczny) — szczegóły trafiają do logu serwera; panel `/backend` pokazuje przyczynę.
- Dodano `checkDatabase(orm)` w `@validuo/db`, bo `orm.checkConnection()` przy leniwym połączeniu zawsze zwraca błąd przed pierwszym zapytaniem.
- Snapshot migracji ma stałą nazwę `.snapshot.json` (domyślna zawierała nazwę bazy); ścieżki migracji są absolutne.
- Skrypty `build`/`start` wymuszają `NODE_ENV=production` (sandbox ma globalnie `NODE_ENV=development`).
- Reguła „frontend bez komponentów shadcn” jest egzekwowana przez ESLint.
- Root nie ma `tsconfig.json`; typy sprawdza `npm run typecheck` per pakiet.
- Weryfikacja UI: odpowiedzi HTTP i wygenerowany HTML/CSS; wizualnie nie sprawdzono (brak bibliotek systemowych dla Chromium w sandboxie).
