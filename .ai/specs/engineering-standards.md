# Validuo - Engineering Standards & Package Structure

Data: 2026-10-22
Status: obowiązujące standardy implementacji

Validuo to webowa aplikacja SaaS do zarządzania pracownikami, grupami, strukturą działów, dokumentami, szkoleniami i uprawnieniami. System monitoruje terminy ważności, obsługuje zaproszenia, przypomnienia i historię zmian oraz egzekwuje dostęp do danych i limity planów kont.

Dokument określa stos technologiczny, architekturę, konwencje kodu i kryteria akceptacji zmian. Agent AI stosuje te reguły przy implementacji i code review. Ścieżki w strukturze pakietów wskazują miejsce dla danej odpowiedzialności; foldery i abstrakcje powstają dopiero wtedy, gdy wymaga ich realizowana funkcja.

---

## 1. Stos technologiczny

| Obszar | Standard |
|---|---|
| Runtime | Node.js 24 LTS, npm 11; wersje narzędzi przypięte w repo i CI |
| Framework | Next.js 16, App Router, Turbopack; Node.js runtime dla kodu bazodanowego |
| UI | React 19, Server Components domyślnie; Client Components tam, gdzie potrzebna jest interakcja |
| Język | TypeScript 5 w kompatybilnej wersji minor, `strict: true` |
| Baza | PostgreSQL 17; wersja środowiska deweloperskiego, testowego i produkcyjnego musi być zgodna |
| ORM | MikroORM 7: `defineEntity`, Unit of Work, jawna lista encji, scope danych per żądanie |
| DI | Awilix 13, `PROXY`, `strict`, jawna rejestracja zależności |
| Style | Tailwind CSS 4, wspólne tokeny motywu |
| Panel aplikacji | shadcn/ui, Radix UI i lucide-react w `@validuo/ui` |
| Strony publiczne | Własne komponenty i klasy Tailwind |
| Monorepo | npm workspaces: `app`, `core`, `db`, `ui` |
| Walidacja | Zod 4, wspólne schematy wejścia i DTO |
| Jakość | ESLint z regułami granic pakietów, TypeScript, jeden formatter |
| Testy | Vitest dla reguł i usług, PostgreSQL dla integracji, Playwright dla scenariuszy przeglądarkowych |

Dokładne wersje zależności ustala lockfile po sprawdzeniu kompatybilności. Nie stosujemy `latest` w CI. Nowa biblioteka musi rozwiązywać konkretny problem, którego nie pokrywają obecne narzędzia.

Next.js obsługuje publiczny frontend i panel zalogowanych użytkowników. Słowo „backend” w nazwie grupy tras oznacza panel UI; logika serwerowa pozostaje w usługach i adapterach. Serwerowy Next.js z ORM wymaga środowiska Node.js. Środowisko wdrożeniowe musi obsługiwać proces Node.js, połączenia PostgreSQL oraz uruchamianie zadań w tle.

