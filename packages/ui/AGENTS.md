# @validuo/ui — komponenty interfejsu

Obowiązują zasady z głównego `AGENTS.md` (sekcja „UI”). Ten plik dodaje szczegóły pakietu.

## Struktura

- `src/components/` — komponenty shadcn/ui (styl `radix-nova`, prymitywy z `radix-ui`, ikony `lucide-react`); import: `@validuo/ui/components/<nazwa>`.
- `src/lib/utils.ts` — `cn` (łączenie klas Tailwind); import: `@validuo/ui/lib/utils`.
- `src/hooks/` — hooki wielokrotnego użytku; import: `@validuo/ui/hooks/<nazwa>`.
- `src/styles/globals.css` — jedyne wejście Tailwinda (`@import "tailwindcss"`), tokeny motywu shadcn (jasny i `.dark`), `@source` dla plików pakietu.
- `components.json` — konfiguracja shadcn dla pakietu; `postcss.config.mjs` — PostCSS współdzielony z aplikacją.

## Zasady

- Komponenty dodawaj CLI z katalogu głównego: `npx shadcn@latest add <komponent> -c packages/app`. Nie kopiuj ręcznie kodu z dokumentacji.
- Komponenty shadcn można dostosowywać, ale zmiana dotyczy całego panelu — zachowaj API (`variant`, `size`, `asChild`, `data-slot`).
- Pakiet nie zależy od innych pakietów `@validuo/*` ani od `next` (wymusza ESLint) — komponenty mają działać w dowolnej aplikacji React.
- Nowe tokeny kolorów dodawaj w `globals.css` w obu motywach (`:root` i `.dark`) oraz w `@theme inline`.
- Nowe zależności runtime komponentów instaluj w tym pakiecie (`npm install <pkg> -w @validuo/ui`).
