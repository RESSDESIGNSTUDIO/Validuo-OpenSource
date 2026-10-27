# `.agents/` — umiejętności agentów AI

`skills/` zawiera skille (instrukcje dla agentów AI) zainstalowane z repozytorium [`open-mercato/skills`](https://github.com/open-mercato/skills) na licencji MIT; stan i sumy kontrolne wersji opisuje `skills-lock.json` w katalogu głównym. `.claude/skills` jest symlinkiem do `.agents/skills`, żeby Claude Code widział te same skille.

Nie edytuj skilli ręcznie — zmiany nadpisze aktualizacja z upstreamu. Pliki są wyłączone z Prettiera i ESLinta, a skrypty w nich nie są objęte progiem 100% pokrycia (nie należą do `packages/*/src`).
