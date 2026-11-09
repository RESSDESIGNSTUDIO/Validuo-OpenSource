# Konta, logowanie i katalog uprawnień

## 📝 TLDR
Validuo nie ma jeszcze kont, logowania ani uprawnień, a standard zabrania zgadywania ich treści w kodzie. Ta specyfikacja opisuje (zaakceptowany przez właściciela 2026-11-09) minimalny fundament: rejestrację konta, logowanie e-mail + hasło z sesją w bazie, katalog zakresów i czynności oraz politykę dostępu `read`/`write`. Bez tego nie da się zaspecyfikować historyjek E02 (#22–#24). Opisuje przyszłe zachowanie; nic z tego jeszcze nie istnieje. Nadawanie uprawnień innym osobom i zaproszenia są **poza v1** (osobna specyfikacja), ale reguły nadawania są tu zapisane jako normatywne dla niej.

## 📝 Open Questions
Brak otwartych. Q1–Q4 oraz wartości domyślne rozstrzygnął właściciel projektu 2026-11-09 (patrz „Resolved decisions” na końcu). Jedyne, co zostaje do potwierdzenia przy implementacji, to wybór konkretnej biblioteki Argon2 jako nowej zależności (krok 4).

## 📝 Problem Statement
- Historyjki E02 (#22–#24) wymagają osoby z uprawnieniem (`[DOCUMENT]` backlog.md, brief R01, D06).
- `engineering-standards.md` („Konta, osoby i uprawnienia”, „Sesja i autoryzacja”) wymaga osobnych, zaakceptowanych specyfikacji produktu dla mechanizmu uwierzytelniania i katalogu uprawnień; w repo ich nie ma. `[PRODUCT]`
- Brief nie ma podpisanego Definition of Ready (A03: jedno konto autora). Ta specyfikacja to propozycja; nie przenosić do `implemented/` bez akceptacji właściciela.

## 📝 Proposed Solution
1. **Konto** (tenant) powstaje przy rejestracji. Rejestrujący dostaje **użytkownika** (tożsamość logowania) i **osobę** (członkostwo w koncie) z pełnymi uprawnieniami.
2. **Tożsamość i członkostwo rozdzielone:** `users` (e-mail, hasło) i `persons` (członek konta). W v1 użytkownik ma jedno konto, ale model nie wymaga migracji przy zaproszeniach.
3. **Logowanie:** e-mail + hasło, Argon2id, sesja w bazie (nieprzezroczysty token w cookie, w bazie jego skrót).
4. **Uprawnienie** = (osoba, zakres, czynność). Zakresy: `account`, `group`; `department` i `employee` nie mają własnych uprawnień — polityka dostaje **grupę nadrzędną zasobu** i sprawdza zakres `group` (lub `account`). Uprawnienie na `account` obejmuje wszystkie grupy. Czynności: `read`, `write`, `manage_permissions`. To odstępstwo od #28 (osobne uprawnienia per dział/pracownik) — do potwierdzenia (Q3).
5. **Polityka** w `core`: aktor + konto + zakres + czynność; brak uprawnienia = odmowa; błąd odczytu uprawnień lub sesji = odmowa.

**Rozważone alternatywy:** gotowa biblioteka auth (Auth.js, Better Auth) — szybsza, ale nowa zależność i własny model sesji obok MikroORM, wymaga zgody człowieka; role `owner/admin/viewer` — sprzeczne ze standardem (uprawnienia osoby); uprawnienia per dział/pracownik — nic w D06–D08 tego nie wymaga.

## 📝 Architecture
Ścieżki wg rozdz. 9 standardu; nazwa domeny `accounts` we wszystkich warstwach.
- `core/src/policies/access.policy.ts` — `AccessPolicy`; `core/src/permissions/catalog.ts` — stałe zakresów i czynności.
- `core/src/ports/accounts/` — `account.repository.ts`, `user.repository.ts`, `person.repository.ts`, `session.repository.ts`, `permission.repository.ts`, `login-attempt.repository.ts`; `core/src/ports/security/` — `password-hasher.port.ts`, `token-generator.port.ts`, `clock.port.ts`; `core/src/ports/transactions/unit-of-work.port.ts` (kontrakt transakcyjny — **jeszcze nie istnieje**, powstaje w pierwszym kroku).
- `core/src/services/accounts/` — `account.service.ts` (rejestracja), `auth.service.ts` (logowanie, wylogowanie, uwierzytelnienie sesji); `core/src/validators/accounts/` — schematy Zod.
- `db/src/entities/accounts/*.entity.ts`, `db/src/repositories/accounts/mikro-orm-*.ts`, `db/src/transactions/mikro-orm-unit-of-work.ts`.
- `app/src/server/auth/require-session.ts` (z `import "server-only"`), `app/src/server/adapters/password/` (Argon2id), `app/src/server/http/origin-check.ts` (CSRF), nowe publiczne moduły → wpisy w `exports`.
- **DI (Awilix):** singleton — `passwordHasher`, `tokenGenerator`, `clock`; scoped — `em`, repozytoria, `unitOfWork`, `actor` (aktor żądania), `accountService`, `authService`. Rejestracje: `dbRegistrations(config)` + rejestracje composition root. Usługi nie wołają `container.resolve()`.
- Kierunek zależności bez zmian; `core` nie przyjmuje `EntityManager`.

## 📝 Data Model
Tabele snake_case w liczbie mnogiej. Integralność tenantów wymuszona w bazie złożonymi kluczami.
- `accounts` (id, name, created_at).
- `users` (id, email — unikalny po normalizacji do małych liter, password_hash, created_at).
- `persons` (id, account_id → accounts, user_id → users, display_name, created_at); `UNIQUE (id, account_id)`, `UNIQUE (account_id, user_id)`.
- `sessions` (id, person_id, account_id, token_hash UNIQUE, created_at, last_seen_at, expires_at, revoked_at); FK `(person_id, account_id) → persons (id, account_id)`; indeks po `expires_at`.
- `permissions` (id, account_id, person_id, scope_type, scope_id **NOT NULL**, action, granted_by_person_id, created_at); FK `(person_id, account_id) → persons (id, account_id)`; dla `account` `scope_id = account_id`; `UNIQUE (person_id, scope_type, scope_id, action)`; CHECK `scope_type`/`action` na wartościach katalogu. W v1 dozwolone tylko `scope_type = 'account'` (CHECK); `group` dochodzi migracją razem z tabelą `groups` w E02, z FK `(scope_id, account_id) → groups`.
- `login_attempts` (key_hash, kind: `email`|`ip`|`register_ip`, window_start, count) — atomowy upsert, zapis w osobnej transakcji (przeżywa rollback), czyszczenie leniwe po oknie.
Migracja MikroORM z constraintami i indeksami; dane wejściowe nigdy z payloadu do `em.assign`.

## 📝 API Contracts
- `POST /api/auth/register` {email, password, accountName, displayName} → 201 + cookie. Zajęty e-mail → 409 `ConflictError` (komunikat „Ten adres e-mail jest już zajęty”; decyzja Q2).
- `POST /api/auth/sign-in` {email, password} → 200 + cookie; błędne dane → 401 `UnauthorizedError` (komunikat neutralny, stały czas — dla nieistniejącego e-maila wykonywane fikcyjne haszowanie); limit → 429 (`HttpError`, błąd transportu).
- `POST /api/auth/sign-out` → 204, unieważnia sesję po stronie serwera.
Walidacja Zod: hasło 12–128 znaków (sprawdzane **przed** haszowaniem), limity długości pozostałych pól; błędy pól → 422 `ValidationError`. Odpowiedzi `ApiResult<T>`.

## 📝 UI/UX
Strony `/sign-in` i `/register` w `(frontend)` (klasy Tailwind, bez `@validuo/ui/components`). Formularz (Client Component) wywołuje Route Handlery przez `fetch`; `apiHandler` rozszerzony o ustawianie `Set-Cookie`. Stany: ładowanie, błąd pól, błędne dane, limit prób, zajęty e-mail, sukces. Etykiety, fokus, klawiatura; układ < 700 / 700–1099 / ≥ 1100 px. Bez mockupów — standardowe formularze.

## 📝 Security Design
- **Hasło:** biblioteka `@node-rs/argon2` (MIT) lub równoważna o zgodnej licencji — wybór i uzasadnienie nowej zależności potwierdza człowiek; natywny pakiet dopisany do `serverExternalPackages`; parametry Argon2id m=19 MiB, t=2, p=1; `needsRehash` przy zmianie parametrów.
- **Sesja:** token 32 B z `crypto.randomBytes`, w bazie SHA-256 tokenu; ważność 30 dni absolutnie i 7 dni bezczynności (`last_seen_at`); nowy token przy każdym logowaniu; wylogowanie, zmiana hasła i odebranie dostępu unieważniają sesje po stronie serwera. Cookie: `__Host-validuo_session` w produkcji (`Secure`, `Path=/`, bez `Domain`), `HttpOnly`, `SameSite=Lax`; w dev (http) nazwa bez prefiksu. Wymagane HTTPS (+ HSTS) za proxy — wpis w README.
- **CSRF:** `origin-check.ts` w `apiHandler` dla POST/PUT/PATCH/DELETE: nagłówek `Origin` musi równać się `APP_ORIGIN`; brak `Origin` = 403 (fail closed); dotyczy także `sign-in` i `register` (login CSRF). Nowa zmienna `APP_ORIGIN` → `core/src/config/env.ts`, `.env.example`, README.
- **Limity prób** (wartości domyślne do potwierdzenia): logowanie — 5 nieudanych prób / 15 min na znormalizowany e-mail i 20 / 15 min na IP → blokada do końca okna; rejestracja — 5 / godzinę na IP. IP z `x-forwarded-for` tylko gdy ustawiono `TRUSTED_PROXY=true` (env), inaczej adres połączenia. Blokada e-maila nie ujawnia, czy konto istnieje.
- **Logi:** zdarzenia `auth.sign_in.failed`, `auth.sign_in.blocked`, `auth.register.created`, `auth.sign_out` z `requestId`; bez haseł, tokenów i pełnych e-maili (skrót lub zamaskowany).
- **Fail closed:** błąd odczytu sesji lub uprawnień blokuje chronioną operację.

## 📝 Edge Cases & Failure Scenarios
- Rejestracja zajętego e-maila: 409 (Q2); wyścig dwóch rejestracji tego samego e-maila — jedna kończy się naruszeniem `UNIQUE` mapowanym na 409, bez częściowo utworzonego konta (rejestracja w jednej transakcji: konto, użytkownik, osoba, uprawnienia).
- Wygasła/unieważniona sesja: 401; zmiana uprawnień obowiązuje od następnego żądania (uprawnienia czytane z bazy, nie z sesji).
- Hasło 10 MB: odrzucone walidacją długości przed haszowaniem.
- Atak siłowy / password spraying: limity per e-mail i per IP; wyścig na liczniku — atomowy upsert.
- Rejestracja tworzy dokładnie trzy uprawnienia `account`: `read`, `write`, `manage_permissions`.

## 📝 Access rules (normatywne dla specyfikacji nadawania uprawnień)
Poza v1 nie ma API nadawania, ale reguły są ustalone teraz, żeby model danych ich nie blokował:
| Reguła | Treść |
|---|---|
| Nadawanie | Nadajesz tylko parę (zakres, czynność), którą sam masz, w zakresie nie szerszym niż Twój; `manage_permissions` na `group` nie pozwala nadawać uprawnień na `account`. |
| Odbieranie | Odbierasz tylko uprawnienia w zakresie, w którym masz `manage_permissions`. |
| Eskalacja | Nikt nie podnosi własnych uprawnień. |
| Ostatni zarządzający | Odebranie ostatniego `manage_permissions` na `account` jest odmową; każda mutacja uprawnień konta blokuje wiersz `accounts` (`SELECT … FOR UPDATE`) na początku transakcji (chroni przed write skew); test na dwóch transakcjach. |
| Implikacje | `manage_permissions` nie implikuje `read`/`write`. |

## 📝 Risks & Impact Review
- **Trudne do odwrócenia:** schemat uprawnień i format tokenu sesji. Rozdzielenie `users`/`persons` ogranicza koszt zaproszeń.
- **Bezpieczeństwo:** własna usługa logowania; ograniczana sprawdzonymi bibliotekami, brakiem własnej kryptografii i testami integracyjnymi (izolacja kont, limity, unieważnianie sesji).
- **Poza v1:** zaproszenia, API nadawania/odbierania uprawnień, reset hasła, weryfikacja e-mail, uprawnienia per dział/pracownik, szablony uprawnień, audyt (kolumna `granted_by_person_id` przygotowana pod niego).
- Model oparty na jednym koncie autora (A03).

## 📝 Decisions in play
D01, D06; bez zmian R01–R04, N01–N02; model „bez planów i poziomów kont” z `implemented/2026-10-23-permissions-model.md` zachowany. Q1–Q4 i wartości limitów zatwierdził właściciel 2026-11-09.

## 📋 Phasing
- **Phase 1:** rejestracja i logowanie od końca do końca (pionowy wycinek: core + db + app + strony).
- **Phase 2:** `requireSession()`, aktor i polityka `read`/`write` dla kolejnych funkcji (E02).

## 📋 Implementation Plan
**Phase 1**
1. Kontrakt `UnitOfWork`, porty `accounts`/`security`, katalog zakresów i czynności; testy jednostkowe 100%.
2. Encje + migracja (`accounts`, `users`, `persons`, `permissions`, `sessions`, `login_attempts`) z kluczami złożonymi i CHECK; test integracyjny migracji na PostgreSQL 17 (w tym izolacja kont: nie da się nadać uprawnienia osobie z innego konta).
3. Adaptery `MikroOrm*Repository` i `MikroOrmUnitOfWork`; testy jednostkowe z mockiem `em` (utrzymują próg 100%) oraz integracyjne. Przed krokiem sprawdzić w `vitest.config.ts`, co liczy się do pokrycia `db/src`.
4. `PasswordHasher` (Argon2id) i `TokenGenerator` w `app/src/server/adapters/`; wpis w `serverExternalPackages`; nowe zmienne env (`APP_ORIGIN`, `TRUSTED_PROXY`).
5. `AccountService` (rejestracja w jednej transakcji), `AuthService` (logowanie ze stałym czasem, limity, wylogowanie); unit 100%.
6. `origin-check.ts` i obsługa `Set-Cookie` w `apiHandler`; testy.
7. Route Handlers `register`/`sign-in`/`sign-out` przez `apiHandler`; test integracyjny końca do końca.
8. Strony `/sign-in`, `/register`; test przeglądarkowy głównej ścieżki.

**Phase 2**
9. `requireSession()` i rejestracje DI aktora (scoped), odczyt uprawnień przy każdym żądaniu.
10. `AccessPolicy` dla `read`/`write` z rozwiązywaniem zakresu przez grupę nadrzędną; testy tabelaryczne (w tym odmowa dla braku uprawnienia i dla innego konta).

## Resolved decisions (właściciel projektu, 2026-11-09)
| # | Pytanie | Decyzja | Status |
|---|---|---|---|
| Q1 | Mechanizm logowania | własna usługa: e-mail + hasło, Argon2id, sesja w bazie | zaakceptowane (opcja rekomendowana) |
| Q2 | Rejestracja zajętego e-maila | komunikat „e-mail zajęty” + limity prób | zaakceptowane (opcja rekomendowana) |
| Q3 | Katalog | `account`/`group` × `read`/`write`/`manage_permissions`; dział i pracownik przez grupę | zaakceptowane (opcja rekomendowana) |
| Q4 | Poza v1 | zaproszenia, nadawanie uprawnień, reset hasła, weryfikacja e-mail | zaakceptowane (opcja rekomendowana) |
| 5 | Limity, TTL sesji, parametry Argon2id | wartości domyślne z „Security Design” | zaakceptowane (opcja rekomendowana) |
| 6 | Długość hasła | 12–128 znaków | zaakceptowane (opcja rekomendowana) |
