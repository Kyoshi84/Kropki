# Kropki / Notebook Dots ✎

Klasyczna gra w kropki z kratkowanego zeszytu — w przeglądarce. W wersji angielskiej, niemieckiej i hiszpańskiej nazywa się **Notebook Dots**.

Dwie osoby na zmianę stawiają kropki na skrzyżowaniach linii, próbując otoczyć kropki przeciwnika. Gdy się uda, gra sama łączy kropki obwódki. Wygrywa ten, kto złapie więcej kropek.

## Jak zagrać
- Otwórz `index.html` w przeglądarce, albo
- włącz **GitHub Pages** (Settings → Pages → Branch: `main`, folder `/`) i graj pod adresem `https://kyoshi84.github.io/Kropki/`.

## Funkcje
- 2 graczy na jednym ekranie lub gra z komputerem (łatwy / trudny)
- 4 języki: angielski (domyślny), polski, niemiecki, hiszpański — zmiana w menu
- trzy rozmiary kartki, cofanie ruchów, edytowalne imiona
- grafika zeszytu w kratkę, atramentowe kropki, odręczne obwódki z animacją, dźwięki
- mieści się w każdym oknie bez przewijania; mysz i dotyk
- integracja z CrazyGames SDK v3 (poza CrazyGames gra działa normalnie bez SDK)

## CrazyGames
- `tools/build-crazygames.sh` buduje paczkę do wysłania: `dist/notebook-dots-crazygames.zip`
- `promo/CRAZYGAMES.md` zawiera opisy (EN/PL/DE/ES), sterowanie i listę kontrolną wymagań
- `promo/covers/` i `promo/video/` to okładki i filmy podglądowe, generowane przez `promo/cover.html`

## Playgama
- `tools/build-playgama.sh [wersja]` buduje paczkę `dist/notebook-dots-playgama-<wersja>.zip` z Playgama Bridge SDK
  (podmienia skrypt CrazyGames na Bridge i `js/platform.js` na `js/platform-playgama.js`, dodaje `playgama/playgama-bridge-config.json`)
- reklamy pełnoekranowe na naturalnych przerwach: koniec partii, „Nowa gra”, otwarcie menu (Bridge sam pilnuje odstępów)
- reklama z nagrodą: przycisk „Podpowiedź” pokazuje najlepszy ruch (widoczny tylko, gdy platforma obsługuje takie reklamy)
- zapis ustawień i bilansu z komputerem przez Bridge Storage, obsługa pauzy i wyciszenia z platformy

## Struktura
| Plik | Zawartość |
|---|---|
| `index.html` | strona gry |
| `css/style.css` | wygląd (zeszyt, karteczki, przyciski) |
| `js/engine.js` | logika gry i przeciwnik komputerowy |
| `js/i18n.js` | tłumaczenia |
| `js/platform.js` | CrazyGames SDK (gameplay start/stop, język, wyciszenie) |
| `js/platform-playgama.js` | Playgama Bridge SDK (reklamy, zapis, pauza, wyciszenie, język) |
| `js/app.js` | rysowanie na canvas, obsługa myszy/dotyku, dźwięk |
| `fonts/` | czcionki Caveat i Patrick Hand (SIL OFL) |
| `PROMPT.md` | prompt opisujący grę |
