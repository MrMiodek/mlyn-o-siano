# Zasady gry

## Uczestnicy

W grze bierze udział od 3 do 4 drużyn. Każda drużyna posiada dwa zasoby:

- **Kredyty** — główna waluta gry. Drużyny rozpoczynają z ustaloną pulą kredytów, tracą je podczas licytacji i myto, a zdobywają za poprawne odpowiedzi. Końcowa liczba kredytów decyduje o zwycięstwie.
- **Tokeny** — specjalna waluta wymieniana na podpowiedzi i akcje w trakcie pytania. Drużyny zaczynają z ustaloną liczbą tokenów i mogą je zdobywać lub tracić w trakcie gry.

## Struktura rozgrywki

Gra składa się z kilku rund (domyślnie 3), a każda runda zawiera ustaloną liczbę pytań (domyślnie 5). Między rundami wszystkie drużyny otrzymują dodatkowe tokeny.

Każde pytanie przechodzi przez następujące fazy:

### 1. Losowanie kategorii

Prowadzący losuje kategorię z dostępnej puli. Na ekranie wyświetla się animowane koło z nazwami kategorii. Po wylosowaniu prowadzący zatwierdza wynik i gra przechodzi do licytacji.

Pula kategorii zmniejsza się w trakcie rundy — wylosowane kategorie nie powtarzają się. Jeśli pula się wyczerpie, wraca do niej zestaw wcześniej użytych kategorii.

### 2. Myto i licytacja

Przed rozpoczęciem licytacji od każdej drużyny pobierane jest **myto** — procent aktualnych kredytów trafiający do wspólnej puli pytania. Stawka myto rośnie z każdą rundą (domyślnie 5%, 10%, 15%). Myto doliczane jest do puli, która może zawierać środki z poprzednich pytań (jeśli żadna drużyna nie odpowiedziała poprawnie).

Następnie drużyny licytują — każda deklaruje, ile kredytów stawia na to pytanie. Dostępna jest opcja „Va Bank", która automatycznie stawia wszystkie posiadane kredyty. Po zatwierdzeniu licytacji kredyty zostają odjęte od kont drużyn i dodane do puli. Drużyna, która postawiła najwięcej, staje się **aktywną drużyną** i jako pierwsza odpowiada na pytanie.

W przypadku remisu w licytacji o pierwszeństwo decyduje: mniejsza liczba kredytów, potem mniejsza liczba tokenów, a na końcu kolejność w interfejsie.

### 3. Wybór podkategorii

Aktywna drużyna wybiera jedną z trzech dostępnych podkategorii w ramach wylosowanej kategorii. Każda podkategoria odpowiada jednemu pytaniu. Użyte podkategorie nie pojawiają się ponownie.

### 4. Pytanie

Wyświetlane jest pytanie wybranej podkategorii. Pytania dzielą się na dwa typy:

- **ABCD** — pytanie z czterema opcjami odpowiedzi (jedna poprawna, trzy podpuchy)
- **Liczbowe** — pytanie wymagające podania liczby z dopuszczalnym marginesem błędu

Aktywna drużyna może wykonać jedną z następujących akcji:

**Akcje kosztujące token (-1 token):**
- **Podpowiedź ABCD** (pytania ABCD) — odsłania cztery opcje odpowiedzi wyświetlone w losowej kolejności
- **Zwiększenie marginesu** (pytania liczbowe) — zwiększa dopuszczalny margines błędu
- **Zmiana podkategorii** — drużyna wraca do wyboru podkategorii i wybiera inną

**Odpowiedzi:**
- **Poprawna odpowiedź** — drużyna zdobywa kredyty z puli (patrz: Punktacja)
- **Błędna odpowiedź** — pytanie przechodzi do następnej drużyny w kolejności licytacji
- **Pass** — drużyna rezygnuje z odpowiedzi, otrzymuje token, pytanie przechodzi dalej

Przy pytaniach ABCD po odsłonięciu opcji drużyna może kliknąć jedną z odpowiedzi. Kliknięcie podpuchy oznacza błędną odpowiedź — opcja zostaje wyszarzona, drużyna dostaje token, a pytanie przechodzi do kolejnej drużyny.

Jeśli żadna drużyna nie odpowie poprawnie, pula pytania przenosi się do następnego pytania.

### 5. Podsumowanie

Wyświetlany jest wynik pytania — która drużyna zdobyła ile kredytów, lub informacja o przeniesieniu puli. Po zatwierdzeniu gra przechodzi do losowania kolejnej kategorii (lub do następnej rundy / końca gry).

## Punktacja

- **Poprawna odpowiedź bez podpowiedzi** (longshot) — drużyna zdobywa kredyty równe puli pytania + otrzymuje bonus w postaci tokenu
- **Poprawna odpowiedź z podpowiedzią** — drużyna zdobywa kredyty równe puli pytania (bez bonusowego tokenu)
- **Pytanie bez poprawnej odpowiedzi** — pula przenosi się do następnego pytania (kumuluje się z mytem i licytacją kolejnego pytania)

## Bilans tokenów

**Zdobywanie tokenów (+1):**
- Pass (podanie pytania dalszej drużynie)
- Poprawna odpowiedź bez podpowiedzi (bonus longshot)
- Kliknięcie błędnej opcji ABCD
- Między rundami (wszystkie drużyny, konfigurowalnie)

**Wydawanie tokenów (-1):**
- Odkrycie opcji ABCD
- Zwiększenie marginesu (pytanie liczbowe)
- Zmiana podkategorii

## Koniec gry

Po zakończeniu ostatniego pytania w ostatniej rundzie wyświetlany jest ekran końcowy z rankingiem drużyn posortowanym według liczby kredytów.
