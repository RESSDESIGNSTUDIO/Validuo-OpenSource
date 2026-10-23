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

### 2026-10-22 — Wspólny loader `@next/env` przez `createRequire`
Rozwiązanie problemu z wpisu o imporcie CJS: `@validuo/core/config/load-env` ładuje `@next/env` przez `createRequire(import.meta.url)` i nie ma importów względnych. Ten sam moduł działa w `next.config.ts` (kompilowany do CJS), w `tsx` (CLI MikroORM, skrypty) i w natywnym Node 24. Nie wracaj do dwóch osobnych wywołań `loadEnvConfig` ani do zgadywania stylu importu.

### 2026-10-22 — `instrumentation.ts`: `register()` działa też podczas `next build`
Next wywołuje `register()` przy prerenderingu w buildzie. Fail-fast konfiguracji musi pomijać `NEXT_PHASE === "phase-production-build"` i runtime inny niż `nodejs`, a importować tylko moduły bez `server-only` (`@validuo/core/config`). Wyjątek w `register()` nie zatrzymuje `next start`: serwer loguje przyczynę i odpowiada 500 na każde żądanie — to zamierzone zachowanie „fail closed”.

### 2026-10-22 — `next start` zostawia osierocony `next-server`
Zabicie procesu-rodzica (`npm exec`, `setsid`) nie zamyka potomnego `next-server`, który dalej trzyma port. Kolejny start kończy się `EADDRINUSE`, a `curl` po cichu odpytuje *stary* serwer (fałszywie pozytywny wynik testu). Uruchamiaj testowe serwery z markerem (`VALIDUO_PROBE=1 next start …`) i zamykaj procesy znalezione po tym markerze w `/proc/<pid>/environ`; nigdy nie ruszaj podglądu `next dev` na porcie 3000.

### 2026-10-22 — npm 11.19 blokuje skrypty instalacyjne
`npm install` ostrzega o pakietach z `postinstall` nieobjętych `allowScripts` (`esbuild`, `unrs-resolver`) i ich nie uruchamia. Obecne narzędzia działają bez tych skryptów; przy dodawaniu pakietu, który pobiera binaria w `postinstall`, sprawdź, czy faktycznie działa, i świadomie użyj `npm install-scripts approve <pkg>`.

### 2026-10-22 — Awilix 13 nie sprawdza typów rejestracji
`container.register()` przyjmuje dowolne nazwy i resolvery, więc ręczny typ cradle (lub declaration merging) niczego nie gwarantuje. Rejestracje składamy jako obiekt typu `Registrations<AppCradle>` (`@validuo/core/di`) — brak klucza lub zły typ resolvera to błąd kompilacji.

### 2026-10-22 — Vitest: błąd w `globalSetup` bez czytelnego komunikatu
Gdy `globalSetup` rzuca wyjątek, Vitest 5 wywraca się przy drukowaniu stosu (`TypeError: code.charCodeAt is not a function`) i gubi komunikat. Setup projektu `integration` sam wypisuje przyczynę (`console.error`) przed ponownym rzuceniem błędu.

### 2026-10-22 — Stan repo sprawdzaj na bieżąco, nie ze snapshotu z początku sesji
Plan zakładał niezacommitowane drzewo (snapshot `gitStatus`), a w trakcie sesji powstał commit `b7c7d73`. Wyłapał to dopiero niezależny przegląd planu. Przed decyzjami zależnymi od stanu repo (np. jednorazowe formatowanie całości) uruchom `git status`/`git log`.

### 2026-10-22 — Specyfikacja sprzeczna z AGENTS.md: najpierw zapytaj
Standard (`engineering-standards.md`) wskazywał migracje Supabase, więc zamieniłem migrator MikroORM na Supabase CLI bez pytania, choć `AGENTS.md` zapisywał MikroORM jako obowiązujące założenie. Użytkownik to odrzucił: **projekt nie używa Supabase** (ani Auth, ani Storage, ani CLI) — migracje i persystencja wyłącznie MikroORM + PostgreSQL. Zmiany cofnięto, a standard poprawiono. Następnym razem: gdy specyfikacja lub standard przeczy założeniu z `AGENTS.md` (biblioteka, narzędzie, właściciel schematu, dostawca), wskaż konflikt i zapytaj człowieka przed implementacją — sama obecność zapisu w specyfikacji nie jest akceptacją zmiany architektury.

### 2026-10-22 — Testy jednostkowe stron i pokrycie 100% w Vitest 5
Pliki wyłącznie z typami i barrel re-eksporty dają w v8 0/0 i liczą się jako 100% — nie wykluczaj ich. Async Server Components testuj jako `renderToStaticMarkup(await Page())`, mockując `next/server` (`connection`), `@/server/container` i `@validuo/db`; importy CSS w layoutach Vitest zamienia na puste moduły. `@next/env` ładowany przez `createRequire` nie da się podmienić `vi.mock` i cache'uje wynik w procesie — testuj go na prawdziwym katalogu tymczasowym. `coverage.enabled` nie ustawiaj w konfiguracji (próg 100% objąłby integrację i E2E) — tylko `--coverage` w `test:unit`.

### 2026-10-22 — testcontainers i agent-browser w sandboxie
Sandbox nie ma Dockera (testcontainers: „Could not find a working container runtime strategy”) ani bibliotek Chromium (agent-browser: „Chrome not found”/brak `libnss3`). Lokalnie integrację i E2E uruchamiaj z `TEST_DATABASE_URL` (strażnik `requireTestDatabaseUrl`); scenariusze przeglądarkowe weryfikuje dopiero CI. `agent-browser` 0.39 ma binarkę w paczce (bez `postinstall`), odpowiada `{"success":…,"data"|"error"}` przy `--json`; na Ubuntu 24.04 w CI Chrome potrzebuje `sysctl kernel.apparmor_restrict_unprivileged_userns=0` zamiast `--no-sandbox`.

### 2026-10-22 — `next build` restartuje worker podglądu `next dev`
Po `npm run build` podgląd `next dev` (port 3000) uruchamia nowy `next-server` — to nie osierocony proces testowy. Zanim cokolwiek zabijesz, sprawdź PPID (podgląd: rodzic `next dev`) i `environ` (`NODE_ENV=development`, współdzielone `DATABASE_URL`).

### 2026-10-22 — Ochrona gałęzi niedostępna w prywatnym repo na darmowym planie
`branch protection` i `rulesets` zwracają 403 („Upgrade to GitHub Pro or make this repository public”). Wymóg zielonych checków przed merge'em nie jest więc egzekwowany technicznie — działa z konwencji (`AGENTS.md`, sekcja „Git, pull requesty i merge”). Gdy repo przejdzie na plan Pro lub stanie się publiczne, włącz ochronę `main` z wymaganymi checkami: Lint, Unit tests (100% coverage), Build, Integration tests.

### 2026-10-23 — Zawieszony krok CI blokuje PR na godziny
Krok `agent-browser install --with-deps` (apt + pobranie Chrome) zawisł na ponad 18 minut; bez `timeout-minutes` job trwałby do domyślnego limitu 6 godzin. Anulowany przebieg trzeba najpierw dokończyć (`gh run cancel`, poczekać na `completed`), dopiero potem `gh run rerun --failed` zadziała. Wniosek: każdy job i krok ma limit czasu, kroki sieciowe są ponawiane (`.github/scripts/retry.sh`), a `ci-rerun.yml` wznawia przebieg po timeoucie. Testów nie ponawiamy.
