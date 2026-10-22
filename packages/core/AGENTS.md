# @validuo/core — reguły biznesowe, kontrakty i infrastruktura bez frameworka

Obowiązują zasady z głównego `AGENTS.md` i `.ai/specs/engineering-standards.md`. Ten plik dodaje szczegóły pakietu.

## Zakres i struktura

Obecnie:

- `src/config/env.ts` (`@validuo/core/config`) — schemat Zod zmiennych serwera i `parseServerEnv(source)` → `ServerEnv` (`database: DatabaseConfig`, `migrationDatabaseUrl`). Błąd `ConfigurationError` wymienia nazwy zmiennych, nigdy wartości.
- `src/config/load-env.ts` (`@validuo/core/config/load-env`) — `loadRootEnv()` i `repositoryRoot`: jedyny loader `.env*` (na bazie `@next/env`), używany przez `next.config.ts` i narzędzia DB. Celowo bez importów względnych i ładuje `@next/env` przez `createRequire` — działa w CJS (`next.config.ts`), w `tsx` i w natywnym Node.
- `src/errors/` (`@validuo/core/errors`) — `AppError` (`code: AppErrorCode`) i podklasy `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError` (`fieldErrors`), `ConflictError`, `PlanLimitError`; `ConfigurationError` (nie jest `AppError` → zawsze 500).
- `src/di/` (`@validuo/core/di`) — `createAppContainer<TCradle>(registrations)`, typy `AppContainer<T>`, `Registrations<T>`, re-eksport `asClass`/`asFunction`/`asValue`/`aliasTo`/`Lifetime`. Jedyne miejsce importu `awilix`.

Docelowo (rozdz. 9 standardu; tworzymy wraz z pierwszą funkcją): `domain/<domena>/`, `policies/*.policy.ts`, `services/<domena>/*.service.ts`, `ports/<domena>/*.repository.ts` / `*.gateway.ts` / `*.port.ts`, `ports/transactions/unit-of-work.port.ts`, `validators/<domena>/*.schema.ts`, `contracts/` (`@validuo/core/contracts` — schematy i DTO bez zależności serwerowych, importowane przez formularze i adaptery w `app`).

## Zasady

- **Brak zależności** od innych pakietów `@validuo/*`, React, Next.js, MikroORM/`pg`/`kysely` i `server-only` (wymusza ESLint). Jedyny wyjątek infrastrukturalny: `@next/env` w `config/load-env.ts`.
- Usługi nie przyjmują `EntityManager` ani obiektów HTTP. Zależą od portów; transakcję wyznacza przypadek użycia przez kontrakt Unit of Work, a commit/rollback realizuje adapter w `db`.
- Usługi i polityki dostają zależności w konstruktorze/fabryce (`{ employeeRepository }: { employeeRepository: EmployeeRepository }`), nigdy przez `container.resolve()`.
- Wartości limitów, statusów i progów mają nazwane definicje w jednym miejscu (bez powielania w formularzu, usłudze i SQL). Daty ważności to daty kalendarzowe, nie północ UTC; datę odniesienia przekazujemy jawnie.
- Funkcje czyste, bez efektów ubocznych przy imporcie (`"sideEffects": false`). Funkcje zależne od środowiska przyjmują je jako argument (`parseServerEnv(process.env)`), co ułatwia testy.
- Każdy nowy moduł publiczny = wpis w `exports`; bez barrela w `.` — klient może importować tylko wejścia wolne od kodu serwerowego.
- Testy jednostkowe obok kodu (`<nazwa>.test.ts`), z portami testowymi zamiast bazy.
