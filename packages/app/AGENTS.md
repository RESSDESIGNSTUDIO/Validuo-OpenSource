<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# @validuo/app — aplikacja Next.js i composition root

Obowiązują zasady z głównego `AGENTS.md` (architektura, DI, API, UI, weryfikacja) i `.ai/specs/engineering-standards.md`. Ten plik dodaje szczegóły pakietu.

## Struktura

- `src/app/layout.tsx` — jedyny root layout (`<html>`, `<body>`, import `globals.css`).
- `src/app/(frontend)/` — strony publiczne; **tylko klasy Tailwind**, bez `@validuo/ui/components/*` (wymusza ESLint).
- `src/app/(backend)/backend/` — panel pod `/backend` z komponentów shadcn z `@validuo/ui`. Panel nie ma jeszcze uwierzytelniania — dodaj je (`src/server/auth/`, mechanizm do wyboru w osobnej specyfikacji) przed wdrożeniem produkcyjnym i przed pierwszymi danymi tenantów.
- `src/app/api/<zasób w l. mnogiej>/route.ts` — Route Handlers owinięte w `apiHandler` (np. `api/health`).
- `src/instrumentation.ts` — walidacja env przy starcie serwera (pomija `next build` i runtime inny niż Node.js; importuje tylko `@validuo/core/config`, bo moduły `server-only` nie działają w tym kontekście).
- `src/server/` — kod tylko serwerowy (`import "server-only"`):
  - `container.ts` — composition root: `AppCradle`, `getContainer()`, `withRequestScope()`, typ `RequestScope`;
  - `http/api-handler.ts`, `http/http-error.ts` — wspólna warstwa HTTP (scope, `requestId`, `ApiResult`, mapowanie błędów, `no-store`);
  - `logging/logger.ts` — `Logger` (JSON, `child(context)`), singleton `logger` w DI;
  - docelowo: `auth/` (sesja, zaufany kontekst aktora), `adapters/{mail,storage}/` (implementacje portów z `core`).
- `src/lib/api/` — kod współdzielony z klientem: `api-result.ts` (`ApiResult<T>`); docelowo jeden helper `api-call.ts` (status, payload, anulowanie).
- `src/features/<domena>/{components,actions}/` — komponenty domenowe i Server Actions (twórz z pierwszą funkcją). Komponent jednej strony zostaje przy stronie do drugiego zastosowania.

## Zasady

- Rejestracje DI dopisuj wyłącznie w `src/server/container.ts`: rozszerz `AppCradle` i obiekt w `buildContainer()` (rejestracje pakietów przez spread, np. `...dbRegistrations(env.database)`).
- Route Handlers: `export const GET = apiHandler("<domena>.<operacja>", async ({ request, params, scope, logger }) => ({ data }))`. Rzucaj `AppError` (domena) lub `HttpError` (transport); nie buduj odpowiedzi błędów ręcznie. Server Actions używają `withRequestScope` i tego samego przypadku użycia.
- `getContainer()` tylko dla singletonów (np. `orm`, `logger` w stronie); wszystko `scoped` przez `withRequestScope`.
- Strony korzystające z bazy oznaczaj jako dynamiczne (`await connection()` z `next/server` lub request-time API). Surowe błędy (SQL, sterownik, dostawcy) tylko do logu — nigdy do HTML/JSON.
- Mutacje uwierzytelniane cookies: weryfikacja origin/host i ochrona CSRF; rate limiting dla logowania, zaproszeń i funkcji administracyjnych (licznik współdzielony między replikami).
- Nie dodawaj tu Tailwinda ani motywu — są w `@validuo/ui` (`globals.css` tylko importuje `@validuo/ui/globals.css`).
- Komponenty shadcn dodawaj z root: `npx shadcn add <komponent> -c packages/app` (konfiguracja: `components.json`).
- `next.config.ts` jest kompilowany do CommonJS; `.env*` ładuje wyłącznie przez `loadRootEnv()` z `@validuo/core/config/load-env`.
- Testy: `*.test.ts` obok kodu (moduły `server-only` działają w Vitest dzięki aliasowi w `vitest.config.ts`); `*.integration.test.ts` ustawiają `DATABASE_URL` jawnie z `requireTestDatabaseUrl()`.
