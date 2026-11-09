# 2026-11-09 — discovery produktu i backlog

## Cel
Uzupełnić discovery z 2026-11-04 o brakujący `product-brief.md` i wpisać backlog do trackera.

## Kroki i decyzje
- Przejrzano wywiad i decyzje D01–D09; napisano `.ai/specs/research/product-brief.md` (tryb own, pełny przebieg).
- `om-backlog`: `SDLC.md` nie ma Definition of Ready, więc bramka gotowości została pominięta; zakres ograniczono do tego, co nie zależy od Q02/Q07/A02/A04.
- Po akceptacji właściciela („yes") utworzono issues #16–#24 (E01 Discovery z zadaniami T01–T04, E02 Kartoteka z historyjkami S01–S03) oraz `.ai/specs/backlog.md`.

## Problemy
- Brak `jq` w środowisku — issues utworzono bezpośrednio przez `gh`, nie przez `om-prepare-issue`.
- W zapisach brakuje D05, Q04 i Q06; numerów nie odtwarzano.
- Dowody pochodzą z jednego konta autora projektu (A01–A03 nieprzetestowane).

## Wynik i kolejne kroki
- Brief gotowy do research, nie do implementacji.
- Najpierw #18–#21 (rozmowy, przepisy, Q02, Q07), potem `om-auto-fix-issue 22`.
