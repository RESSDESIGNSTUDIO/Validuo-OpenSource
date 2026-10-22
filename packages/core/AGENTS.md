# @validuo/core — części wielokrotnego użytku

Obowiązują zasady z głównego `AGENTS.md`. Ten plik dodaje szczegóły pakietu.

## Zakres

Kod niezależny od frameworka i infrastruktury, z którego korzystają pozostałe pakiety:

- `src/di/` (`@validuo/core/di`) — kontener Awilix: `createAppContainer`, interfejs `Cradle`, typy `AppContainer` i `DiModule`, re-eksport `asClass`/`asFunction`/`asValue`/`aliasTo`/`Lifetime`.
- `src/env.ts` — odczyt zmiennych środowiskowych (`requireEnv`, `intEnv`, `boolEnv`).
- `src/errors.ts` — `AppError` (z kodem) i błędy pochodne.

## Zasady

- **Brak zależności** od innych pakietów `@validuo/*`, React, Next.js i MikroORM (wymusza ESLint). Jeśli coś tego wymaga, należy do innego pakietu.
- Funkcje czyste, bez efektów ubocznych przy imporcie (`"sideEffects": false`).
- Funkcje czytające env przyjmują opcjonalny obiekt `env` (domyślnie `process.env`) — ułatwia testy.
- Awilix importuj w innych pakietach przez `@validuo/core/di`, nie bezpośrednio z `awilix`, żeby konfiguracja kontenera była w jednym miejscu.
- Nowy moduł publiczny = wpis w `exports` w `package.json`.
