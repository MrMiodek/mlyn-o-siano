# Konfiguracja i pytania

## Plik konfiguracyjny

Ustawienia gry znajdują się w pliku `config.json` w katalogu głównym projektu. Zmiany wymagają ponownego uruchomienia serwera.

| Pole                  | Opis                                           | Domyślnie                           |
| --------------------- | ---------------------------------------------- | ----------------------------------- |
| `teams`               | Liczba drużyn (3 lub 4)                        | 4                                   |
| `teamNames`           | Nazwy drużyn                                   | Czerwoni, Niebiescy, Żółci, Zieloni |
| `teamColors`          | Kolory drużyn (kody hex)                       | czerwony, niebieski, żółty, zielony |
| `startingCredits`     | Kredyty startowe każdej drużyny                | 1000                                |
| `startingTokens`      | Tokeny startowe każdej drużyny                 | 3                                   |
| `tokensBetweenRounds` | Tokeny dodawane każdej drużynie między rundami | 1                                   |
| `rounds`              | Liczba rund w grze                             | 3                                   |
| `questionsPerRound`   | Liczba pytań w każdej rundzie                  | 5                                   |
| `baseTax`             | Stawki myto (%) dla kolejnych rund             | 5, 10, 15                           |
| `bidStep`             | Krok przycisków +/- w licytacji                | 100                                 |
| `questionsFile`       | Ścieżka do pliku z pytaniami                   | ./data/questions.csv                |

Pole `baseTax` to lista wartości procentowych — po jednej na rundę. Pierwsza wartość to stawka myto w pierwszej rundzie, druga w drugiej itd. Myto to procent kredytów pobierany od każdej drużyny do puli na początku każdej licytacji.

## Plik pytań

Pytania przechowywane są w pliku CSV (domyślnie `data/questions.csv`). Każdy wiersz to jedno pytanie.

### Kolumny

| Kolumna               | Opis                                            | Dotyczy      |
| --------------------- | ----------------------------------------------- | ------------ |
| Kategoria             | Nazwa kategorii (np. Nauka, Sport)              | wszystkie    |
| Podkategoria          | Nazwa podkategorii (np. Fizyka, Biologia)       | wszystkie    |
| Pytanie               | Treść pytania                                   | wszystkie    |
| Typ_pytania           | `ABCD` lub `Liczba`                             | wszystkie    |
| Margines              | Dopuszczalne odchylenie od poprawnej odpowiedzi | tylko Liczba |
| Podpucha1             | Pierwsza błędna odpowiedź                       | tylko ABCD   |
| Podpucha2             | Druga błędna odpowiedź                          | tylko ABCD   |
| Podpucha3             | Trzecia błędna odpowiedź                        | tylko ABCD   |
| Akceptowana_Odpowiedź | Poprawna odpowiedź                              | wszystkie    |
| Media                 | URL do materiału multimedialnego (opcjonalny)   | wszystkie    |

Kolumna `Media` jest opcjonalna. Jeśli zawiera URL, link pojawi się na ekranie podsumowania po odpowiedzi. Treść pytania (`Pytanie`) może też zawierać osadzone linki w formacie Markdown (`[etykieta](url)`) — zostaną wyświetlone jako klikalne linki otwierające wyskakujące okno.

Serwer udostępnia pliki z katalogu `data/media/` pod ścieżką `/media/` — można tam umieszczać lokalne pliki graficzne lub dźwiękowe i odnosić się do nich jako `http://localhost:8080/media/plik.mp4`.

### Organizacja pytań

Pytania pogrupowane są w kategorie, a każda kategoria zawiera dokładnie 3 podkategorie. Podczas gry po wylosowaniu kategorii aktywna drużyna wybiera jedną z trzech podkategorii — dlatego ważne, by każda kategoria miała trzy unikalne podkategorie.

### Dodawanie własnych pytań

Aby dodać nowe pytania, wystarczy dopisać wiersze do pliku CSV zachowując powyższy format. Należy pamiętać o:

- Każda nowa kategoria powinna mieć dokładnie 3 podkategorie
- Kolumny nieużywane dla danego typu pytania mogą pozostać puste
- Margines dla pytań liczbowych określa ile jednostek odchylenia od poprawnej odpowiedzi jest akceptowane (np. margines 5000 dla pytania o prędkość światła 300000 km/s akceptuje odpowiedzi od 295000 do 305000)
