# Validuo — product brief

- Date: 2026-11-09
- Mode: own; Owner: właściciel projektu (imię nieznane); Pass: full
- Evidence basis: jeden wywiad z jedną osobą (właściciel, zarazem autor projektu i pierwszy użytkownik), z uzupełnieniem tego samego dnia — [interview](interviews/2026-11-04-project-owner.md). Zakres wynika z decyzji D01–D09 tej samej osoby. Najważniejsze nieprzetestowane przekonanie: że wpis w aplikacji wystarczy tam, gdzie dziś jest papier (A02), i że problem mają też inni (A03).
- Coverage: 13 claims — 10 sourced (interview 5, data 0, document 5, product 0, benchmark 0), 0 synthetic, 3 assumed; 2 entries on the collection plan
- Synthetic hypotheses outside Coverage: 0
- Definition of Ready signed by: not yet signed — brakuje potwierdzenia problemu przez drugą osobę (A03) i progu ostrzegania (Q02); ready for: research (rozmowy z innymi osobami zarządzającymi pracownikami). Specyfikacja zakresu „Now” może powstać jako propozycja, ale nie jest gotowa do implementacji.
- Sources: `.ai/specs/research/interviews/2026-11-04-project-owner.md`, `.ai/specs/research/decisions/D01…D09`

## Decision summary

Właściciel wybrał jako pierwszy zakres „terminy ważności wymagań pracownika” (D02); to decyzja, nie dowód popytu.

Problem opisany jednym przypadkiem: papierowy dokument ze szkolenia strażaka trafia do segregatora kadrowej i segregator ginie. Koszt, częstość i obecny sposób obejścia nie są znane (patrz Problems).

Now: wymagania (dokumenty, szkolenia, uprawnienia) per pracownik, przypisane do działów w grupie, przeniesienie pracownika między działami, przypomnienia tylko w aplikacji dla właściciela grupy, opcjonalne skany (D02, D06–D09). Grafik jest później (D03).

Największa niepewność: opisany przypadek to utrata dokumentu, a rozwiązanie to pilnowanie terminów ważności — to dwie różne potrzeby (A01). Do tego nieznane wymagania prawne co do oryginałów (A02) i jedno konto jako podstawa (A03).

Następny krok: rozmowy z 2–3 innymi osobami, które zarządzają pracownikami (właściciel zgłasza kandydatów — termin nieustalony), by sprawdzić A01–A03; równolegle zamknąć Q02 i Q07.

## Vision

Osoba zarządzająca pracownikami ma w jednym miejscu ślad szkoleń, dokumentów i uprawnień każdego pracownika oraz widzi, czego brakuje lub co wygasa; to zamierzony kierunek zespołu, nie wykazana korzyść. `[DOCUMENT]` D02

## Target group and stakeholders

- Customer (pays): nieustalony — brak informacji o płatnościach (model dostępu bez planów). `[ASSUMPTION]` brak materiału
- User (uses): osoba zarządzająca pracownikami firmy własnej lub zarządzanej; w przypadku z wywiadu — kadrowa. `[INTERVIEW]` interview 2026-11-04
- Stakeholders (decides, blocks, operates): właściciel grupy (adresat przypomnień). `[DOCUMENT]` D07
- Decider for scope decisions: właściciel projektu. `[DOCUMENT]` D01

## Problems, with evidence

- Kadrowa wysyła strażaka na szkolenie, strażak dostaje dokument, oddaje go kadrowej, ta wpina go do segregatora, segregator się zawieruszył. Jedno niedatowane konto; nie wiadomo, czy właściciel był uczestnikiem, ani jaki był koszt i jak często się to zdarza. `[INTERVIEW]` interview 2026-11-04 (uzupełnienie)
- Ogólna opinia, że dokumentacja papierowa często się gubi, to opinia, nie opisane zdarzenie. `[INTERVIEW]` interview 2026-11-04
- Potrzeba pilnowania terminów ważności jest wywnioskowana z deklaracji celu („zarządzać terminami, które trzeba utrzymywać jako aktualne”), nie z opisanego przeoczenia terminu. `[ASSUMPTION]` A01

## Product and how it stands out

- What it is: aplikacja webowa open source do prowadzenia kartoteki pracowników z terminami ważności wymagań i przypomnieniami (patrz Scope). `[DOCUMENT]` D02
- What makes it different: brak porównania; nie sprawdzano istniejących narzędzi.

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|

Benchmark odroczony: nie sprawdzano produktów porównawczych i nie wpływa to na bieżącą decyzję o zakresie.

## Goals and success criteria

