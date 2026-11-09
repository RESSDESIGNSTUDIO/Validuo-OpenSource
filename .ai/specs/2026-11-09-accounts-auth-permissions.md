# Konta, logowanie i katalog uprawnień

## 📝 TLDR
Validuo nie ma jeszcze kont, logowania ani uprawnień, a standard zabrania zgadywania ich treści w kodzie. Ta specyfikacja opisuje (zaakceptowany przez właściciela 2026-11-09) minimalny fundament: rejestrację konta, logowanie e-mail + hasło z sesją w bazie, katalog zakresów i czynności oraz politykę dostępu `read`/`write`. Bez tego nie da się zaspecyfikować historyjek E02 (#22–#24). Opisuje przyszłe zachowanie; nic z tego jeszcze nie istnieje. Nadawanie uprawnień innym osobom i zaproszenia są **poza v1** (osobna specyfikacja), ale reguły nadawania są tu zapisane jako normatywne dla niej.

## 📝 Open Questions
Brak otwartych. Q1–Q4 oraz wartości domyślne rozstrzygnął właściciel projektu 2026-11-09 (patrz „Resolved decisions” na końcu). Biblioteka Argon2 (`@node-rs/argon2`, MIT) zatwierdzona przez właściciela 2026-11-09. Q1–Q4 dotyczą tej specyfikacji i nie są tożsame z Q01–Q07 z briefu.

## 📝 Problem Statement
- Historyjki E02 (#22–#24) wymagają osoby z uprawnieniem (`[DOCUMENT]` backlog.md, brief R01, D06).
- `engineering-standards.md` („Konta, osoby i uprawnienia”, „Sesja i autoryzacja”) wymaga osobnych, zaakceptowanych specyfikacji produktu dla mechanizmu uwierzytelniania i katalogu uprawnień; w repo ich nie ma. `[PRODUCT]`
- Brief nie ma podpisanego Definition of Ready (A03: jedno konto autora). Zakres zaakceptował właściciel (2026-11-09); do `implemented/` przenosimy dopiero po wdrożeniu.

## 📝 Proposed Solution
1. **Konto** (tenant) powstaje przy rejestracji. Rejestrujący dostaje **użytkownika** (tożsamość logowania) i **osobę** (członkostwo w koncie) z pełnymi uprawnieniami.
2. **Tożsamość i członkostwo rozdzielone:** `users` (e-mail, hasło) i `persons` (członek konta). W v1 użytkownik ma **dokładnie jedno konto** (wymuszone w bazie: `UNIQUE (user_id)` na `persons`); wybór konta przy logowaniu dopiero w specyfikacji zaproszeń, gdzie to ograniczenie zostanie zdjęte. Rozdzielenie tabel to przygotowanie, nie obecna funkcja.
3. **Logowanie:** e-mail + hasło, Argon2id, sesja w bazie (nieprzezroczysty token w cookie, w bazie jego skrót).
4. **Uprawnienie** = w v1 (osoba, czynność) na całym koncie; docelowo (osoba, zakres, czynność), gdzie zakres `group` dochodzi razem z grupami w E02. Zakresy docelowe: `account`, `group`; `department` i `employee` nie mają własnych uprawnień — polityka dostaje **grupę nadrzędną zasobu** i sprawdza zakres `group` (lub `account`). Uprawnienie na `account` obejmuje wszystkie grupy. Czynności: `read`, `write`, `manage_permissions`. To zatwierdzone odstępstwo od #28 (osobne uprawnienia per dział/pracownik; Q3).
5. **Polityka** w `core`: aktor + konto + zakres + czynność; brak uprawnienia = odmowa; błąd odczytu uprawnień lub sesji = odmowa.

**Rozważone alternatywy:** gotowa biblioteka auth (Auth.js, Better Auth) — szybsza, ale nowa zależność i własny model sesji obok MikroORM, wymaga zgody człowieka; role `owner/admin/viewer` — sprzeczne ze standardem (uprawnienia osoby); uprawnienia per dział/pracownik — nic w D06–D08 tego nie wymaga.

## 📝 Architecture
Ścieżki wg rozdz. 9 standardu; nazwa domeny `accounts` we wszystkich warstwach.
- `core/src/policies/access.policy.ts` — `AccessPolicy`; `core/src/permissions/catalog.ts` — stałe zakresów i czynności.
- `core/src/ports/accounts/` — `account.repository.ts`, `user.repository.ts`, `person.repository.ts`, `session.repository.ts`, `permission.repository.ts`, `login-attempt.repository.ts`; `core/src/ports/security/` — `password-hasher.port.ts`, `token-generator.port.ts`, `clock.port.ts`; `core/src/ports/transactions/unit-of-work.port.ts` (kontrakt transakcyjny — **jeszcze nie istnieje**, powstaje w pierwszym kroku).
- `core/src/services/accounts/` — `account.service.ts` (rejestracja), `auth.service.ts` (logowanie, wylogowanie, uwierzytelnienie sesji — jedyne źródło prawdy; `requireSession()` tylko czyta cookie i woła tę usługę); `core/src/validators/accounts/` — schematy Zod.
- `db/src/entities/accounts/*.entity.ts`, `db/src/repositories/accounts/mikro-orm-*.ts`, `db/src/transactions/mikro-orm-unit-of-work.ts`.
- `app/src/server/auth/require-session.ts` (z `import "server-only"`), `app/src/server/adapters/password/` (Argon2id), `app/src/server/http/origin-check.ts` (CSRF), nowe publiczne moduły → wpisy w `exports`.
- **DI (Awilix):** singleton — `passwordHasher`, `tokenGenerator`, `clock`; scoped — `em`, repozytoria, `unitOfWork`, `accountService`, `authService`. Aktor nie jest zależnością DI: `requireSession()` (jedyne miejsce odczytu cookie) zwraca go na wywołanie, uwierzytelniając przez `authService`. Rejestracje: `dbRegistrations(config)` + rejestracje composition root. Usługi nie wołają `container.resolve()`.
- Kierunek zależności bez zmian; `core` nie przyjmuje `EntityManager`.

## 📝 Data Model
Tabele snake_case w liczbie mnogiej. Integralność tenantów wymuszona w bazie złożonymi kluczami.
- `accounts` (id, name, created_at).
- `users` (id, email — unikalny po normalizacji do małych liter, password_hash, created_at).
- `persons` (id, account_id → accounts, user_id → users, display_name, created_at); `UNIQUE (id, account_id)`, `UNIQUE (user_id)` (jedno konto na użytkownika w v1).
- `sessions` (id, person_id, account_id, token_hash UNIQUE, created_at, last_seen_at, expires_at, revoked_at); FK `(person_id, account_id) → persons (id, account_id)`; indeks po `expires_at`.
- `permissions` (id, account_id, person_id, action, created_at); FK `(person_id, account_id) → persons (id, account_id)`; `UNIQUE (person_id, action)`; CHECK `action` na wartościach katalogu. W v1 uprawnienie dotyczy całego konta, więc nie ma `scope_type`/`scope_id` (bez polimorficznej asocjacji). Migracja E02 dodaje tabelę `permission_group_scopes` (permission_id, group_id) z kluczami złożonymi z `account_id`; brak wiersza zakresu = uprawnienie na całe konto. `granted_by_person_id` nie istnieje do czasu specyfikacji nadawania i audytu.
- `login_attempts` (key_hash, kind: `email_ip`|`ip`|`register_ip`, window_start, count) — atomowy upsert, zapis w osobnej transakcji (przeżywa rollback); wygasłe okna usuwane przy zapisie (najwyżej 100 wierszy na żądanie).
Migracja MikroORM z constraintami i indeksami; dane wejściowe nigdy z payloadu do `em.assign`.

## 📝 API Contracts
- `POST /api/auth/register` {email, password, accountName, displayName} → 201 + cookie. Zajęty e-mail → 409 `ConflictError` (komunikat „Ten adres e-mail jest już zajęty”; decyzja Q2).
- `POST /api/auth/sign-in` {email, password} → 200 + cookie; błędne dane → 401 `UnauthorizedError` (komunikat neutralny, stały czas — dla nieistniejącego e-maila wykonywane fikcyjne haszowanie); limit → 429 (`HttpError`, błąd transportu).
- `POST /api/auth/sign-out` → 200 z `ApiResult<null>`, unieważnia sesję po stronie serwera (spójne z resztą API; bez 204).
Walidacja Zod: hasło 12–128 znaków (sprawdzane **przed** haszowaniem), limity długości pozostałych pól; błędy pól → 422 `ValidationError`. Odpowiedzi `ApiResult<T>`.

## 📝 UI/UX
Strony `/sign-in` i `/register` w `(frontend)` (klasy Tailwind, bez `@validuo/ui/components`). Formularz (Client Component) wywołuje Route Handlery przez `fetch`; `apiHandler` rozszerzony o ustawianie `Set-Cookie`. Stany: ładowanie, błąd pól, błędne dane, limit prób, zajęty e-mail, sukces. Etykiety, fokus, klawiatura; układ < 700 / 700–1099 / ≥ 1100 px. Bez mockupów — standardowe formularze.

## 📝 Security Design
- **Hasło:** biblioteka `@node-rs/argon2` (MIT) lub równoważna o zgodnej licencji — wybór i uzasadnienie nowej zależności potwierdza człowiek; natywny pakiet dopisany do `serverExternalPackages`; parametry Argon2id m=19 MiB, t=2, p=1; `needsRehash` poza v1 (dodać przy pierwszej zmianie parametrów).
- **Sesja:** token 32 B z `crypto.randomBytes`, w bazie SHA-256 tokenu; ważność 30 dni absolutnie i 7 dni bezczynności; `last_seen_at` aktualizowany najwyżej raz na 5 minut na sesję; nowy token przy każdym logowaniu; wylogowanie unieważnia sesję po stronie serwera; zmiana hasła i odebranie dostępu (poza v1) muszą unieważniać sesje w swoich specyfikacjach. Cookie: `__Host-validuo_session` w produkcji (`Secure`, `Path=/`, bez `Domain`), `HttpOnly`, `SameSite=Lax`; w dev (http) nazwa bez prefiksu. Wymagane HTTPS (+ HSTS) za proxy — wpis w README.
- **CSRF:** `origin-check.ts` w `apiHandler` dla POST/PUT/PATCH/DELETE: nagłówek `Origin` musi równać się `APP_ORIGIN`, a gdy zmiennej nie ustawiono — pochodzić z nagłówka `Host` (za proxy kończącym TLS `APP_ORIGIN` jest wymagany); brak `Origin` = 403 (fail closed); dotyczy także `sign-in` i `register` (login CSRF). Nowa zmienna `APP_ORIGIN` → `core/src/config/env.ts`, `.env.example`, README.
- **Limity prób** (zatwierdzone): logowanie — 5 nieudanych prób / 15 min na parę (znormalizowany e-mail, IP) oraz 20 / 15 min na IP → blokada do końca okna; rejestracja — 5 / godzinę na IP. Klucz (e-mail, IP) sprawia, że atak z innego adresu nie blokuje właściciela konta. IP z `x-forwarded-for` tylko przy `TRUSTED_PROXY=true`; Route Handlery Next nie znają adresu połączenia, więc bez tej zmiennej limit per IP jest wyłączony, a działa limit per para. Odpowiedź przy blokadzie nie zależy od istnienia konta; rejestracja zajętego e-maila ujawnia je świadomie (Q2).
- **Logi:** zdarzenia `auth.sign_in.failed`, `auth.sign_in.blocked`, `auth.register.created`, `auth.sign_out` z `requestId`; bez haseł, tokenów i pełnych e-maili (skrót lub zamaskowany).
- **Fail closed:** błąd odczytu sesji lub uprawnień blokuje chronioną operację.

## 📝 Edge Cases & Failure Scenarios
- Rejestracja zajętego e-maila: 409 (Q2); wyścig dwóch rejestracji tego samego e-maila — jedna kończy się naruszeniem `UNIQUE` mapowanym na 409, bez częściowo utworzonego konta (rejestracja w jednej transakcji: konto, użytkownik, osoba, uprawnienia).
- Wygasła/unieważniona sesja: 401; zmiana uprawnień obowiązuje od następnego żądania (uprawnienia czytane z bazy, nie z sesji).
- Hasło 10 MB: odrzucone walidacją długości przed haszowaniem.
- Atak siłowy / password spraying: limity per e-mail i per IP; wyścig na liczniku — atomowy upsert.
- Rejestracja tworzy dokładnie trzy uprawnienia `account`: `read`, `write`, `manage_permissions`.

## 📝 Reguły nadawania uprawnień
Poza v1 — pełna macierz (nadawanie, odbieranie, eskalacja, ostatni zarządzający z blokadą `accounts FOR UPDATE`) trafia do specyfikacji zaproszeń i nadawania. Ustalenie na przyszłość: `manage_permissions` nie implikuje `read`/`write`, więc przy regule „nadajesz tylko to, co sam masz” rola „zarządza uprawnieniami, ale nie czyta danych” jest niemożliwa — tamta specyfikacja musi to świadomie rozstrzygnąć. Model danych v1 niczego z tego nie blokuje.

## 📝 Risks & Impact Review
- **Trudne do odwrócenia:** schemat uprawnień i format tokenu sesji. Rozdzielenie `users`/`persons` ogranicza koszt zaproszeń.
- **Bezpieczeństwo:** własna usługa logowania; ograniczana sprawdzonymi bibliotekami, brakiem własnej kryptografii i testami integracyjnymi (izolacja kont, limity, unieważnianie sesji).
- **Poza v1:** zaproszenia, API nadawania/odbierania uprawnień, reset hasła, weryfikacja e-mail, uprawnienia per dział/pracownik, szablony uprawnień, audyt.
- Model oparty na jednym koncie autora (A03).

## 📝 Decisions in play
D01, D06; bez zmian R01–R04, N01–N02; model „bez planów i poziomów kont” z `implemented/2026-10-23-permissions-model.md` zachowany. Q1–Q4 i wartości limitów zatwierdził właściciel 2026-11-09.

## 📋 Phasing
- **Phase 1:** rejestracja i logowanie od końca do końca (pionowy wycinek: core + db + app + strony).
- **Phase 2:** `requireSession()`, aktor i polityka `read`/`write` dla kolejnych funkcji (E02).

## 📋 Implementation Plan
**Phase 1**
1. Kontrakt `UnitOfWork`, porty `accounts`/`security`, katalog zakresów i czynności; testy jednostkowe 100%.
2. Encje + migracja (`accounts`, `users`, `persons`, `permissions`, `sessions`, `login_attempts`) z kluczami złożonymi, `UNIQUE (user_id)` i CHECK; test integracyjny migracji na PostgreSQL 17 (w tym izolacja kont: nie da się nadać uprawnienia osobie z innego konta).
3. Adaptery `MikroOrm*Repository` i `MikroOrmUnitOfWork`; testy jednostkowe z mockiem `em` (utrzymują próg 100%) oraz integracyjne. Przed krokiem sprawdzić w `vitest.config.ts`, co liczy się do pokrycia `db/src`.
4. `PasswordHasher` (Argon2id) i `TokenGenerator` w `app/src/server/adapters/`; wpis w `serverExternalPackages`; nowe zmienne env (`APP_ORIGIN`, `TRUSTED_PROXY`).
5. `AccountService` (rejestracja w jednej transakcji), `AuthService` (logowanie ze stałym czasem, limity, wylogowanie); unit 100%.
6. `origin-check.ts` i obsługa `Set-Cookie` w `apiHandler`; testy.
7. Route Handlers `register`/`sign-in`/`sign-out` przez `apiHandler`; test integracyjny końca do końca.
8. Strony `/sign-in`, `/register`; test przeglądarkowy głównej ścieżki.

**Phase 2**
9. `requireSession()` zwracający aktora, odczyt uprawnień przy każdym żądaniu.
10. `AccessPolicy` dla `read`/`write` na poziomie konta; testy tabelaryczne (odmowa dla braku uprawnienia i dla innego konta). Rozwiązywanie zakresu przez grupę nadrzędną dochodzi w E02 razem z grupami i `permission_group_scopes`.

## Resolved decisions (właściciel projektu, 2026-11-09)
| # | Pytanie | Decyzja | Status |
|---|---|---|---|
| Q1 | Mechanizm logowania | własna usługa: e-mail + hasło, Argon2id, sesja w bazie | zaakceptowane (opcja rekomendowana) |
| Q2 | Rejestracja zajętego e-maila | komunikat „e-mail zajęty” + limity prób | zaakceptowane (opcja rekomendowana) |
| Q3 | Katalog | `account`/`group` × `read`/`write`/`manage_permissions`; dział i pracownik przez grupę | zaakceptowane (opcja rekomendowana) |
| Q4 | Poza v1 | zaproszenia, nadawanie uprawnień, reset hasła, weryfikacja e-mail | zaakceptowane (opcja rekomendowana) |
| 5 | Limity, TTL sesji, parametry Argon2id | wartości domyślne z „Security Design” | zaakceptowane (opcja rekomendowana) |
| 6 | Długość hasła | 12–128 znaków | zaakceptowane (opcja rekomendowana) |

### Rewizja po przeglądzie spójności (2026-11-09, właściciel projektu)
| # | Pytanie | Decyzja |
|---|---|---|
| R1 | Zakres `group` w v1 | tylko konto; grupy i `permission_group_scopes` w E02 |
| R2 | Wiele kont | jedno konto na użytkownika w v1 (`UNIQUE (user_id)`) |
| R3 | Blokada logowania | klucz (e-mail, IP) + osobny limit per IP |
| R4 | Reguły nadawania | przeniesione do specyfikacji zaproszeń i nadawania |

Uzgodnione z implementacją (PR #32): `sign-out` zwraca 200, aktor nie jest w DI, limity per IP tylko z `TRUSTED_PROXY`, `APP_ORIGIN` opcjonalny, `needsRehash` poza v1. Elementy rewizji, których #32 jeszcze nie spełnia (`UNIQUE (user_id)`, klucz e-mail+IP, ograniczony `last_seen_at`, uproszczona tabela `permissions`), wymagają poprawek w kodzie.
