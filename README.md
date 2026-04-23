# Młyn o Siano 🌾

Teleturniej imprezowy inspirowany Awanturą o Kasę.

## Uruchomienie

```bash
cd mlyn-o-siano
npm install
node server.js
```

Następnie otwórz w przeglądarce: **http://localhost:8080**

## Konfiguracja

Edytuj plik `config.json`:

| Pole                  | Opis                                      |
| --------------------- | ----------------------------------------- |
| `teams`               | Liczba drużyn (3 lub 4)                   |
| `teamNames`           | Nazwy drużyn                              |
| `teamColors`          | Kolory drużyn (hex)                       |
| `startingCredits`     | Startowe kredyty                          |
| `startingTokens`      | Startowe tokeny                           |
| `tokensBetweenRounds` | Tokeny dodawane między rundami            |
| `rounds`              | Liczba rund                               |
| `questionsPerRound`   | Pytań na rundę                            |
| `basePools`           | Bazowa pula dla każdej rundy [R1, R2, R3] |

## Pytania

Edytuj plik `data/questions.csv`. Format kolumn:

```
Kategoria, Podkategoria, Pytanie, Typ_pytania, Margines, Podpucha1, Podpucha2, Podpucha3, Akceptowana_Odpowiedź, Media
```

- `Typ_pytania`: `ABCD` lub `Liczba`
- `Margines`: tylko dla pytań liczbowych (ile odchylenia jest akceptowane)
- `Podpucha1-3`: tylko dla pytań ABCD (błędne odpowiedzi)
- `Media`: opcjonalny URL do pliku multimedialnego wyświetlanego po odpowiedzi
- Treść pytania może zawierać osadzone linki w formacie Markdown: `[etykieta](media/plik.mp4)` — wyświetlane jako klikalne linki otwierające wyskakujące okno. Jeśli treść pytania zawiera przecinki, całe pole należy ująć w cudzysłów (jak w trzecim przykładzie poniżej)

### Media lokalne

Umieść pliki w katalogu `data/media/` — serwer udostępnia je pod ścieżką `/media/nazwa_pliku`. W kolumnie wystarczy podać samą ścieżkę bez wiodącego ukośnika:

```
media/klip.mp4
```

### Przykładowe wiersze

```
Nauka,Fizyka,Ile wynosi prędkość światła w próżni?,Liczba,5000,,,,299792,media/svetlo.mp4
Sport,Piłka nożna,Kto strzelił gola w finale MŚ 2022?,ABCD,,Messi,Mbappé,Griezmann,Mbappé,
Muzyka,Klasyka,"Posłuchaj ([fragment](media/utwor.mp3)) i podaj nazwisko kompozytora.",ABCD,,Mozart,Chopin,Beethoven,Bach,
```

## Przebieg gry

1. **Losowanie** — kliknij "Losuj kategorię", kategoria animuje się przez kilka sekund
2. **Licytacja** — drużyny wpisują ile stawiają (Va Bank = wszystkie kredyty)
3. **Podkategoria** — aktywna drużyna wybiera jedną z 3 podkategorii
4. **Pytanie** — drużyna odpowiada, może użyć podpowiedzi (ABCD lub Margines+)
5. **Podsumowanie** — wynik pytania, zatwierdzenie, przejście dalej

## Funkcje

- 🎡 Animowane losowanie kategorii
- 💰 Licytacja z Va Bank
- 🔄 Przycisk Cofnij (przywraca poprzedni stan)
- ✏️ Klikalne kredyty/tokeny drużyn (edycja ręczna)
- 📊 Ekran końcowy z rankingiem
