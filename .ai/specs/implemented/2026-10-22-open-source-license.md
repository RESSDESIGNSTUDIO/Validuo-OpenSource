# 2026-10-22 — Licencja open source (AGPL-3.0-only)

## Cel
Udostępnić Validuo jako open source tak, żeby nikt nie mógł zamknąć kodu ani uznać go za własny i zarabiać na zamkniętej wersji. Autor nie zamierza zarabiać na projekcie.

## Decyzja
**GNU AGPL-3.0-only.** Żadna licencja open source nie zabrania zarabiania, ale AGPL wymusza publikację zmian także dla usług sieciowych i zachowanie informacji o autorach. Licencje niekomercyjne (CC BY-NC, PolyForm NC) odrzucone — nie są open source.

## Zakres
- `LICENSE` (pełny, oficjalny tekst AGPL-3.0), pole `license: "AGPL-3.0-only"` w root i w `packages/*/package.json`.
- `CONTRIBUTING.md`: DCO (`git commit -s`), zgodność licencji wkładu i zależności, proces PR, zgłaszanie luk bezpieczeństwa przez GitHub Security.
- Dokumentacja: „aplikacja SaaS” → „aplikacja open source” w README, `AGENTS.md` i standardzie; sekcja „Licencja i współtworzenie” w README; reguła licencji i DCO w `AGENTS.md`; punkt DCO/licencji w szablonie PR.

## Audyt zależności
Lockfile (zależności runtime): MIT, ISC, BSD, Apache-2.0, BlueOak, 0BSD, CC-BY-4.0 (dane `caniuse-lite`), MPL-2.0 (`lightningcss`), LGPL-3.0 (binarki `sharp-libvips`) — wszystkie zgodne z AGPL-3.0.

## Poza zakresem / do decyzji właściciela
- Czy katalog `.ai/` ma być publiczny.
- Zmiana widoczności repozytorium i ochrona `main` (ustawienia GitHuba).
- Rejestracja marki/nazwy „Validuo” (licencja nie daje praw do nazwy).