Źródła: [Node.js releases](https://nodejs.org/en/about/previous-releases), [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html), [MikroORM defineEntity](https://mikro-orm.io/docs/define-entity), [Zod](https://zod.dev/).

## 2. Finalna lista reguł inżynieryjnych

### Nazewnictwo

| Element | Konwencja | Przykład |
|---|---|---|
| Pakiet | `packages/<name>`, zakres `@validuo` | `@validuo/core` |
| Folder domeny | Liczba mnoga, angielski, ta sama nazwa w warstwach | `employees`, `groups`, `departments` |
| Złożona nazwa folderu lub pliku TS | kebab-case | `audit-history`, `employee-create.schema.ts` |
| Model domenowy / encja | PascalCase, liczba pojedyncza | `Employee`, `GroupInvitation` |
| Definicja encji ORM | `<Name>Schema`, plik `<name>.entity.ts` | `EmployeeSchema`, `employee.entity.ts` |
| Tabela / kolumna SQL | snake_case; tabela w liczbie mnogiej | `employee_groups`, `organization_id` |
| Pole TS | camelCase, jawne mapowanie istniejącej kolumny | `organizationId` |
| Usługa | PascalCase + `Service` | `EmployeeService` |
| Port repozytorium | PascalCase + `Repository` | `EmployeeRepository` |
| Port integracji | PascalCase + `Gateway` lub `Port` | `MailGateway`, `FileStoragePort` |
| Adapter | Nazwa technologii + nazwa kontraktu | `MikroOrmEmployeeRepository` |
| Klucz DI | camelCase | `employeeService`, `employeeRepository` |
| Schemat walidacji | camelCase + `Schema` | `employeeCreateSchema` |
| Komponent React | PascalCase; plik kebab-case | `EmployeeTable`, `employee-table.tsx` |
| Hook | `use` + opis stanu/interakcji | `useEmployeeFilters` |
| Route | Zasób w liczbie mnogiej; `route.ts` | `api/groups/[groupId]/employees/route.ts` |
| Strona | `page.tsx`, domyślny eksport PascalCase | `EmployeesPage` |
| Błąd aplikacyjny | PascalCase + `Error` | `ForbiddenError`, `PlanLimitError` |
| Zdarzenie | `concept.entity.action`, czas przeszły | `groups.invitation.created` |
| Test | `<name>.test.ts`, E2E `<scenario>.spec.ts` | `employee.service.test.ts` |

Nazwy tabel, wartości enumów i sygnatury RPC są kontraktami. Konwencja nie stanowi powodu do ich zmiany. Szczególnie `editor` jest techniczną rolą grupy prezentowaną jako Administrator, a nie automatycznie rolą `admin` organizacji.

### Architektura i granice pakietów

Obowiązuje następujący kierunek zależności:

```text
app -> ui
app -> core
app -> db -> core
```

- `core` zawiera reguły biznesowe, przypadki użycia, modele, porty, schematy walidacji i błędy. Nie importuje `db`, `ui`, Reacta, Next.js ani MikroORM.
- `db` implementuje porty persystencji z `core`, definiuje encje ORM, zapytania i obsługę transakcji. Nie importuje `app` ani Next.js.
- `ui` zawiera prezentację i generyczne wzorce panelu. Nie zna ORM, kontenera DI, sekretów ani pakietów `app`, `db`, `core`.
- `app` jest composition root: składa usługi i adaptery, weryfikuje sesję, obsługuje HTTP, renderuje strony oraz dostarcza komponentom UI dane i callbacki.
- Adaptery integracji niezwiązanych z bazą, np. poczty, należą do `app/src/server/adapters/` i implementują porty z `core`.
- Importy między pakietami przechodzą przez jawne `exports`; nie przez względne ścieżki do cudzych katalogów `src`.
- ESLint blokuje zabronione importy, również podścieżki. Oznaczenie serwerowych wejść `app` przez `server-only` chroni przed przypadkowym importem do klienta.
- Folder domeny powstaje razem z pierwszą potrzebną implementacją. Nie tworzymy modułowego runtime, auto-discovery ani pustych struktur „na przyszłość”.

**Usługi w `core` nie mogą przyjmować `EntityManager`.** Dostają port repozytorium i, jeśli potrzebny, kontrakt transakcyjny. Implementacja transakcji z `db` dostarcza repozytoria związane z jednym transakcyjnym EntityManagerem. Przypadek użycia wyznacza granicę operacji, adapter realizuje commit/rollback. Nie wywołujemy w transakcji repozytorium działającego na innym połączeniu.

Schematy i DTO mogą mieć publiczne wejście `@validuo/core/contracts`, bez zależności serwerowych. Importują je formularze i adaptery w `app`; sam `ui` pozostaje niezależny i przyjmuje typowane propsy. Nie trzeba tworzyć piątego pakietu ani powielać ręcznie definicji payloadów.

### Zasady projektowe

- **SRP:** route odpowiada za transport, usługa za przypadek użycia, repozytorium za dane, komponent za prezentację. Ekran nie decyduje o możliwości zmiany pracownika.
- **DRY:** współdzielimy reguły uprawnień, walidację dat, mapowanie błędów i tokeny UI. Nie budujemy uniwersalnego CRUD tylko dlatego, że dwie funkcje mają podobne nazwy.
- **Dependency Inversion:** `EmployeeService` zależy od `EmployeeRepository`; adapter MikroORM realizuje kontrakt. Dostawca poczty nie przenika do reguł zaproszeń.
- **Composition over inheritance:** małe usługi i funkcje zamiast `BaseService`, `BaseController` i wielopoziomowych klas bazowych.
- **Explicit over implicit:** jawne rejestracje DI, jawne encje ORM, jawne DTO i dozwolone pola aktualizacji.
- **YAGNI:** bez mikroserwisów, CQRS, event sourcingu, brokera i własnego systemu pluginów bez potwierdzonej potrzeby.
- **Fail closed:** błąd odczytu członkostwa, planu lub sesji blokuje chronioną operację. Awarii nie mapujemy automatycznie na brak danych.
- **Idempotency:** ponowienie zaproszenia, zlecenia wysyłki lub zadania terminów nie może powielać skutków biznesowych.

Nie wymagamy pary encja-usługa dla każdego pliku. Raport, policy lub serwis operujący na kilku encjach może istnieć bez własnej tabeli.

## 3. Reguły domenowe Validuo

### Organizacje, grupy, role i plany

W kodzie występują trzy odrębne osie uprawnień:

| Oś | Znaczenie | Weryfikacja |
|---|---|---|
| Członkostwo organizacji | Role `owner`, `admin`, `manager`, `viewer` | Konkretny tenant i operacja |
| Członkostwo grupy | Role `owner`, `editor`, `viewer` | Konkretna grupa oraz dostęp do jej danych |
| Plan konta | `free`, `premium`, `unlimited`, `admin` w `profiles.plan` | Limity i dostępność funkcji |

Administrator platformy ma dodatkowe uprawnienia potwierdzane przez `platform_admins`; nie utożsamiamy tej zdolności wyłącznie z etykietą planu. Stan widoczny w przeglądarce nie jest źródłem uprawnień.

Polityka dla przypadku użycia sprawdza zweryfikowanego użytkownika, właściwą organizację, dostęp do konkretnej grupy/pracownika, dozwoloną czynność oraz ograniczenia planu. Nie zastępujemy modelu uprawnień jednym `isAdmin` ani samym filtrem `organization_id`. Udostępniona grupa może mieć inny kontekst własności niż organizacja użytkownika.

Limity kont: Free 1 własna grupa i 15 pracowników, Premium 5 własnych grup i 100 pracowników, Unlimited/Admin bez limitu. Free nie zaprasza ani nie przekazuje/otrzymuje własności; dostęp po zaproszeniu jest ograniczony do podglądu. Administrator grupy z planem Free nie uzyskuje prawa edycji przez samą rolę `editor`. Liczenie limitu musi odpowiadać regule w bazie, w tym zakresowi konta i współdzielonym pracownikom, a nie liczbie wierszy bieżącej strony UI.

Sprawdzenie limitu i utworzenie zasobu stanowią jedną operację transakcyjną z blokadą właściwego właściciela/rekordu limitu lub inną sprawdzoną ochroną współbieżności. Dwa równoległe żądania nie mogą przekroczyć limitu. Zmiana planu jest operacją zaufanego backendu; klient nie przesyła wiarygodnego `plan`.

### Pracownicy, działy i pola dynamiczne

- Pracownik może należeć do wielu grup. Usunięcie członkostwa nie oznacza automatycznie usunięcia pracownika i jego plików.
- Tworzenie pracownika odbywa się w kontekście grupy. Nie dopuszczamy osieroconego rekordu przez osobny zapis pracownika i późniejszą próbę dopisania grupy.
- Hierarchia działów wymaga kontroli grupy rodzica, zakazu cykli, poprawnej kolejności i unikalności zgodnej z zakresem rodzica. UI drag-and-drop nie stanowi walidacji.
- Definicja pola, jego typ, opcje, wymagalność, kolejność i wartość pracownika mają osobne odpowiedzialności. Wartość musi odpowiadać definicji i dozwolonym opcjom po stronie serwera.
- Nie umieszczamy całej domeny w jednym niekontrolowanym JSON. Pola stałe i relacje mają typowane kolumny; dane dynamiczne mają walidowaną strukturę i jasno określone reguły.
- Edycja danych pracownika wraz ze szczegółami atrybutów jest atomowa.
- Lista globalna nie może ujawniać pól lub metadanych z grup, do których użytkownik nie ma dostępu.

### Wymagania, terminy i przypomnienia

Wymagania określają dokumenty, szkolenia i uprawnienia wymagane dla pracownika. Terminy i przypomnienia korzystają ze wspólnych reguł domenowych, niezależnych od ekranu i kanału powiadomień.

- Rozróżniamy datę kalendarzową ważności (`date`) i moment zdarzenia (`timestamptz`). Nie zamieniamy daty ważności w północ UTC i nie przesuwamy jej konwersją strefy przeglądarki.
- Jedna funkcja domenowa wylicza stan `missing`, `valid`, `expiring`, `expired` z dat, definicji wymagalności, jawnego progu ostrzegania i przekazanej daty odniesienia. Mapowanie między stanami domenowymi a wartościami API jest jawne.
- Znaczenie „ważne do”, strefa wyliczeń i próg ostrzegania muszą wynikać z zaakceptowanej reguły produktu. Nie ustalamy arbitralnie 30 dni ani strefy całej organizacji.
- Filtry dashboardu, listy pracowników i widoku przypomnień korzystają z tej samej reguły. Testujemy dzień graniczny, brak daty i przełom miesiąca/roku.
- Wysyłka w tle korzysta z trwałego outboxa i klucza deduplikacji odbiorca/zdarzenie/termin. Przetwarzanie dopuszcza ponowienia; efekt ma być idempotentny. In-process emitter nie zapewnia trwałości.

### Zaproszenia, własność i historia

- Zaproszenie jest związane z grupą, uprawnionym nadawcą i odbiorcą. Przyjęcie weryfikuje uwierzytelnionego użytkownika, adres e-mail, ważność i stan zaproszenia.
- Token zaproszenia jest sekretem, nie trafia do logów. Krótki kod dołączenia wymaga limitowania prób. Własności nie nadajemy na podstawie payloadu przeglądarki.
- Utworzenie zaproszenia i zlecenia wysyłki zapisujemy atomowo. Awaria SMTP nie może wymuszać ponownego tworzenia zaproszenia ani być przedstawiana jako cofnięcie poprawnie zapisanego rekordu.
- Przekazanie własności sprawdza właściciela, rolę odbiorcy i plany obu stron; zapis uprawnień i historii jest atomowy.
- Usunięcie konta uwzględnia przekazanie współdzielonych grup i usunięcie osieroconych danych. Nie projektujemy kaskady wyłącznie na podstawie pojedynczego FK.
- Historia audytu opisuje aktora, czynność, cel, czas i istotną różnicę danych. Nie kopiuje tokenów, sekretów ani pełnych dokumentów.
- Widoczność historii i możliwość otwarcia celu to osobne decyzje: historyczny wpis nie nadaje aktualnego dostępu do rekordu.
- Jeśli audyt jest zapisywany przez trigger, usługa nie emituje drugiego wpisu tej samej zmiany. Obowiązuje jedno źródło zapisu audytu dla operacji.

## 4. API, walidacja i wspólna warstwa UI

### Serwer

Standardowe elementy, tworzone gdy pojawia się pierwszy używający ich endpoint:

- `core/src/errors/app-error.ts`: kody `Unauthorized`, `Forbidden`, `NotFound`, `Validation`, `Conflict`, `PlanLimit`. Błędy domenowe nie budują odpowiedzi HTTP.
- `app/src/server/http/api-handler.ts`: wspólne mapowanie błędów, korelacja logów, kontrola formatu odpowiedzi. Błąd nieoczekiwany zwraca neutralny komunikat.
- `app/src/server/auth/`: weryfikacja sesji i budowa zaufanego kontekstu aktora. Reguły grup/planów pozostają w policy i usługach `core`.
- `core/src/validators/<concept>/`: schematy poleceń i DTO. Walidujemy body, params i query; ustawiamy limity rozmiaru, długości i paginacji.
- Route Handler i Server Action wywołują ten sam przypadek użycia. Nie duplikują reguł i nie omijają autoryzacji, nawet jeśli strona jest chroniona.

Konwencja odpowiedzi JSON:

```ts
type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
        requestId?: string;
      };
    };
```

Statusy HTTP pozostają znaczące: 400 dla niepoprawnej składni/parametrów, 401 dla braku sesji, 403 dla odmowy, 404 dla braku zasobu, 409 dla konfliktu lub limitu, 422 dla błędów pól, 429 dla ograniczenia żądań, 500 dla błędu nieoczekiwanego. Polityka 404 zamiast 403, jeśli chroni przed ujawnieniem istnienia zasobu, musi być spójna.

Nigdy nie wykonujemy `em.assign(entity, rawBody)` ani odpowiednika z nieprzefiltrowanym żądaniem. Identyfikator aktora, plan, rola i kontekst autoryzacji pochodzą z zaufanej warstwy. Tenant z adresu URL jest wyborem użytkownika wymagającym weryfikacji, nie dowodem uprawnienia.

`makeCrudRoute` można dodać dopiero przy powtarzalnym prostym CRUD. Zapraszanie, przekazanie własności, usuwanie konta i atomowa edycja pól są nazwanymi operacjami biznesowymi, nie konfiguracją uniwersalnego generatora.

Server Components odczytują dane przez serwerowe przypadki użycia i DTO, bez HTTP do własnego `/api`. Klient korzysta z jednego helpera w `app/src/lib/api/`, z kontrolą statusu, payloadu i anulowania. DTO nie zawiera encji ORM, lazy relations ani danych, których użytkownik nie powinien widzieć.

Źródła: [Next.js authentication](https://nextjs.org/docs/app/guides/authentication), [Next.js mutating data](https://nextjs.org/docs/app/getting-started/mutating-data).

### UI i design system

- Prymityw shadcn trafia do `ui/src/components/`; dodajemy go CLI z poprawną konfiguracją workspace, potem utrzymujemy jako własny kod. Nie zakazujemy uzasadnionych poprawek dostępności.
- Generyczne wzorce panelu trafiają do `ui/src/backend/{forms,tables,feedback}`. Otrzymują dane i callbacki, nie samodzielnie rozwiązują DI ani sesję.
- Komponent domenowy trafia do `app/src/features/<concept>/components/`. Komponent jednej strony pozostaje przy tej stronie do pojawienia się drugiego zastosowania.
- `DataTable`, formularze i feedback ujednolicają stany ładowania, pustej listy, błędu, zapisu i braku dostępu. Nie narzucamy formularza generowanego ze schematu edytorowi hierarchii działów lub pól dynamicznych.
- Tokeny kolorów, typografii, odstępów i promieni mają jedno źródło w `ui/src/styles/globals.css`. W panelu i stronach publicznych obowiązuje ten sam język wizualny.
- Stan serwera nie jest kopiowany do globalnego store bez potrzeby. Filtry i paginacja nadające się do udostępnienia mają reprezentację w URL; stan formularza pozostaje lokalny.
- Listy mają paginację po stronie serwera i stabilne sortowanie z dodatkowym ID. Nie pobieramy wszystkich pracowników i historii tylko po to, aby przefiltrować je w przeglądarce.
- Obsługujemy klawiaturę, etykiety pól, focus po dialogu, komunikaty walidacji i czytelny kontrast. Ikona bez tekstu ma nazwę dostępną.
- Przed zapisem blokujemy wielokrotny submit. Optymistyczny UI wymaga rollbacku; transferu własności nie pokazujemy jako zakończonego przed potwierdzeniem serwera.
- Widoki testujemy na małym ekranie i desktopie, w obu motywach. Układ obsługuje trzy zakresy: poniżej 700 px, od 700 do 1099 px oraz od 1100 px. Weryfikujemy również szerokości graniczne i brak poziomego przewijania całej strony.

Źródła: [shadcn monorepo](https://ui.shadcn.com/docs/monorepo), [Tailwind theme variables](https://tailwindcss.com/docs/theme).

## 5. Persystencja, DI i transakcje

### MikroORM

- Encje definiujemy przez `defineEntity` i rejestrujemy jawnie. Nazwy tabel i kolumn mapujemy do sprawdzonego schematu, bez zgadywania na podstawie UI.
- Jeden ORM i pula połączeń na proces; oddzielny EntityManager per request/job. Nie współdzielimy identity map między użytkownikami.
- Wszystkie zapytania wymagające izolacji korzystają z tego samego zweryfikowanego kontekstu. Zapytanie po samym `id` bez zakresu dostępu jest błędem, także przy UUID.
- Serwisy nie zwracają encji ORM do Reacta. Repozytorium mapuje dane do modeli/DTO i pobiera jawnie potrzebne relacje.
- Constraints, FK i indeksy stanowią część implementacji. Zależności tenantów wymagają kontroli na poziomie bazy, np. złożonych kluczy zapewniających zgodność `organization_id`.
- Nie stosujemy N+1 dla list pracowników, grup i atrybutów. Plany zapytań oceniamy na reprezentatywnych danych przez `EXPLAIN`, poza produkcyjnymi żądaniami użytkowników.
- SQL jest parametryzowany; identyfikatory i sortowanie wybierane z allowlist. Nie konkatenatujemy inputu do zapytania.

Źródła: [MikroORM identity map](https://mikro-orm.io/docs/identity-map), [MikroORM transactions](https://mikro-orm.io/docs/transactions).

### Kontener Awilix

Composition root znajduje się w `app/src/server/container.ts`. `withRequestScope` obejmuje pojedyncze żądanie lub akcję, a zwolnienie scope następuje w `finally`.

| Lifetime | Zależności |
|---|---|
| Singleton | ORM, logger, konfiguracja, bezstanowy klient integracji |
| Scoped | EntityManager, repozytoria, usługi używające kontekstu aktora, kontekst requestu |
| Transient | Lekkie obiekty bez współdzielonego stanu, gdy faktycznie potrzebne |

Singleton nie przechowuje sesji, użytkownika, tenant ID ani scoped repozytorium. Kontener w `globalThis` może zapobiegać wielokrotnym pulom podczas HMR, ale nie jest wspólnym singletonem wszystkich replik. Zamknięcie puli następuje przy kontrolowanym zamknięciu procesu, nie po każdym request.

Typy portów należą do `core`; typowanie konkretnych rejestracji powstaje w composition root. Declaration merging nie może wprowadzić zależności `core -> db`. Domeny nie wywołują `container.resolve()`; zależności dostają w konstruktorze lub argumentach fabryki.

Źródło: [Awilix: lifetime, scopes i strict mode](https://github.com/jeffijoe/awilix).

### Granice transakcji i migracje schematu

- Jedna transakcja obejmuje zmianę danych, kontrolę konfliktu i wymagany wpis audytu/outboxa.
- Limit pracowników, zmiana właściciela i kolejność działów wymagają ochrony współbieżności. Samo `SELECT`, a następnie `INSERT` w transakcji przy domyślnej izolacji nie rozwiązuje wyścigu.
- Blokady pobieramy w stałej kolejności. Retry po deadlocku lub konflikcie serializacji jest ograniczony i dotyczy całej operacji, jeśli jest bezpieczna do powtórzenia.
- SMTP i Storage nie należą do transakcji PostgreSQL. Dla skutków zewnętrznych stosujemy outbox lub jawny proces kompensacji z możliwością ponowienia.
- Dla schematu obowiązuje jeden właściciel migracji. Pliki SQL znajdują się w `supabase/migrations`; nie uruchamiamy równolegle niezależnych migratorów Supabase i MikroORM na tych samych obiektach.
- Nowy SQL musi zachowywać funkcje, polityki RLS, granty i triggery, których ORM nie odtwarza automatycznie. Wygenerowany diff zawsze podlega przeglądowi.
- Nie używamy `schema:update --run` na produkcji. Wdrożonych migracji nie edytujemy. Przed zmianą destrukcyjną wymagane są świadoma decyzja, backup i sprawdzona procedura odtworzenia.

Źródła: [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html), [MikroORM migrations](https://mikro-orm.io/docs/migrations).

## 6. Bezpieczeństwo i integracje

### Sesja i autoryzacja

Uwierzytelnianie realizuje Supabase Auth, a przechowywanie plików Supabase Storage. Integracje są dostępne przez adaptery implementujące porty aplikacji. Nie implementujemy własnego hashowania haseł ani wystawiania JWT.

- Każda chroniona Route Handler i Server Action weryfikuje tożsamość oraz uprawnienie do konkretnej operacji. Ukryty przycisk, layout lub redirect nie zapewnia autoryzacji.
- Przy SSR korzystamy z oficjalnego wzorca Supabase dla klienta serwerowego, cookies i odświeżania sesji. Nie ufamy samej odczytanej zawartości sesji bez wymaganej weryfikacji tokenu.
- Flagi cookies wynikają z mechanizmu sesji i sposobu odświeżania. Dla własnych cookies wyłącznie serwerowej sesji stosujemy `HttpOnly`, `Secure` w produkcji i właściwe `SameSite`. Nie narzucamy `HttpOnly` mechanizmowi SDK, który wymaga dostępu klienta, bez zmiany całego modelu sesji.
- Dla mutacji uwierzytelnianych cookies sprawdzamy origin/host i stosujemy ochronę CSRF odpowiednią do transportu. CORS nie zastępuje autoryzacji ani ochrony CSRF.
- Rate limiting obejmuje logowanie, reset hasła, wysyłkę i przyjmowanie zaproszeń oraz funkcje administracyjne. Przy wielu replikach licznik w pamięci procesu nie jest wystarczający.
- Chronione dane nie mogą trafić do współdzielonego publicznego cache. Każda decyzja o cache danych tenantów określa zakres, klucz i unieważnianie po zmianie członkostwa.

Źródło: [Supabase SSR dla Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs).

### ORM a RLS

Bezpośrednie połączenie PostgreSQL przez MikroORM **nie przejmuje automatycznie sesji JWT Supabase**. `auth.uid()` i kontekst roli nie pojawiają się przez samo użycie tego samego serwera bazy.

Połączenie runtime wymaga konta o minimalnych prawach, bez `SUPERUSER`, `BYPASSRLS` i bez własności tabel biznesowych. Konto migracyjne jest oddzielne. Jeżeli polityki wymagają kontekstu użytkownika, zaufany adapter ustawia go lokalnie w transakcji na podstawie zweryfikowanej tożsamości, nigdy z surowego payloadu. Nie ustawiamy trwałego kontekstu sesji na połączeniu wracającym do puli.

Test integracyjny musi dowodzić, że właściwe polityki działają na realnej roli runtime, kontekst nie przecieka do kolejnego requestu, a zapytania poza ustanowionym kontekstem nie ujawniają danych. Sam test na właścicielu tabel nie potwierdza RLS. Każda ścieżka dostępu przez ORM i Data API/RPC wymaga osobnego testu egzekwowania uprawnień.

`SECURITY DEFINER` wymaga minimalnych grantów, bezpiecznego `search_path`, kwalifikowanych nazw obiektów i kontroli wejścia. Nie udostępniamy funkcji administracyjnych wszystkim zalogowanym użytkownikom.

Źródła: [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Pliki, sekrety i błędy

- Publishable key może być publiczny. `service_role`, hasła DB/SMTP i sekrety integracji pozostają wyłącznie w środowisku serwerowym. `NEXT_PUBLIC_*` nie jest miejscem na sekret.
- Pliki pracowników i dokumenty wymagające autoryzacji przechowujemy prywatnie, z kontrolą praw pobrania i krótkotrwałymi signed URLs. Publiczny URL nie staje się prywatny przez ukrycie linku w UI.
- Zdjęcia, logotypy i dokumenty mają jawną klasyfikację dostępu. Publiczne URL-e są dozwolone wyłącznie dla zasobów sklasyfikowanych jako publiczne.
- Upload sprawdza rozmiar, rzeczywisty format, rozszerzenie, nazwę i zakres ścieżki. MIME przysłane przez klienta jest tylko wskazówką. SVG wymaga sanitizacji lub bezpiecznej rasteryzacji, nie samego dodania MIME do allowlist.
- Usuwanie Storage jest idempotentne i uwzględnia współdzielone dane. Baza i Storage mają osobne procedury backupu i odtworzenia.
- Logi zawierają identyfikator żądania, operację, kod błędu i bezpieczny kontekst. Nie zawierają JWT, linków zaproszeń, signed URLs, haseł ani treści dokumentów.
- Błędy Auth dla użytkownika są neutralne. Surowych komunikatów SQL, stack trace i odpowiedzi dostawców nie zwracamy do przeglądarki.
- Nie stosujemy pustego `catch`. Kompensacja, która się nie powiodła, jest rejestrowana i możliwa do ponowienia.

Źródła: [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Supabase buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## 7. Coding standards

- Włączamy `strict`, `noUncheckedIndexedAccess` i `exactOptionalPropertyTypes`. Nie rozwiązujemy błędu typów przez `any` lub nieuzasadnione `as`.
- Dane z HTTP, DB JSON i integracji traktujemy jako `unknown` do walidacji. Typ TypeScript nie waliduje runtime.
- Funkcje mają jedno zadanie i jeden poziom abstrakcji; wczesne wyjścia zamiast głębokiego zagnieżdżania.
- Preferujemy `const`, jawne wyniki publicznych kontraktów i typowane obiekty opcji zamiast nieczytelnych argumentów boolean.
- `null`, brak pola i pusty string mają zdefiniowane znaczenie. PATCH nie zeruje niewysłanych pól.
- Nazwy, komentarze i identyfikatory kodu są angielskie. Teksty produktu są po polsku i mają przygotowane miejsce do lokalizacji; komentarz wyjaśnia nieoczywiste „dlaczego”.
- Promise jest oczekiwany lub ma świadomie obsłużony lifecycle. Operacji krytycznej nie uruchamiamy przez niezarejestrowane `void sendEmail()` po odpowiedzi HTTP.
- Wartości limitów, statusów i progów mają nazwane definicje. Nie powielamy ich w formularzu, usłudze i tabeli.
- Nie wprowadzamy globalnych wyjątków lint, martwego kodu, debug logów i komentarzy z zakomentowaną implementacją.
- Formatowanie dotyczy zmienianego zakresu. PR ma jeden zrozumiały cel, bez przypadkowych rename i aktualizacji zależności.
- Pakiety współdzielone eksportują źródła TypeScript przez jawne `exports`. Sprawdzamy działanie kompilacji i runnerów; samo `exports` nie zapewnia zgodności każdego narzędzia.
- Konfiguracja środowiska jest walidowana centralnie. Next.js i narzędzia DB korzystają ze wspólnego loadera opartego na `@next/env`. `.env.example` zawiera tylko bezpieczne przykłady.
- MikroORM działa wyłącznie po stronie serwera, z konfiguracją `serverExternalPackages` i jawną listą encji. Build nie wymaga aktywnej produkcyjnej bazy; prywatnych danych nie odczytujemy podczas statycznego generowania stron.

Źródła: [Next.js serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages), [MikroORM i Next.js](https://mikro-orm.io/docs/usage-with-nextjs).

## 8. Jak dodać nową funkcję

Procedura dla operacji edycji danych pracownika:

1. Sprawdź istniejący kontrakt SQL/RPC, zakres grupy, reguły planu i audit. Zapisz kryteria akceptacji i przypadki odmowy.
2. Dodaj schemat wejścia w `core/src/validators/employees/` i wymagane DTO. Przyjmuj tylko pola edytowalne przez tę operację.
3. Dodaj lub rozszerz przypadek użycia `EmployeeService`. Korzystaj z polityki dostępu oraz portu repozytorium, bez importu MikroORM i HTTP.
4. Zaimplementuj port w `db/src/repositories/employees/`. Encję dodaj tylko wtedy, gdy funkcja faktycznie wymaga nowego mapowania. Zmianę DB opisz osobną, przejrzaną migracją.
5. Zarejestruj adapter i usługę jawnie w composition root. Operacja atomowa korzysta z jednego kontekstu transakcyjnego.
6. W `app` dodaj Route Handler lub Server Action: sesja, walidacja, wywołanie przypadku użycia, mapowanie wyniku. Nie kopiuj reguł uprawnień.
7. Zbuduj UI z istniejących prymitywów. Dane domenowe i schematy wiąże warstwa `app`, a generyczne komponenty `ui` dostają propsy.
8. Dodaj testy reguły, izolacji dostępu i najważniejszego zachowania użytkownika. Przy zmianie współbieżności test używa dwóch niezależnych transakcji.

## 9. Struktura pakietów

Każda odpowiedzialność ma wyznaczone miejsce w strukturze pakietów. Foldery tworzymy tylko wtedy, gdy powstaje odpowiednia funkcja.

```text
packages/
  app/
    next.config.ts
    src/
      app/
        layout.tsx
        (frontend)/
          page.tsx
        (backend)/backend/
          layout.tsx
          page.tsx
          groups/page.tsx
          groups/[groupId]/page.tsx
          employees/page.tsx
          requirements/page.tsx
          reminders/page.tsx
          history/page.tsx
          notifications/page.tsx
          settings/page.tsx
          account/page.tsx
        api/
          health/route.ts
          groups/[groupId]/employees/route.ts
          groups/[groupId]/invitations/route.ts
          groups/[groupId]/transfer-ownership/route.ts
      features/
        employees/{components,actions}/
        groups/{components,actions}/
      lib/api/api-call.ts
      server/
        container.ts
        auth/require-session.ts
        http/api-handler.ts
        adapters/mail/
        adapters/storage/

  core/
    src/
      config/env.ts
      di/{container,types}.ts
      contracts/index.ts
      errors/app-error.ts
      domain/
        employees/
        groups/
        departments/
        requirements/
      policies/
        group-access.policy.ts
        account-plan.policy.ts
      services/
        employees/employee.service.ts
        groups/group.service.ts
        invitations/invitation.service.ts
        reminders/deadline-status.ts
      ports/
        employees/employee.repository.ts
        groups/group.repository.ts
        mail/mail.gateway.ts
        storage/file-storage.port.ts
        transactions/unit-of-work.port.ts
      validators/
        employees/employee-update.schema.ts
        invitations/invitation-create.schema.ts

  db/
    src/
      config.ts
      di.ts
      entities/
        index.ts
        employees/employee.entity.ts
        groups/employee-group.entity.ts
        groups/group-member.entity.ts
        departments/group-department.entity.ts
      repositories/
        employees/mikro-orm-employee.repository.ts
        groups/mikro-orm-group.repository.ts
      transactions/mikro-orm-unit-of-work.ts

  ui/
    src/
      components/                     # prymitywy shadcn
      backend/
        forms/
        tables/
        feedback/
      lib/cn.ts
      styles/globals.css

supabase/
  migrations/                         # migracje schematu SQL
```

Pozostałe domeny, np. `audit-history`, `notifications`, `accounts`, otrzymują foldery dopiero wraz z implementacją. Dla nowych domen stosujemy ten sam podział odpowiedzialności i konwencję nazw tras.

## 10. Testy i checklista code review

### Testy proporcjonalne do ryzyka

| Warstwa | Co sprawdzamy |
|---|---|
| Unit | Stany terminów, walidacja pól, reguły planu, decyzje policy, przypadki użycia z portami testowymi |
| Integracja DB | Constraints, RLS/granty na roli runtime, izolacja tenantów i grup, atomowość, wyścigi limitów i transferu |
| API | Brak sesji, odmowa dostępu, walidacja, mass assignment, konflikty, ograniczona paginacja, neutralny błąd |
| UI | Edycja, walidacja, loading/error/empty, wielokrotny submit, klawiatura i focus |
| E2E | Logowanie, grupa i pracownik, zaproszenie, viewer bez edycji, utrata dostępu po odebraniu członkostwa |
| Zadania i integracje | Powtórna dostawa, timeout dostawcy, retry i brak duplikacji audytu/outboxa |

Testy integracyjne używają izolowanej bazy, nie produkcyjnego projektu Supabase ani produkcyjnego endpointu pocztowego. Test uprawnień wykonany wyłącznie kontem administracyjnym nie jest testem izolacji.

CI udostępnia kroki: lint, typecheck, testy jednostkowe, integracja PostgreSQL i build. Testy E2E obejmują krytyczne przepływy dotknięte zmianą. Podstawowe skrypty uruchamiane z katalogu głównego to `npm run lint`, `npm run typecheck` i `npm run build`; skrypty testowe mają jednoznacznie wskazywać rodzaj uruchamianych testów.

Testy na PGlite lub z symulowaną integracją nie zastępują weryfikacji rzeczywistego PostgreSQL, Auth i Storage. Raport walidacji podaje środowisko, zakres i rzeczywisty wynik wykonanych kontroli. Nie deklarujemy wyniku testu, którego nie uruchomiono. Dla zmiany dokumentacji wystarcza kontrola treści, odwołań i diffu.

Źródła: [Vitest](https://vitest.dev/guide/), [Playwright best practices](https://playwright.dev/docs/best-practices).

### Checklista review

- [ ] Zmiana realizuje określone wymaganie Validuo i mieści się w zakresie zadania.
- [ ] Kierunek `app -> db -> core`, `app -> core`, `app -> ui` jest zachowany; brak importów ORM w `core` i klientach.
- [ ] Chroniona operacja sprawdza sesję oraz konkretne członkostwo, rolę i plan. Błąd sprawdzenia odmawia dostępu.
- [ ] Tenant, aktor i prawa nie pochodzą bez weryfikacji z payloadu. Jest test obcego użytkownika/grupy.
- [ ] Schemat wejścia odrzuca niedozwolone pola. Encje i surowe błędy nie trafiają do klienta.
- [ ] Operacja wieloetapowa ma poprawną granicę transakcji; przypadek współbieżny jest sprawdzony, jeśli dotyczy zmiany.
- [ ] Audit i outbox powstają raz, a retry integracji nie dubluje skutków.
- [ ] Usunięcie grupy/pracownika/konta uwzględnia współdzielenie i pliki.
- [ ] Terminy mają spójne znaczenie, datę odniesienia i test graniczny.
- [ ] Lista ma ograniczony rozmiar, stabilne sortowanie i brak N+1.
- [ ] UI obsługuje błąd, brak danych, brak dostępu, zapis i dostęp z klawiatury.
- [ ] Sekrety, tokeny zaproszeń i prywatne dane nie trafiają do logów, cache publicznego ani bundle klienta.
- [ ] SQL zachowuje polityki, granty i triggery; migrator i rola runtime są jawne.
- [ ] Wykonano kontrole odpowiednie do zmiany, a opis podaje rzeczywisty wynik i ograniczenia.
