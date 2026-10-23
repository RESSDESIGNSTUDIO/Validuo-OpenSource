# 2026-10-23 — Anonimizacja szczegółów środowiska w `.ai/`

## Cel
Przed upublicznieniem repozytorium usunąć z `.ai/` szczegóły środowiska pracy agenta (nazwa współdzielonej bazy, nazwa pliku konfiguracji podglądu, „sandbox”, porty i numery z lokalnej maszyny), zachowując wszystkie reguły i wnioski, z których korzystają agenci.

## Zakres
- Podmiany w logach, wnioskach i specyfikacjach: konkretna nazwa bazy → „współdzielona baza środowiska”; plik konfiguracji podglądu → opis; „sandbox” → „środowisko agenta”; konkretny port i numery zastępcze usunięte lub zamienione na `<port>`.
- Bez zmian: `AGENTS.md`, standard, struktura i nazwy plików w `.ai/`, treść reguł (np. brak fallbacku na `DATABASE_URL`, `NODE_ENV=production` w skryptach), flaga Chrome `--no-sandbox`.
- Poza zakresem: przepisywanie historii gita (stare wersje plików pozostają w historii; zawartość nie jest sekretem).

## Kryteria akceptacji
1. `git grep` po `open-mercato`, `openmercato`, `workspace-preview` i dawnych portach w `.ai/` (poza `.ai/cezar/`, który jest poza gitem) nic nie zwraca.
2. Linki i odwołania do plików w dokumentacji nadal działają; CI zielone.
