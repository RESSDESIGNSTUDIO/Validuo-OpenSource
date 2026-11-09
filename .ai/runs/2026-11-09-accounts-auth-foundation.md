# Plan wykonania — konta, logowanie i polityka dostępu

Source doc: .ai/specs/2026-11-09-accounts-auth-permissions.md
Issue: #31

## Goal
Zaimplementować Phase 1–2 zaakceptowanej specyfikacji: rejestracja konta, logowanie e-mail + hasło (Argon2id), sesja w bazie, `requireSession()` i `AccessPolicy` dla `read`/`write`.

## Scope
- `core`: katalog uprawnień, polityka, porty (w tym `UnitOfWork`), schematy Zod, `AccountService`, `AuthService`.
- `db`: encje, migracja (klucze złożone, CHECK-i), repozytoria, `MikroOrmUnitOfWork`, rejestracje DI.
- `app`: adaptery (Argon2id, token, zegar), kontrola Origin, `Set-Cookie`, Route Handlers `auth/*`, Server Actions i strony `/sign-in`, `/register`, `requireSession()`, zmienne env.

## Non-goals
Zaproszenia, API nadawania uprawnień, reset hasła, weryfikacja e-mail, uprawnienia per dział/pracownik, ochrona `/backend` (osobne zadanie E02).

## Risks
- Brak Dockera i Chrome w środowisku agenta: integracja na lokalnym PostgreSQL 17, E2E nieuruchamiane lokalnie.
- Next.js nie udostępnia adresu IP w `Request`; limity per IP działają tylko przy `TRUSTED_PROXY=true`.
- Złożone klucze obce w migracji są pisane ręcznie (ORM ich nie generuje).

## Implementation Plan
Phase 1: wycinek rejestracji i logowania od końca do końca (core → db → app). Phase 2: sesja jako aktor i polityka dla kolejnych funkcji. Bramka walidacji: `validation.commands` z `.ai/agentic.config.json`.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Rejestracja i logowanie

- [x] 1.1 Core: katalog uprawnień, `AccessPolicy`, porty i `UnitOfWork`
- [x] 1.2 Core: schematy Zod, `AccountService`, `AuthService`
- [x] 1.3 Db: encje i migracja
- [x] 1.4 Db: repozytoria, `MikroOrmUnitOfWork`, rejestracje DI
- [x] 1.5 App: env, adaptery (Argon2id, token, zegar), kontrola Origin, `Set-Cookie`
- [x] 1.6 App: Route Handlers `auth/register`, `sign-in`, `sign-out`
- [x] 1.7 App: Server Actions i strony `/sign-in`, `/register`
- [x] 1.8 App: scenariusz E2E głównej ścieżki

### Phase 2: Aktor i polityka dostępu

- [x] 2.1 App: `requireSession()` i aktor w DI
- [x] 2.2 Dokumentacja: README, `.env.example`, AGENTS.md pakietów
