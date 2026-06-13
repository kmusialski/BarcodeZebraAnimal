# 🐾 BarcodeZebraAnimal

Aplikacja dla córki do szukania zwierząt. Skanujesz kod kreskowy → pojawia się
zwierzę z **obrazkiem**, **dźwiękiem** i **animacją**.

Składa się z dwóch serwisów (czyste pliki statyczne — bez backendu):

| Plik | Tryb | Do czego |
|------|------|----------|
| `scanner.html` | **Skaner (Zebra)** | Dla dziecka. Skanuje kody, pokazuje animowane zwierzę, gra dźwięk i mówi nazwę po polsku. Działa offline. |
| `studio.html` | **Studio (Desktop)** | Przygotowanie obrazków (URL / wgranie / generowanie w AI), dodawanie własnych zwierząt i **drukowanie wielu kodów kreskowych**. |
| `index.html` | Strona startowa | Linki do obu trybów. |
| `shared.js` | Wspólna logika | Katalog zwierząt, generator kodów **Code128** (bez bibliotek), silnik dźwięku, import/eksport. |
| `sw.js` | Service Worker | Pamięć podręczna, by skaner działał offline. |

## Jak używać

### 1. Studio (na komputerze)
1. Otwórz `studio.html` w przeglądarce.
2. Zaznacz zwierzęta i ustaw liczbę kopii każdego kodu.
3. (Opcjonalnie) Dodaj **własne zwierzę**: nazwa + obrazek (wgrany plik, adres URL
   lub wygenerowany w AI) + emoji zapasowe + dźwięk.
4. Kliknij **Generuj podgląd**, potem **Drukuj** — wydrukują się same etykiety z kodami.

### 2. Skaner (na Zebrze Z52 / Chrome)
1. Otwórz `scanner.html` na urządzeniu (najlepiej hostowany przez HTTPS — patrz niżej).
2. Wciśnij ⛶ (pełny ekran) i daj dziecku skanować kody fizycznym skanerem.
3. Po zeskanowaniu: animowany obrazek + odgłos zwierzęcia + nazwa po polsku 🎉

> **DataWedge (Zebra):** domyślny profil wysyła zeskanowany kod jako klawisze
> zakończone Enterem — aplikacja przechwytuje to automatycznie (niewidoczne pole),
> więc nie trzeba nic konfigurować. Jest też pole „Test bez skanera” w ustawieniach (⚙️).

### Przeniesienie własnych zwierząt na Zebrę
Skaner ma wbudowane zwierzęta domyślne. Własne (dodane w Studio) przenosisz:
- **Plikiem:** Studio → „Pobierz katalog (.json)” → na Zebrze ⚙️ → „Wczytaj plik katalogu”.
- **Linkiem:** Studio → „Kopiuj link do skanera” → otwórz ten link na Zebrze (katalog jest zaszyty w adresie).

## Hosting (zalecane: GitHub Pages)
Dźwięk (Web Audio + mowa) i Service Worker działają najlepiej przez `http(s)`.
Włącz **GitHub Pages** (Settings → Pages → gałąź `main`/branch, katalog `/root`),
a aplikacja będzie pod `https://<użytkownik>.github.io/BarcodeZebraAnimal/`.
Można też po prostu otworzyć pliki lokalnie (`file://`) — działa, ale offline-cache
i część funkcji audio są pewniejsze przez HTTPS.

## Format kodu
Każdy kod to **Code128** z treścią `ZOO:<ID>`, np. `ZOO:LEW`, `ZOO:SLON`.
Czyta go każdy standardowy czytnik 1D.
