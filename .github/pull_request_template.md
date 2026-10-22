## Cel

<!-- Jeden PR = jeden cel. Odnośnik do specyfikacji z .ai/specs/ (jeśli istnieje). -->

## Zmiany

<!-- Najważniejsze zmiany, pogrupowane tematycznie. -->

## Weryfikacja

<!-- Rzeczywiste wyniki kontroli (środowisko, zakres, wynik). Nie deklaruj testów, których nie uruchomiono. -->

| Kontrola | Wynik |
| --- | --- |
| `npm run lint`, `format:check`, `typecheck` | |
| `npm run test:unit` (100% pokrycia) | |
| `npm run build` | |
| `npm run test:integration` / `test:e2e` | |

## Checklista review (rozdz. 10 standardu)

- [ ] Zmiana realizuje określone wymaganie i mieści się w zakresie zadania.
- [ ] Kierunek zależności `app -> db -> core`, `app -> core`, `app -> ui` jest zachowany.
- [ ] Nowy lub zmieniony kod w `packages/*/src` ma 100% pokrycia testami jednostkowymi.
- [ ] Każdy commit ma podpis DCO (`git commit -s`), a nowe zależności mają licencję zgodną z AGPL-3.0.
- [ ] Chroniona operacja sprawdza sesję i uprawnienia; tenant, aktor i prawa nie pochodzą z payloadu.
- [ ] Schemat wejścia odrzuca niedozwolone pola; encje i surowe błędy nie trafiają do klienta.
- [ ] Operacje wieloetapowe mają poprawną granicę transakcji i ochronę współbieżności.
- [ ] Sekrety, tokeny i prywatne dane nie trafiają do logów, cache ani bundle klienta.
- [ ] Zmiany schematu mają przejrzaną migrację (z constraintami, indeksami, grantami).
- [ ] UI obsługuje błąd, brak danych, brak dostępu, zapis i klawiaturę.

<!-- Pozycje niedotyczące tej zmiany zostaw odznaczone i opisz w "Ograniczenia". -->

## Ograniczenia

<!-- Czego nie sprawdzono, co odłożono i dlaczego. -->
