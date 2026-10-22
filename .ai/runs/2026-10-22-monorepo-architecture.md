# 2026-10-22 — Monorepo i architektura bazowa Validuo

## Cel
Przekształcenie startera Next.js w monorepo `packages/{app,core,db,ui}` ze stosem Next.js + MikroORM/PostgreSQL + Awilix + Tailwind/shadcn, spisanie założeń w `AGENTS.md` i opis architektury w `README.md`. Specyfikacja: `.ai/specs/implemented/2026-10-22-monorepo-architecture.md`.

## Kroki i decyzje
- Research API MikroORM 7 / Awilix 13 delegowany subagentowi; referencyjny monorepo shadcn wygenerowany w `/tmp` (`shadcn init -t next --monorepo`) i użyty jako wzór konfiguracji.
- npm workspaces bez Turbo; pakiety bez kroku budowania; wspólny `tsconfig.base.json`, jeden ESLint z regułami granic pakietów.
- Next 16.3.4 → 16.4.2, React 19.2.8 → 19.3.1, ESLint 9 → 10; TypeScript zostaje na 5.9 (typescript-eslint nie wspiera 6.1+/7).
- Encje przez `defineEntity` (bez dekoratorów), jawna lista encji, ORM jako singleton w DI (`new MikroORM`, lazy connect), `em` scoped.
- `.env*` w root, ładowane przez `@next/env` w `next.config.ts` i w konfiguracji CLI MikroORM.

## Problemy
- **Subagent wykonał `schema.update()` i migracje na współdzielonej bazie `open-mercato`** (fallback na `DATABASE_URL`). Analiza OID wskazuje, że baza była wcześniej pusta. Utworzone tabele `users`, `counter`, `mikro_orm_migrations` pozostawiono do decyzji użytkownika.
- `NODE_ENV=development` w sandboxie psuł `next build` → wymuszenie `NODE_ENV=production` w skryptach.
- Interop CJS/ESM dla `@next/env` różni się między `next.config.ts` a CLI MikroORM.
- `orm.checkConnection()` przy leniwym połączeniu → `checkDatabase()`.
- Brak bibliotek systemowych dla Chromium → brak weryfikacji wizualnej.
Szczegóły: `.ai/lessons.md`.

## Wynik
`npm run lint`, `npm run typecheck`, `npm run build` przechodzą. Na tymczasowej instancji PostgreSQL sprawdzono: CLI (`debug`, `migration:create/up/down/list`), DI (scope → osobny `em`, wspólny `orm`, dispose), `/api/health` (200 / 503 / powrót do 200), `/` i `/backend` (dev i prod). shadcn CLI instaluje komponenty do `packages/ui`.

## Kolejne kroki
- Decyzja o usunięciu tabel testowych z `open-mercato`.
- Uwierzytelnianie panelu `/backend`, pierwsze encje domenowe, testy (osobne specyfikacje).
