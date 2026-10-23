# 2026-10-23 — Model dostępu bez planów: konta i uprawnienia osób

## Cel
Dostosować standard i kod do decyzji produktowej: aplikacja jest otwarta i bezpłatna, więc nie ma planów, statusów kont ani limitów. Każde konto ma te same możliwości, a dostęp wynika z uprawnień nadawanych konkretnym osobom wewnątrz aplikacji.

## Zakres
- Standard (`engineering-standards.md`): nowa sekcja „Konta, osoby i uprawnienia” zamiast „Organizacje, grupy, role i plany”; usunięte plany Free/Premium/Unlimited/Admin, limity zasobów (grupy, pracownicy), `profiles.plan`, `platform_admins`, role `owner/admin/manager/viewer` i `editor`; zasady nadawania uprawnień (nie nadajesz tego, czego nie masz; nie odbierasz ostatniej osobie zarządzającej uprawnieniami); `account_id` zamiast `organization_id`; `access.policy.ts` zamiast `account-plan.policy.ts`; poprawione kryteria testów i checklista.
- Kod: usunięty `PlanLimitError` / kod `PlanLimit` (nieużywany) z `@validuo/core/errors`, mapowania HTTP w `apiHandler` i testów — pokrycie nadal 100%.
- Dokumentacja: `AGENTS.md` (model dostępu, błędy), `README.md`, `packages/{core,db}/AGENTS.md`, szablon PR.

## Poza zakresem (osobna specyfikacja produktu)
Katalog zakresów i czynności uprawnień, szablony uprawnień, rejestracja i uwierzytelnianie, administrowanie instalacją (wiele kont na jednym serwerze), ochrona przed nadużyciami (rate limiting zostaje w standardzie).

## Kryteria akceptacji
1. Brak w dokumentacji i kodzie odwołań do planów, limitów kont i `PlanLimit`.
2. `lint`, `format:check`, `typecheck`, `test:unit` (100%), `build` przechodzą; CI zielone.
