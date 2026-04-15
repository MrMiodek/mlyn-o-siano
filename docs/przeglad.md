# Przegląd projektu

## Czym jest Młyn o Siano

Młyn o Siano to aplikacja webowa do prowadzenia imprezowego teleturnieju na żywo, inspirowanego programem telewizyjnym _Awantura o Kasę_. Prowadzący uruchamia aplikację lokalnie i wyświetla ją na wspólnym ekranie — drużyny rywalizują o kredyty, licytując się i odpowiadając na pytania z różnych kategorii.

Aplikacja nie wymaga dostępu do internetu po uruchomieniu (poza załadowaniem czcionek Google Fonts). Działa jako lokalny serwer HTTP dostępny pod adresem `localhost:8080`.

## Stos technologiczny

- **Backend** — Node.js z frameworkiem Express
- **Frontend** — statyczny HTML, CSS i JavaScript (bez frameworków frontendowych)
- **Dane** — pytania przechowywane w pliku CSV, konfiguracja i stan gry w plikach JSON
- **Zależności** — Express (serwer HTTP) oraz csv-parse (parsowanie pliku pytań)

## Struktura projektu

```
mlyn-o-siano/
├── server.js              serwer aplikacji
├── config.json            konfiguracja gry
├── package.json           zależności npm
├── public/                pliki frontendowe
│   ├── index.html         strona główna
│   ├── css/style.css      style (ciemny motyw)
│   └── js/app.js          logika klienta
├── data/                  dane gry
│   ├── questions.csv      baza pytań
│   ├── game_state.json    bieżący stan gry (autogenerowany)
│   └── game_history.json  historia stanów do cofania/przywracania (autogenerowany)
└── docs/                  dokumentacja
```

Pliki `game_state.json` i `game_history.json` generowane są automatycznie podczas gry i nie wymagają ręcznej edycji.

## Uruchomienie

Wymagane: Node.js (v18+).

1. Zainstaluj zależności: `npm install`
2. Uruchom serwer: `node server.js`
3. Otwórz przeglądarkę pod adresem `http://localhost:8080`

Stan gry zapisywany jest automatycznie po każdej akcji. Po ponownym uruchomieniu serwera gra wznawia się od ostatniego stanu. Aby rozpocząć nową grę, wystarczy kliknąć przycisk startu na ekranie inicjalizacji.
