# Plan wykonania: instalator `npm run setup`

Source doc: .ai/specs/2026-10-28-npm-run-setup-installer.md

## Goal

`npm run setup` jednym poleceniem wykonuje kroki z sekcji „Uruchomienie” w `README.md` i jest idempotentny (issue #11; spec w PR #12).

## Scope

- `scripts/setup.mjs` + `scripts/setup/*.mjs`: zwykły ESM bez zależności (działa przed `npm install`), logika z wstrzykiwanymi portami.
- Wpis `"setup"` w root `package.json`; rozszerzenie `include` w `vitest.config.ts` o `scripts/**` (bez wykluczeń i zmian progów).
- `README.md` i tabela poleceń w `AGENTS.md` (poza blokiem `nextjs-agent-rules`).

## Non-goals

Tworzenie bazy/roli PostgreSQL, uruchamianie `npm run dev`, nowe zależności, zmiany w `packages/*`, interaktywne pytania, flagi CLI.

## Risks

- Migracje na bazie z `DATABASE_URL`: tylko `npm install` i `npm run db:migrate`, test pilnuje listy poleceń.
- Pięć założeń specyfikacji jest niepotwierdzonych przez człowieka (komentarz w PR #12).
- Test na prawdziwym PostgreSQL tylko ręcznie na tymczasowej bazie.

## Implementation Plan

Phase 1: instalator (kroki 1.1–1.8); Phase 2: dokumentacja (2.1–2.2). Bramka walidacji: `validation.commands` z `.ai/agentic.config.json`.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Instalator

- [x] 1.1 Bramka testów: `scripts/**` w `include` testów i pokrycia — 8cdea85
- [x] 1.2 Szkielet i punkt wejścia (`scripts/setup.mjs`, `runSetup`, wpis `setup`) — b6e8645
- [x] 1.3 Wymagania Node/npm — d0dd74f
- [x] 1.4 Zależności (pominięcie przy aktualnym `node_modules`) — d0dd74f
- [x] 1.5 Plik `.env` (bez nadpisywania, tryb 0600) — d0dd74f
- [x] 1.6 Kontrola `DATABASE_URL` — d0dd74f
- [x] 1.7 Migracje — b6e8645
- [x] 1.8 Podsumowanie i adapter Node — b6e8645

### Phase 2: Dokumentacja

- [x] 2.1 README: szybki start i wiersz w tabeli skryptów — 47aee0c
- [x] 2.2 AGENTS.md: wiersz w tabeli poleceń — 47aee0c
