<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# @validuo/app — aplikacja Next.js

Obowiązują zasady z głównego `AGENTS.md` (architektura, DI, UI, weryfikacja). Ten plik dodaje szczegóły pakietu.

## Struktura

- `src/app/layout.tsx` — jedyny root layout (`<html>`, `<body>`, import `globals.css`).
- `src/app/(frontend)/` — strony publiczne; **tylko klasy Tailwind**, bez komponentów z `@validuo/ui/components/*` (wymusza ESLint).
- `src/app/(backend)/backend/` — panel zaplecza pod `/backend`; budowany z komponentów shadcn z `@validuo/ui`. Panel nie ma jeszcze uwierzytelniania — dodaj je przed wdrożeniem produkcyjnym.
- `src/app/api/` — route handlers (np. `api/health`).
- `src/server/` — kod tylko serwerowy (`import "server-only"`), w tym composition root DI `container.ts`.
- `src/components/` — komponenty specyficzne dla aplikacji (twórz w razie potrzeby).

## Zasady

- Nowe moduły DI rejestruj wyłącznie w `src/server/container.ts` (lista w `buildContainer`).
- W route handlers i server actions korzystaj z `withRequestScope(async (scope) => ...)`, gdy potrzebujesz `em` lub serwisów `scoped`; `getContainer()` tylko dla singletonów.
- Strony korzystające z bazy oznaczaj jako dynamiczne (`await connection()` z `next/server` lub użycie request-time API).
- Nie dodawaj tu Tailwinda ani motywu — są w `@validuo/ui` (`globals.css` tylko importuje `@validuo/ui/globals.css`).
- Komponenty shadcn dodawaj z root: `npx shadcn@latest add <komponent> -c packages/app` (konfiguracja: `components.json`).
- `next.config.ts` jest kompilowany do CommonJS — importy nazwane z pakietów CJS. Ładuje pliki `.env*` z katalogu głównego repo.
