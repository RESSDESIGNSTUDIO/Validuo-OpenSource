# Zasady code review

Dokument uzupełnia checklistę z rozdz. 10 [`.ai/specs/engineering-standards.md`](.ai/specs/engineering-standards.md) i `AGENTS.md`; `om-code-review` (a więc `om-auto-review-pr`) stosuje go automatycznie. Przy sprzeczności obowiązuje standard inżynieryjny.

## Priorytety review

1. **Poprawność i reguły domenowe** — czy zmiana realizuje wymaganie i mieści się w zakresie PR (jeden PR = jeden cel).
2. **Bezpieczeństwo i izolacja** — uprawnienia, granice kont, sekrety.
3. **Kontrakty** — zgodność z `BACKWARD_COMPATIBILITY.md`.
4. **Testy** — 100% pokrycia nowego i zmienionego kodu w `packages/*/src`, testy proporcjonalne do ryzyka.
5. **Jakość i spójność** — nazewnictwo, struktura pakietów, czytelność.

## Sprawdzenia specyficzne dla repozytorium

### Architektura i zależności
- Kierunek zależności: `app → ui`, `app → core`, `app → db → core`. `core` bez `@validuo/*`, React, Next.js, MikroORM/`pg`; `awilix` tylko w `core/src/di/`; usługi w `core` nie przyjmują `EntityManager`, tylko porty.
- Importy między pakietami wyłącznie przez publiczne `exports`; brak ścieżek względnych do cudzego `src` i brak dynamicznego `import()` omijającego reguły ESLint (`no-restricted-imports` nie sprawdza `import()`).
- Brak wyłączeń reguł granic, nowych bibliotek bez uzasadnienia i licencji zgodnej z AGPL-3.0-only; zależność dodana w pakiecie, który jej używa.
- Brak pól i reguł `plan`, `tier`, `isPremium` oraz limitów zasobów (model dostępu: osoba + zakres + czynność).

### Uprawnienia, dane i bezpieczeństwo
- Każda chroniona operacja (Route Handler **i** Server Action) sama weryfikuje sesję oraz konkretne uprawnienie do zakresu i czynności; brak uprawnienia = odmowa. Layout, redirect i ukryty przycisk to nie autoryzacja.
- Aktor, konto (tenant) i uprawnienia nie pochodzą z payloadu. Zapytanie po samym `id` bez zakresu dostępu to błąd. Jest test obcego użytkownika/konta/grupy.
- Wejście walidowane Zod (body, params, query, limity rozmiaru i paginacji); brak `em.assign(entity, rawBody)`; dane z HTTP/JSON/integracji to `unknown` do walidacji.
- Encje ORM nie trafiają do Reacta ani klienta; surowe błędy nie wyciekają (500 z neutralnym komunikatem, szczegóły w logu).
- Logi bez JWT, linków/tokenów zaproszeń, signed URLs, haseł i treści dokumentów; brak pustego `catch`. Sekrety nigdy w `NEXT_PUBLIC_*`.

### Baza danych
- Schemat zmieniany wyłącznie migracją MikroORM z przejrzanym SQL (constraints, indeksy, granty, RLS, triggery) i zacommitowanym `.snapshot.json`; zastosowanych migracji się nie edytuje.
- Brak `schema:update --run`, `schema:fresh`, `schema:drop`, `migration:fresh` na współdzielonej bazie; testy nie używają `DATABASE_URL`.
- Encje: `defineEntity`, jedna na plik, dopisana do `packages/db/src/entities/index.ts`; praca na `em` z bieżącego scope.
- Operacje wieloetapowe mają poprawną granicę transakcji; współbieżność sprawdzona tam, gdzie dotyczy zmiany. Audyt i outbox powstają raz (idempotencja, klucz deduplikacji).

### API, DI i konfiguracja
- Route Handlers owinięte `apiHandler`; błędy domenowe jako `AppError` (nie znają HTTP), transportowe jako `HttpError`.
- DI: klasy deklarują tylko potrzebne zależności; brak `container.resolve()` w domenie; poprawne cykle życia (`scoped` dla `em`, repozytoriów, kontekstu aktora); kod serwerowy z `import "server-only"`.
- Nowa zmienna env = schemat w `core/src/config/env.ts` + `.env.example` + `README.md`.

### UI
- Frontend (`(frontend)`) tylko Tailwind, bez `@validuo/ui/components/*`; panel `/backend` z komponentów `@validuo/ui`; komponenty shadcn dodane CLI, nie kopiowane ręcznie.
- Domyślnie Server Components; `"use client"` tylko dla interakcji. Stany: ładowanie, pusta lista, błąd, zapis, brak dostępu; klawiatura, etykiety, focus; układy < 700, 700–1099, ≥ 1100 px.
- Teksty produktu po polsku; kod, identyfikatory i komentarze po angielsku.

### Testy
- Unit z portami testowymi, bez bazy i sieci; integracja na PostgreSQL 17 (testcontainers) dla izolacji kont, RLS/grantów, atomowości i wyścigów; E2E agent-browser dla krytycznych przepływów.
- **Blokada:** nowe wykluczenia z pokrycia, `/* v8 ignore */` lub obniżony próg bez wyraźnej zgody człowieka.
- Opis PR podaje rzeczywiste wyniki i środowisko; deklaracja testu, którego nie uruchomiono, to błąd.

### Proces
- Commity w stylu Conventional Commits z podpisem DCO (`Signed-off-by`); opis PR wg `.github/pull_request_template.md`.
- Brak push do `main` i obchodzenia CI; nikt nie merguje bez akceptacji człowieka.

## Poziomy ważności

| Poziom | Przykłady | Skutek |
| --- | --- | --- |
| **Blocker** | Brak sprawdzenia uprawnienia/sesji, wyciek danych między kontami, sekret w logu lub repo, mass assignment, edycja zastosowanej migracji, naruszenie kierunku zależności, obniżony próg pokrycia, złamanie kontraktu z `BACKWARD_COMPATIBILITY.md` bez ścieżki zmiany | `changes-requested` |
| **Major** | Brak testu odmowy lub obcego konta, błędna granica transakcji, brak obsługi stanu błędu/braku dostępu w UI, brak migracji dla zmiany encji | `changes-requested` |
| **Minor** | Nazewnictwo, duplikacja, niejasny komentarz, drobna niespójność ze standardem | uwaga; może być follow-upem |
| **Nit** | Styl nieobjęty Prettierem/ESLintem | opcjonalnie |

Czerwony wymagany check CI lub konflikt z `main` zgłaszaj jako blocker razem z pozostałymi uwagami — nie zamiast pełnego review.

## Bramka walidacji

`npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:unit` (100% pokrycia), `npm run build`. Przy zmianach w `packages/db` także `npm run test:integration`, przy zmianach UI/zachowania — `npm run test:e2e` lub `app:ephemeral` + agent-browser.
