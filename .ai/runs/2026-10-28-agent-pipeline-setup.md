# Konfiguracja pipeline'u agentów (om-setup-agent-pipeline)

## Cel
Skonfigurować `.ai/agentic.config.json` i dokumenty procesu dla skilli `om-*`.

## Kroki i decyzje
- Wybory właściciela: bramka walidacji = lint, format:check, typecheck, test:unit, build (integracja/e2e zostają w CI); pełna taksonomia etykiet; `qaGate: true`; generowane SDLC.md, CODE_REVIEW.md, BACKWARD_COMPATIBILITY.md; zmiany na osobnej gałęzi `chore/agent-pipeline`.
- Zainstalowano deskryptory `github` (tracker) i `agent-browser` (przeglądarka); utworzono 25 brakujących etykiet (`bug`, `documentation` już istniały).
- `AGENTS.md` istnieje — nie ruszany. Dokumenty wyprowadzone ze standardu inżynieryjnego i struktury repo.
- Sprawdzenie pokrycia skilli: `SKILL_COVERAGE_OK`.

## Problemy
- W środowisku brak `jq`, którego używają skille do czytania configu — trzeba go zainstalować lokalnie.
- Wcześniejszy `/om-open-pr` otworzył PR #9 bez configu (bez etykiet SDLC).

## Kolejne kroki
- Po merge dodać etykiety SDLC do PR #9 (`documentation`, `skip-qa`, `risk-low`, `priority-low`, `review`).
