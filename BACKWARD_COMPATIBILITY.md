# Zgodność wsteczna — chronione powierzchnie kontraktowe

Validuo jest aplikacją (nie biblioteką), ale kilka powierzchni jest kontraktem z danymi, operatorami lub innymi pakietami monorepo. Przeglądający sprawdzają zmiany względem tego pliku, a skille implementujące ostrzegają, gdy zmiana go narusza. Zmiana sprzeczna z którymś punktem wymaga ścieżki wskazanej poniżej, opisu w PR (sekcja „Ograniczenia”) i — dla `risk-high` — akceptacji człowieka.

## Powierzchnie i reguły

| Powierzchnia | Co jest zmianą łamiącą | Wymagana ścieżka |
| --- | --- | --- |
| **Schemat bazy i migracje** (`packages/db/src/migrations`, `.snapshot.json`) | Usunięcie/zmiana typu tabeli lub kolumny, zaostrzenie constraintu na istniejących danych, zmiana granta/RLS/triggera, edycja migracji już zastosowanej na współdzielonym środowisku | Nowa migracja (nigdy edycja zastosowanej); strategia danych, migracja w górę i w dół, plan wycofania i backup w opisie PR dla zmian destrukcyjnych; `risk-high` |
| **Nazwy tabel, wartości enumów, sygnatury RPC** | Zmiana nazwy lub wartości „dla konwencji” | Tylko jako świadoma migracja z uzasadnieniem; sama konwencja nie jest powodem |
| **Publiczne `exports` pakietów** (`@validuo/core/config`, `/config/load-env`, `/di`, `/errors`; `@validuo/db`, `/testing`, `/testing/vitest`; `@validuo/ui/components/*`, `/lib/*`, `/hooks/*`, `/globals.css`, `/postcss.config`) | Usunięcie lub zmiana nazwy modułu/eksportu, zmiana sygnatury lub semantyki używanej przez inny pakiet | Zaktualizuj wszystkich konsumentów w tym samym PR; nowy moduł = nowy wpis w `exports`; ścieżki względne do cudzego `src` są niedozwolone |
| **Kontrakt HTTP** (`packages/app/src/app/api/**`, `ApiResult<T>`) | Usunięcie/zmiana ścieżki, metody, kodów statusu, kształtu `ApiResult<T>`, kodów i pól błędów (`fieldErrors`), nagłówka `x-request-id` | Dodawaj pola opcjonalne zamiast zmieniać istniejące; łamiącą zmianę wprowadzaj nową trasą/wersją z okresem przejściowym i opisem w PR |
| **Błędy domenowe** (`AppError`, `UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404, `ValidationError` 422, `ConflictError` 409) | Zmiana mapowania na statusy HTTP lub kształtu `fieldErrors` | Jak kontrakt HTTP |
| **Konfiguracja środowiska** (`parseServerEnv`, `.env.example`, `README.md`) | Zmiana nazwy/znaczenia istniejącej zmiennej, nowa wymagana zmienna bez wartości domyślnej | Nowa zmienna: schemat Zod + `.env.example` + `README.md`; przy zmianie nazwy — okres, w którym obowiązuje stara (z ostrzeżeniem), i nota migracyjna |
| **Katalog uprawnień** (zakresy i czynności w `core`) | Zmiana znaczenia lub usunięcie istniejącego uprawnienia, zmiana szablonu uprawnień zmieniająca po cichu już nadane uprawnienia | Źródłem prawdy są uprawnienia zapisane dla osoby; zmiana znaczenia wymaga zaakceptowanej specyfikacji i migracji danych |
| **Zdarzenia i dane audytu/outboxa** (np. `groups.invitation.created`) | Zmiana nazwy zdarzenia lub kształtu payloadu, klucza deduplikacji | Nowe zdarzenie/wersja obok starego; zachowaj idempotencję i obsługę wpisów już zapisanych |
| **Wartości API ↔ stany domenowe** (np. `missing`, `valid`, `expiring`, `expired`) | Zmiana nazw stanów lub ich mapowania | Jawne mapowanie i test; zmiana jak kontrakt HTTP |
| **Skrypty i polecenia** (`package.json` w root: `lint`, `typecheck`, `test:*`, `build`, `db:*`, `app:ephemeral`) | Zmiana nazwy lub semantyki skryptu używanego przez CI, `AGENTS.md` lub skille | Zaktualizuj CI (`.github/workflows`), `AGENTS.md`, `README.md` i `.ai/agentic.config.json` w tym samym PR |
| **Wymagane checki CI** (Lint, Unit tests (100% coverage), Build, Integration tests) | Zmiana nazw jobów, obniżenie progów, nowe wykluczenia z pokrycia | Zmiana ochrony gałęzi `main` i progów wymaga zgody człowieka |

## Co nie jest chronione

Wewnętrzne moduły w `packages/*/src` poza `exports`, komponenty aplikacji w `packages/app/src/components` i `features`, kod testów oraz zawartość `.ai/` mogą się zmieniać swobodnie, o ile nie naruszają powyższych kontraktów.

## Zasady ogólne

- Preferuj zmiany addytywne (nowe kolumny nullable, pola opcjonalne, nowe trasy) nad zmianami łamiącymi.
- Każda zmiana łamiąca ma: uzasadnienie, listę dotkniętych konsumentów, plan migracji danych i wycofania oraz testy obu stron kontraktu.
- Migrację destrukcyjną wykonuj wyłącznie po świadomej decyzji człowieka, z backupem i procedurą odtworzenia — zgodnie z `AGENTS.md`.
