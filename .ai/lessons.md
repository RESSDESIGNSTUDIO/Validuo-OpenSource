# Lessons — wnioski i długoterminowa pamięć projektu

Ten plik zbiera krótkie, ogólne wnioski wyciągnięte podczas pracy nad projektem — np. po naprawieniu błędu, odkryciu nieoczywistej pułapki albo wypracowaniu usprawnienia procesu. Każdy agent AI powinien przejrzeć ten plik **przed** rozpoczęciem pracy i dopisać wniosek **po** jej zakończeniu, jeśli coś wartościowego się pojawiło.

Dłuższe, tematyczne notatki trzymaj w osobnych plikach w `.ai/lessons/` i linkuj je stąd.

Pełne zasady patrz `AGENTS.md`.

## Wpisy

<!-- Nowe wnioski dopisuj poniżej, w formacie:
### YYYY-MM-DD — krótki tytuł
Co się stało / co ustalono. Dlaczego to ważne. Co robić inaczej następnym razem.
-->

### 2026-10-22 — Eksperymenty z ORM tylko na osobnej bazie
Subagent badający MikroORM 7 miał w skrypcie `clientUrl: process.env.DATABASE_URL ?? '<scratch>'`; zmienna była ustawiona w sandboxie, więc `schema.update()` i migracje poszły na współdzieloną bazę `open-mercato` (utworzył `users`, `counter`, `mikro_orm_migrations`). W MikroORM 7 `schema.update()` domyślnie ma `dropTables: true` — usuwa tabele, których nie zna. Tym razem baza była pusta (potwierdzone analizą OID w `pg_class`), ale mogło dojść do utraty danych. Następnym razem: eksperymenty na własnej instancji (`initdb` + `pg_ctl` w `/tmp`, inny port), w skryptach testowych nigdy fallbacku na `process.env.DATABASE_URL`, a zlecając subagentowi pracę z bazą — jawnie zabronić używania `DATABASE_URL`.

### 2026-10-22 — `NODE_ENV=development` w sandboxie psuje `next build`
Środowisko ma globalnie `NODE_ENV=development`; `next build` kończy się wtedy błędem prerenderingu `/_global-error` („Cannot read properties of null (reading 'useContext')”) i lawiną ostrzeżeń o `key`. To nie jest problem z wieloma kopiami Reacta. Skrypty `build`/`start` w `packages/app` wymuszają `NODE_ENV=production`.

### 2026-10-22 — Przenoszenie katalogów na overlayfs
`git mv src packages/app/src` kończy się `Invalid cross-device link` (rename katalogu z dolnej warstwy overlayfs). Kopiuj (`cp -a`) i usuwaj oryginał — git i tak wykryje przeniesienie plików.

### 2026-10-22 — Import pakietów CommonJS w plikach konfiguracyjnych
`next.config.ts` jest kompilowany przez Next do CommonJS bez interopu: `import nextEnv from "@next/env"` daje `undefined`, działa tylko import nazwany. Z kolei konfiguracja CLI MikroORM ładowana przez `tsx` jako ESM wymaga importu domyślnego (`@next/env` nie ma nazwanych eksportów wykrywalnych przez Node). Sprawdzaj tryb ładowania empirycznie, zanim zaczniesz zgadywać.

### 2026-10-22 — MikroORM 7: `new MikroORM()` łączy się leniwie
Synchroniczny konstruktor (używany w DI, bo rejestracja Awilix jest synchroniczna) nie nawiązuje połączenia; `orm.checkConnection()` zwraca „Connection not established” do pierwszego zapytania. Health check musi wykonać prawdziwe zapytanie — stąd `checkDatabase()` w `@validuo/db`.

### 2026-10-22 — Blok `nextjs-agent-rules` zależy od wersji Next.js
Po aktualizacji Next (16.3.4 → 16.4.2) treść bloku w `AGENTS.md` przestała się zgadzać z generatorem (`hasCurrentAgentRules` = false) i `next dev` przepisałby plik. Po podbiciu Next zsynchronizuj blok w `AGENTS.md` i `packages/app/AGENTS.md` (sprawdzenie: `hasCurrentAgentRules` z `next/dist/server/lib/generate-agent-files.js`).

### 2026-10-22 — `pkill -f` potrafi zabić własną powłokę
`pkill -f "next start --port 3124"` dopasował też powłokę, która go uruchomiła (wzorzec był w jej linii poleceń). Zamykaj procesy po PID, sprawdziwszy wcześniej ich `cwd`/`environ`, zwłaszcza że w sandboxie działa też podgląd (`workspace-preview`), którego nie wolno ubić.
