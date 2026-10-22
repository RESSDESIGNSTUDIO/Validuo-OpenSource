# Współtworzenie Validuo

Validuo jest projektem open source na licencji **GNU AGPL-3.0** (patrz [`LICENSE`](LICENSE)). Zmiany zewnętrznych osób są mile widziane — poniżej zasady, które pozwalają utrzymać projekt spójny i otwarty.

## Licencja wkładu i DCO

Wysyłając zmianę, zgadzasz się, że będzie udostępniona na licencji AGPL-3.0-only, tak jak reszta projektu. Potwierdzasz to oświadczeniem [Developer Certificate of Origin 1.1](https://developercertificate.org/): każdy commit musi mieć linię `Signed-off-by` z Twoim imieniem i adresem e-mail.

```bash
git commit -s -m "feat: krótki opis zmiany"
```

Zapomniałeś o podpisie? Dopisz go do ostatniego commita: `git commit --amend -s --no-edit` (a do kilku commitów: `git rebase --signoff main`).

Pochodzenie kodu: nie wysyłaj kodu, do którego nie masz praw, ani kodu na licencji niezgodnej z AGPL-3.0 (np. „tylko do użytku niekomercyjnego"). Zależności muszą mieć licencję zgodną z AGPL-3.0 (MIT, ISC, BSD, Apache-2.0, MPL-2.0, LGPL).

## Jak zaproponować zmianę

1. Zrób fork repozytorium i utwórz gałąź `<typ>/<krótki-opis>` (typ: `feat`, `fix`, `refactor`, `docs`, `ci`, `test`, `chore`) od aktualnego `main`.
2. Przy większej zmianie (nowa funkcja, zmiana architektury) najpierw opisz ją w specyfikacji w `.ai/specs/` albo w issue i poczekaj na akceptację kierunku — zmiany założeń z `AGENTS.md` (biblioteki, podział pakietów) wymagają zgody opiekuna.
3. Zainstaluj zależności (`npm install`, Node 24, npm 11) i uruchom kontrole lokalnie:

   ```bash
   npm run lint && npm run format:check && npm run typecheck
   npm run test:unit      # wymagane 100% pokrycia nowego kodu
   npm run build
   ```

4. Każda nowa funkcja i każda zmiana kodu w `packages/*/src` musi mieć **100% pokrycia testami jednostkowymi** — nie dodawaj wykluczeń z pokrycia ani nie obniżaj progów.
5. Otwórz pull request do `main`, tytuł w stylu Conventional Commits (`feat:`, `fix:`, `docs:` …), i wypełnij szablon opisu PR. Jeden PR = jeden zrozumiały cel.
6. PR jest scalany **squashem** po zielonych checkach CI (Lint, Unit tests, Build, Integration tests) i akceptacji opiekuna.

Szczegółowa architektura i standardy: [`AGENTS.md`](AGENTS.md) oraz [`.ai/specs/engineering-standards.md`](.ai/specs/engineering-standards.md).

## Zgłaszanie błędów i luk bezpieczeństwa

Błędy zgłaszaj jako issue (kroki odtworzenia, oczekiwane i faktyczne zachowanie, wersje). **Luk bezpieczeństwa nie zgłaszaj publicznie** — użyj zakładki „Security" → „Report a vulnerability" w repozytorium GitHub.
