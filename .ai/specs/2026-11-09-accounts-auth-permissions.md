# Konta, logowanie i katalog uprawnień

## 📝 TLDR
Validuo nie ma jeszcze kont, logowania ani uprawnień, a standard zabrania zgadywania ich treści w kodzie. Ta specyfikacja ustala (jako **propozycję do akceptacji właściciela**) mechanizm logowania, model konta i osób oraz katalog zakresów i czynności uprawnień. Bez niej nie da się zaspecyfikować historyjek E02 (#22–#24), które zakładają „osobę z uprawnieniem”. Opisuje przyszłe zachowanie; nic z tego jeszcze nie istnieje.

## 📝 Open Questions
Rozstrzygnięte autonomicznie — patrz „Resolved assumptions (autonomous defaults)” na końcu. Wszystkie wymagają potwierdzenia właściciela.

## 📝 Problem Statement
- Historyjki E02 (#22–#24) wymagają osoby z uprawnieniem do tworzenia działów i wymagań (`[DOCUMENT]` backlog.md, product-brief R01, D06).
- `engineering-standards.md` („Konta, osoby i uprawnienia”, „Sesja i autoryzacja”) wymaga osobnych, zaakceptowanych specyfikacji produktu dla mechanizmu uwierzytelniania i katalogu uprawnień; w repo ich nie ma (`[PRODUCT]`).
- Dowodu, że użytkownicy chcą dokładnie takiego modelu, nie ma: brief opiera się na jednym koncie autora (A03). Model jest więc propozycją o najmniejszym zakresie, nie wynikiem badań.

## 📝 Proposed Solution
Najmniejszy model, który spełnia zasady standardu:

1. **Konto** (tenant) powstaje przy rejestracji; rejestrujący jest pierwszą **osobą** i ma pełne uprawnienia.
2. **Logowanie:** e-mail + hasło, własna usługa na sprawdzonych bibliotekach (haszowanie hasła algorytmem Argon2id), **sesja w bazie** (nieprzezroczysty token w cookie; w bazie tylko jego skrót).
3. **Uprawnienie** = (osoba, zakres, czynność). Zakresy: `account`, `group`. Czynności: `read`, `write`, `manage_permissions`. Uprawnienie na zakresie `account` obejmuje wszystkie grupy konta. Działy i pracownicy dziedziczą zakres swojej grupy (brak uprawnień per dział i per pracownik w v1).
4. **Polityka** `access.policy.ts` w `core`: sprawdza zweryfikowanego aktora, konto, zakres i czynność; brak uprawnienia = odmowa.

**Rozważone alternatywy:**
- Gotowa biblioteka uwierzytelniania (np. Auth.js, Better Auth): szybsza, ale to nowa zależność i własny model sesji/użytkownika obok MikroORM; wymaga zgody człowieka wg AGENTS.md.
- Role (`owner/admin/viewer`): odrzucone — standard wymaga uprawnień nadawanych osobie, nie ról.
- Uprawnienia per dział: odroczone (nic w D06–D08 tego nie wymaga).

## 📝 Architecture
- `core/src/services/access/`: `AccessPolicy` (czysta funkcja decyzji), katalog `PERMISSION_SCOPES` i `PERMISSION_ACTIONS` jako nazwane stałe, przypadki użycia `RegisterAccount`, `SignIn`, `SignOut`, `GrantPermission`, `RevokePermission`, porty `AccountRepository`, `PersonRepository`, `SessionRepository`, `PermissionRepository`, `PasswordHasher`, `Clock`.
- `db`: encje i adaptery `MikroOrm*Repository`; hasher jako adapter w `app/src/server/adapters/` (zależność npm tylko w `app`).
- `app`: Route Handlers owinięte `apiHandler`, strona logowania/rejestracji w `(frontend)`, funkcja `requireSession()` w `src/server/` używana przez każdą chronioną operację.
- Kierunek zależności bez zmian: `app → db → core`, `app → core`, `app → ui`.

## 📝 Data Model
Tabele snake_case, liczba mnoga; każda z `account_id` poza `accounts`.
- `accounts` (id, name, created_at).
- `persons` (id, account_id, email unikalny w całym systemie, display_name, password_hash, created_at). E-mail znormalizowany do małych liter.
- `sessions` (id, person_id, token_hash unikalny, created_at, expires_at, revoked_at).
- `permissions` (id, account_id, person_id, scope_type, scope_id nullable dla `account`, action, granted_by_person_id, created_at); unikalność (person_id, scope_type, scope_id, action).
- `login_attempts` (klucz: znormalizowany e-mail + okno czasu, licznik) — trwałe limitowanie prób.
Migracja MikroORM z constraintami i indeksami. Grupy (`groups`) powstają w specyfikacji E02; `scope_id` dla `group` wskazuje je dopiero po ich dodaniu, dlatego `scope_type = group` jest w v1 dostępne tylko w modelu, nie w API (Q: patrz założenie 5).

## 📝 API Contracts
- `POST /api/auth/register` {email, password, accountName, displayName} → 201 + cookie sesji.
- `POST /api/auth/sign-in` {email, password} → 200 + cookie; 401 przy błędnych danych (komunikat neutralny), 429 przy limicie.
- `POST /api/auth/sign-out` → 204, unieważnia sesję po stronie serwera.
- `POST /api/permissions` {personId, scope, action}, `DELETE /api/permissions/{id}` → 204; wymagają `manage_permissions`.
Walidacja Zod (długość hasła min. 12 znaków, bez górnego limitu poniżej 128, limity długości pól). Odpowiedzi `ApiResult<T>`.

## 📝 UI/UX
Strony publiczne `/sign-in` i `/register` w `(frontend)` (klasy Tailwind, bez komponentów `@validuo/ui`). Stany: ładowanie, błąd walidacji pól, błędne dane logowania, limit prób, sukces. Etykiety, fokus i obsługa klawiatury; układ < 700 / 700–1099 / ≥ 1100 px. Brak mockupów — standardowe formularze; weryfikacja w przeglądarce przy implementacji.

## 📝 Edge Cases & Failure Scenarios
- Rejestracja istniejącego e-maila: neutralny komunikat bez ujawniania, czy konto istnieje (`[ASSUMPTION]` do potwierdzenia).
- Odebranie ostatniego `manage_permissions` w koncie: odmowa.
- Nadanie uprawnienia, którego nadający nie ma, lub podniesienie własnych uprawnień: odmowa.
- Wygasła lub unieważniona sesja: 401; zmiana uprawnień obowiązuje od następnego żądania (nic nie jest kopiowane do sesji).
- Wyścig dwóch odebrań uprawnień ostatniej osobie: ochrona transakcją i blokadą wiersza; test na dwóch transakcjach.
- Atak siłowy na logowanie: limit prób w bazie (działa przy wielu replikach).

## 📝 Risks & Impact Review
- **Trudne do odwrócenia:** schemat uprawnień i format tokenu sesji; zmiana modelu po wdrożeniu wymaga migracji danych.
- **Bezpieczeństwo:** własna usługa logowania to ryzyko; ograniczone użyciem sprawdzonych bibliotek (Argon2id, losowy token z `crypto`), brakiem własnej kryptografii, testami integracyjnymi (izolacja kont, limit prób, unieważnienie sesji).
- **Poza zakresem v1 (świadomie):** zaproszenia osób do konta (do czasu osobnej specyfikacji jedyną osobą z uprawnieniami jest założyciel), reset hasła i weryfikacja e-mail (wymaga poczty), uprawnienia per dział/pracownik, szablony uprawnień, audyt, administrowanie wieloma kontami.
- Decyzja o mechanizmie logowania i katalogu to **decyzja produktowa właściciela**, nie naruszenie reguł repo.

## 📝 Decisions in play
Zależności: D01 (właściciel decyduje o zakresie), D06 (grupa i działy). Nie zmienia R01–R04 ani N01–N02. Model „bez planów i poziomów kont” z `2026-10-23-permissions-model.md` zostaje zachowany. Właściciel musi zatwierdzić założenia 1–6.

## 📋 Phasing
- **Phase 1:** domena `access` w `core` (katalog, polityka, porty) — bez bazy i UI.
- **Phase 2:** persystencja w `db` (encje, migracja, repozytoria).
- **Phase 3:** rejestracja, logowanie, sesja i wylogowanie (API + strony).
- **Phase 4:** nadawanie i odbieranie uprawnień (API) oraz `requireSession()` dla pozostałych funkcji.

## 📋 Implementation Plan
**Phase 1**
1. Stałe katalogu uprawnień i typy zakresu/czynności w `core`; testy jednostkowe 100%.
2. `AccessPolicy` (zakres `account` obejmuje `group`; fail closed) z testami tabelarycznymi.
3. Przypadki użycia `GrantPermission`/`RevokePermission` na portach testowych: reguły „nie nadajesz, czego nie masz”, „nie odbierasz ostatniej osobie zarządzającej”.

**Phase 2**
4. Encje `accounts`, `persons`, `sessions`, `permissions`, `login_attempts` + wpis w `entities/index.ts`.
5. Migracja MikroORM z constraintami i indeksami; test integracyjny migracji na PostgreSQL 17.
6. Adaptery `MikroOrm*Repository` (zapytania zawsze ze scope konta) + testy integracyjne izolacji kont.

**Phase 3**
7. Adapter `PasswordHasher` (Argon2id) i generator tokenów sesji w `app/src/server/adapters/`; licencja zależności zgodna z AGPL.
8. Przypadki użycia `RegisterAccount`, `SignIn`, `SignOut` + limit prób; unit 100%.
9. Route Handlers `register`/`sign-in`/`sign-out` przez `apiHandler`; ciasteczka `HttpOnly`, `Secure` w produkcji, `SameSite=Lax`; kontrola origin dla mutacji.
10. Strony `/sign-in` i `/register`; test przeglądarkowy głównej ścieżki.

**Phase 4**
11. `requireSession()` + przypadek użycia zwracający aktora z uprawnieniami (czytanymi z bazy przy każdym żądaniu).
12. Route Handlers `POST /api/permissions`, `DELETE /api/permissions/{id}`; test współbieżności odbierania uprawnień.

## Resolved assumptions (autonomous defaults)
| # | Pytanie | Przyjęta odpowiedź | Dlaczego | Status |
|---|---|---|---|---|
| 1 | Mechanizm logowania | e-mail + hasło, Argon2id, sesja w bazie | najmniejsza powierzchnia, bez nowej biblioteki auth | ⚠ NEEDS HUMAN CONFIRMATION |
| 2 | Zakresy i czynności | zakresy `account`, `group`; czynności `read`, `write`, `manage_permissions` | najmniejszy katalog pokrywający E02 | ⚠ NEEDS HUMAN CONFIRMATION |
| 3 | Dziedziczenie | dział i pracownik dziedziczą zakres grupy | nic w D06–D08 nie wymaga drobniejszych uprawnień | ⚠ NEEDS HUMAN CONFIRMATION |
| 4 | Zaproszenia, reset hasła, weryfikacja e-mail | poza v1 | wymagają poczty i osobnej specyfikacji | ⚠ NEEDS HUMAN CONFIRMATION |
| 5 | `group` w API | model gotowy, API po dodaniu grup (E02) | grupy jeszcze nie istnieją | zaakceptowane domyślnie |
| 6 | Długość hasła | min. 12 znaków | zalecenie bezpieczeństwa, brak wymagań właściciela | zaakceptowane domyślnie |
