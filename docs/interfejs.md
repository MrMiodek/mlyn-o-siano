# Interfejs i API

## Układ ekranu

Interfejs podzielony jest na cztery strefy:

### Pasek górny

Wyświetla numer bieżącej rundy i pytania oraz nazwę aktualnej kategorii (po jej wylosowaniu). Po prawej stronie znajdują się przyciski **Cofnij** i **Przywróć**, pozwalające na nawigowanie w historii stanów gry. Przyciski są wyszarzone gdy operacja nie jest dostępna (np. brak historii do cofnięcia lub przywrócenia).

### Lewy pasek boczny

Zawiera:

- Aktualną podkategorię (po jej wybraniu)
- Pulę pytania — suma kredytów do zdobycia w bieżącym pytaniu
- Karty drużyn — każda pokazuje nazwę, liczbę kredytów, liczbę tokenów i ewentualne postawione kredyty w licytacji. Aktywna drużyna jest wyróżniona wizualnie. Kliknięcie na kredyty lub tokeny otwiera okno edycji ręcznej.

### Obszar centralny

Główna przestrzeń gry, w której wyświetlane są kolejne ekrany zależnie od fazy:

- **Ekran startowy** — logo i przycisk rozpoczęcia gry
- **Losowanie** — animowane koło z kategoriami i przycisk zatwierdzenia
- **Licytacja** — pola do wprowadzania stawek dla każdej drużyny, przyciski +/- i Va Bank, przycisk zatwierdzenia (aktywny dopiero gdy wszystkie drużyny mają wpisaną kwotę)
- **Podkategoria** — trzy przyciski z dostępnymi podkategoriami
- **Pytanie** — treść pytania oraz przyciski akcji rozmieszczone w dwóch rzędach: górny rząd to akcje gracza (podpowiedź, zmiana podkategorii, pass), dolny to odpowiedzi (poprawna, błędna)
- **Podsumowanie** — wynik pytania i przycisk zatwierdzenia
- **Koniec gry** — tabela rankingowa z wynikami wszystkich drużyn

### Prawy pasek boczny

Zawiera instrukcję dla graczy — za co można wydawać tokeny i za co je zdobywać.

## Edycja ręczna

Prowadzący może w dowolnym momencie kliknąć na kredyty lub tokeny drużyny w lewym pasku bocznym, aby otworzyć okno edycji. Pozwala to na korektę wartości w sytuacjach niestandardowych.

## System cofania i przywracania

Aplikacja zapisuje historię do 50 ostatnich stanów gry w pliku `data/game_history.json` (format: tablica stanów z kursorem wskazującym bieżący stan). Historia przetrwa restart serwera.

- **Cofnij** — przesuwa kursor wstecz, przywracając poprzedni stan gry
- **Przywróć** — przesuwa kursor do przodu, przywracając cofnięty stan

Wykonanie nowej akcji po cofnięciu kasuje wszystkie stany „przyszłe" (za kursorem) — nie da się wówczas przywrócić. Działa to analogicznie do undo/redo w edytorach tekstu.

## Endpointy API

Aplikacja komunikuje się między frontendem a backendem przez REST API.

### Odczyt danych

| Metoda | Ścieżka            | Opis                                         |
| ------ | ------------------ | -------------------------------------------- |
| GET    | /api/config        | Konfiguracja gry                             |
| GET    | /api/state         | Bieżący stan gry                             |
| GET    | /api/questions     | Pytania pogrupowane według kategorii         |
| GET    | /api/subcategories | Podkategorie dostępne dla bieżącej kategorii |

### Przebieg gry

| Metoda | Ścieżka                 | Opis                                                           |
| ------ | ----------------------- | -------------------------------------------------------------- |
| POST   | /api/init               | Inicjalizacja nowej gry                                        |
| POST   | /api/draw               | Losowanie kategorii                                            |
| POST   | /api/confirm-draw       | Zatwierdzenie losowania, pobranie myto, przejście do licytacji |
| POST   | /api/submit-bids        | Zatwierdzenie licytacji, wyłonienie aktywnej drużyny           |
| POST   | /api/select-subcategory | Wybór podkategorii i załadowanie pytania                       |
| POST   | /api/change-subcategory | Zmiana podkategorii (koszt: 1 token)                           |
| POST   | /api/reveal-abcd        | Odkrycie opcji ABCD (koszt: 1 token)                           |
| POST   | /api/use-margin         | Zwiększenie marginesu (koszt: 1 token)                         |
| POST   | /api/correct-answer     | Zarejestrowanie poprawnej odpowiedzi                           |
| POST   | /api/wrong-answer       | Błędna odpowiedź, pytanie przechodzi dalej                     |
| POST   | /api/pass-question      | Pass — token dla drużyny, pytanie przechodzi dalej             |
| POST   | /api/wrong-abcd         | Błędna opcja ABCD — token dla drużyny, opcja wyszarzona        |
| POST   | /api/confirm-summary    | Zatwierdzenie podsumowania, przejście do kolejnego pytania     |
| POST   | /api/update-team        | Ręczna edycja kredytów lub tokenów drużyny                     |
| GET    | /api/history-info       | Informacja o dostępności cofania i przywracania                |
| POST   | /api/undo               | Cofnięcie do poprzedniego stanu gry                            |
| POST   | /api/redo               | Przywrócenie cofniętego stanu gry                              |