- Business goal: nie ustalony (projekt open source, brak planów płatnych).
- User outcome: „Wpisując do bazy Validuo zawsze będzie o tym ślad i zawsze będzie można to znaleźć, można też dodać skan” — oczekiwany efekt wg właściciela, nie zmierzony wynik. `[INTERVIEW]` interview 2026-11-04
- Primary metric, baseline today, threshold, date: nieznane — brak baseline i progu.
- What must not get worse: dostęp wyłącznie przez uprawnienia nadawane osobom; brak uprawnienia = odmowa. `[DOCUMENT]` engineering-standards.md, „Konta, osoby i uprawnienia”

## Scope

- **Now:** terminy ważności wymagań pracownika (dokumenty, szkolenia, uprawnienia), wymagania przypisane do działu, przeniesienie pracownika do innego działu, przypomnienia w aplikacji dla właściciela grupy, opcjonalne skany. Zakres: D02, D06–D09; reguły R01–R04.
- **Later:** grafik (D03); e-mail i inne kanały przypomnień (D07); szczegółowe reguły przypomnień (D04, zastąpione częściowo przez D07).
- **Not doing:** see Non-goals

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|
| Grupa | Profil firmy; w niej tworzy się działy (D06) | właściciel grupy | osoby z uprawnieniem |
| Dział | Jednostka w grupie, do której przypisuje się pracowników i wymagania (D06, D08) | właściciel grupy | osoby z uprawnieniem |
| Wymaganie | Dokument, szkolenie lub uprawnienie z terminem ważności, przypisane do działu (D02, D08) | właściciel grupy | osoby z uprawnieniem |
| Skan | Opcjonalny plik dołączony do wpisu (D09) | właściciel grupy | osoby z uprawnieniem |

## Key flows

- Current state: kadrowa wysyła pracownika na szkolenie → pracownik dostaje dokument → oddaje go kadrowej → kadrowa wpina do segregatora → segregator ginie. `[INTERVIEW]` interview 2026-11-04 (uzupełnienie)
- Future state: osoba uprawniona wpisuje wymagania pracownika i terminy; wpis jest śladem, można dodać skan (D09); właściciel grupy widzi przypomnienia w aplikacji (D07); po przeniesieniu pracownika do innego działu dostaje wymagania nowego działu, a wspólne zachowują uzupełnione dane (D08, R03). `[ASSUMPTION]` kroki zaproponowane na podstawie D07–D09, nie opisane przez użytkownika

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | Działy tworzy się w grupie (profilu firmy); pracowników przypisuje się do działów | grupy, działy | `[DOCUMENT]` D06 | active | po specyfikacji modelu; zgodność ze standardem (wiele grup, hierarchia) do sprawdzenia | właściciel projektu | właściciel projektu | none |
| R02 | Przypomnienia widzi w aplikacji tylko właściciel grupy; bez e-maili | przypomnienia | `[DOCUMENT]` D07 | active | przed historyjkami o `expiring` (próg Q02) | właściciel projektu | właściciel projektu | D04 (część) |
| R03 | Wymagania zostają w dziale; po przeniesieniu pracownik dostaje wymagania nowego działu, a wspólne się uzupełniają | przeniesienie | `[DOCUMENT]` D08 | active | po rozstrzygnięciu Q07 | właściciel projektu | właściciel projektu | none |
| R04 | Skany można dodać, ale są nieobowiązkowe | wymagania | `[DOCUMENT]` D09 | active | po ustaleniu wymagań prawnych (A02) | właściciel projektu | właściciel projektu | none |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | Grafik pracy | żeby Now było jednym zadaniem | właściciel projektu | active | po dostarczeniu terminów | właściciel projektu | `[DOCUMENT]` D03 | none |
| N02 | Przypomnienia e-mail i inne kanały poza aplikacją | decyzja właściciela o kanale | właściciel projektu | active | unknown | właściciel projektu | `[DOCUMENT]` D07 | none |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | 2026-11-04 | Właściciel jest pierwszym użytkownikiem i decyduje o zakresie | „mogę to być ja, bo muszę to testować”; propozycja agenta, bez sprzeciwu | właściciel projektu | active | po rozmowach z innymi osobami | właściciel projektu | `[DOCUMENT]` D01 | none |
| D02 | 2026-11-04 | Now = terminy ważności wymagań pracownika | jedno spójne zadanie; rekomendacja agenta przyjęta odpowiedzią „ok”; rozważano oba zadania naraz | właściciel projektu | active | unknown | właściciel projektu | `[DOCUMENT]` D02 | none |
| D03 | 2026-11-04 | Grafik w Later | żeby Now było jednym zadaniem; rekomendacja agenta przyjęta „ok” | właściciel projektu | active | po terminach | właściciel projektu | `[DOCUMENT]` D03 | none |
| D04 | 2026-11-04 | Zasady przypomnień później | „to wszystko później dostosujemy” | właściciel projektu | superseded | — | — | `[DOCUMENT]` D04 | D07 |
| D06 | 2026-11-04 | Grupa = profil firmy z działami | odpowiedź właściciela | właściciel projektu | active | po specyfikacji | właściciel projektu | `[DOCUMENT]` D06 | none |
| D07 | 2026-11-04 | Przypomnienia tylko w aplikacji, tylko dla właściciela grupy | odpowiedź właściciela | właściciel projektu | active | przed `expiring` | właściciel projektu | `[DOCUMENT]` D07 | D04 (część) |
| D08 | 2026-11-04 | Wymagania zostają w dziale; po przeniesieniu nowe, wspólne się uzupełniają | odpowiedź właściciela; wykładnia „wspólne zachowują dane” to interpretacja agenta | właściciel projektu | active | po Q07 | właściciel projektu | `[DOCUMENT]` D08 | none |
| D09 | 2026-11-04 | Skany opcjonalne | wpis sam jest śladem | właściciel projektu | active | po A02 | właściciel projektu | `[DOCUMENT]` D09 | none |

