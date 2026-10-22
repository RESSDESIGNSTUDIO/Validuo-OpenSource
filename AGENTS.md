<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Spec-Driven Development i pamięć projektu (`.ai/`)

Ten projekt wykorzystuje katalog `.ai/` jako jedyne źródło prawdy dla specyfikacji, logów autonomicznych przebiegów AI oraz wniosków/lekcji. **Każdy agent AI pracujący w tym repozytorium musi przestrzegać poniższych zasad.**

## `.ai/specs/` — specyfikacje (SDD)

- Przed rozpoczęciem nietrywialnej pracy (nowa funkcja, refaktor, zmiana architektury) utwórz plik specyfikacji w `.ai/specs/`. Jeśli zadanie jest na tyle duże, że wymagałoby specyfikacji, a jej brak — zatrzymaj się i najpierw ją napisz.
- Format nazwy: `YYYY-MM-DD-slug.md` (np. `2026-10-21-user-auth-refresh.md`).
- Specyfikacja opisuje: cel, kontekst, zakres, kryteria akceptacji, ew. plan implementacji.
- Po zakończeniu i wdrożeniu pracy opisanej w specyfikacji, przenieś plik do `.ai/specs/implemented/` (bez zmiany nazwy).
- Specyfikacje porzucone, zastąpione lub nieaktualne przenoś do `.ai/specs/archive/` — nigdy nie usuwaj.

## `.ai/runs/` — logi autonomicznych przebiegów AI

- Każdy autonomiczny przebieg agenta AI (praca w tle, pętle typu `/loop`, dłuższe sesje bez bieżącego nadzoru człowieka) musi zostawić log w `.ai/runs/`.
- Format nazwy: `YYYY-MM-DD-slug.md`.
- Log zawiera: cel przebiegu, podjęte kroki/decyzje, napotkane problemy, wynik końcowy i ewentualne kolejne kroki.

## `.ai/lessons.md` i `.ai/lessons/` — wnioski i długoterminowa pamięć

- Przed rozpoczęciem pracy przejrzyj `.ai/lessons.md` — mogą tam być wskazówki dotyczące tego zadania lub obszaru kodu.
- Po naprawieniu nietrywialnego błędu, odkryciu pułapki, ustaleniu nieoczywistej zasady działania projektu lub wypracowaniu usprawnienia — zapisz wniosek.
- Krótkie, ogólne wnioski dopisuj bezpośrednio do `.ai/lessons.md`.
- Dłuższe lub tematyczne notatki zapisuj jako osobne pliki w `.ai/lessons/` i dodaj odnośnik w `.ai/lessons.md`.
- Każdy wniosek zawiera: co się stało, dlaczego to ważne, co robić inaczej następnym razem.
- Po każdej korekcie od użytkownika zapisz wniosek tak, żeby ten sam błąd się nie powtórzył. Jeśli wniosek jest trwałą regułą pracy (nie jednorazowym faktem), dopisz go też zwięźle do `AGENTS.md`.

## Zasady pracy

### Planowanie
- Złożone zadania (wiele plików, kilka możliwych podejść, niejasne wymagania) zaczynaj od planu, nie od kodu. Plan zapisz w specyfikacji w `.ai/specs/` i dopracuj go tak, aby implementacja przeszła za jednym podejściem.
- Gdy implementacja zaczyna iść źle, przerwij ją i wróć do planu. Nie forsuj nieudanego podejścia.
- Przy większych zmianach zleć niezależny przegląd planu (np. subagentowi w roli senior/staff engineera) przed rozpoczęciem implementacji.

### Weryfikacja
- Nie uznawaj zadania za skończone bez weryfikacji. Minimum to `npm run lint` i `npx tsc --noEmit`, a przy zmianach w routingu, konfiguracji lub buildzie także `npm run build`.
- Zmiany UI sprawdź w działającej aplikacji (`npm run dev`), testując główną ścieżkę i przypadki brzegowe. Jeśli nie da się tego sprawdzić, napisz to wprost.
- Gdy poprawka okazuje się łatką, rozważ odrzucenie jej i wdrożenie eleganckiego rozwiązania z wykorzystaniem wiedzy zdobytej w trakcie pracy.

### Naprawianie błędów
- Błędy naprawiaj samodzielnie, zaczynając od analizy faktycznych danych: logów, komunikatów błędów, wyników lintera i buildu. Szukaj przyczyny źródłowej, zamiast maskować objawy.
- Po naprawie nietrywialnego błędu zapisz wniosek zgodnie z zasadami sekcji o `.ai/lessons.md`.

### Kontekst i równoległość
- Wyszukiwanie, research i niezależne podzadania deleguj subagentom, żeby główny kontekst pozostał czysty.
- Niezależne zadania mogą działać równolegle, każde w osobnym git worktree, aby nie nadpisywały wzajemnie swoich zmian.
- Jeśli zauważysz, że ta sama sekwencja kroków lub ten sam prompt powtarza się kilka razy (codziennie albo w kolejnych sesjach), od razu zapisz ją jako skill lub komendę w `.claude/` (bez pytania o zgodę), poinformuj o tym użytkownika i commituj ją do repozytorium.

## Egzekwowanie

- Te zasady obowiązują każdego agenta AI pracującego w tym repozytorium, niezależnie od narzędzia czy modelu.
- Nie pomijaj tworzenia specyfikacji, logowania przebiegów ani zapisywania wniosków z powodu pośpiechu — są one częścią procesu, nie opcjonalnym dodatkiem.