Id D05 nie istnieje w zapisach; numer pozostaje nieużyty, by nie przenumerowywać.

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | Pilnowanie terminów ważności rozwiązuje problem, który naprawdę mają osoby zarządzające pracownikami `[ASSUMPTION]` wywnioskowane z celu, nie z opisanego zdarzenia | high | jeden przypadek utraty dokumentu (nie przeoczenia terminu); deklaracja celu | zakres Now przesuwa się na samo archiwum dokumentów | rozmowa: „opisz ostatni raz, gdy termin szkolenia/uprawnienia upłynął lub o mało nie upłynął” — czy zdarza się i co kosztuje | właściciel projektu | unknown | untested |
| A02 | Wpis w aplikacji (ze skanem lub bez) wystarcza wobec przepisów i kontroli `[ASSUMPTION]` brak materiału | high | brak | skany staną się obowiązkowe lub potrzebne przechowywanie oryginałów (zmiana R04) | sprawdzić przepisy/wymagania kontroli dla jednej branży (np. szkolenia BHP/PSP) u źródła | właściciel projektu | unknown | untested |
| A03 | Potrzeby innych użytkowników są podobne do potrzeb właściciela `[ASSUMPTION]` z D01 | high | jedno konto jednej osoby będącej autorem projektu | zakres wynika z jednej perspektywy; zmiana Now | 2–3 rozmowy z innymi osobami zarządzającymi pracownikami | właściciel projektu | unknown | untested |
| A04 | Przypomnienia tylko w aplikacji, tylko dla właściciela, wystarczą, by terminy nie umykały `[ASSUMPTION]` z D07 | medium | odpowiedź właściciela, bez opisu użycia | przypomnienia nie są widziane; potrzebny e-mail | ocena po pierwszym użyciu przez właściciela lub w rozmowach (A03) | właściciel projektu | unknown | untested |

## Kill criteria

Nie ustalono. Do rozstrzygnięcia przez właściciela po rozmowach z innymi użytkownikami: co ma skłonić do zatrzymania lub zmiany Now (np. brak potwierdzenia A01 u kolejnych osób). Kryterium i termin pozostają otwarte.

## Hypotheses to test

Brak: nie przeprowadzano syntetycznych rozmów ani przejść persony.

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | Relacja działu do grupy | — | właściciel projektu | closed: D06 |
| Q02 | Próg ostrzegania (stan `expiring`), moment przypomnienia, strefa czasu | yes: historyjki o `expiring` i przypomnieniach | właściciel projektu | open (adresat i kanał zamknięte przez D07) |
| Q03 | Czy skany są w pierwszej wersji | — | właściciel projektu | closed: D09 |
| Q05 | Los wymagań starego działu po przeniesieniu | — | właściciel projektu | closed: D08 |
| Q07 | Co znaczy, że wymagania w dwóch działach są „takie same” (reguła tożsamości) | yes: przeniesienie pracownika (R03) | właściciel projektu | open |

Q04 i Q06 nie występują w zapisach (poza odwołaniami z numeracją) — ich treść nie jest znana i nie została odtworzona.

## Definition of Ready addendum (own)

Problems i Target group mają poparcie tylko w jednym koncie jednej osoby będącej autorem projektu (tier 1); zakres Now jest decyzją właściciela. Otwarte decyzje blokujące Now: Q02 (próg ostrzegania), Q07 (tożsamość wymagań). Gotowe do: rozmów z innymi osobami (A01–A03) i do napisania specyfikacji jako propozycji. Nie gotowe do implementacji historyjek o przypomnieniach i przeniesieniu pracownika.

## Collection plan

- Rozmowy z 2–3 osobami zarządzającymi pracownikami (poza autorem): kogo wskaże właściciel; pytania o ostatni przypadek utraty dokumentu i przeoczonego terminu; termin nieustalony.
- Wymagania prawne co do dokumentów szkoleniowych dla jednej branży (np. PSP): źródło przepisów lub osoba z kontroli; właściciel projektu; termin nieustalony.
