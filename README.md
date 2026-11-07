# Kropki ✎

Klasyczna gra w kropki z kratkowanego zeszytu — w przeglądarce.

Dwie osoby na zmianę stawiają kropki na skrzyżowaniach linii, próbując otoczyć kropki przeciwnika. Gdy się uda, gra sama łączy kropki obwódki. Wygrywa ten, kto złapie więcej kropek.

## Jak zagrać
- Otwórz `index.html` w przeglądarce, albo
- włącz **GitHub Pages** (Settings → Pages → Branch: `main`, folder `/`) i graj pod adresem `https://<login>.github.io/Kropki/`.

## Funkcje
- 2 graczy na jednym ekranie lub gra z komputerem (łatwy / trudny)
- trzy rozmiary kartki, cofanie ruchów, edytowalne imiona
- grafika zeszytu w kratkę, atramentowe kropki, odręczne obwódki z animacją, dźwięki
- działa na komputerze i telefonie (mysz i dotyk)

## Zasady
1. Kropki łączą się tylko z najbliższymi sąsiadami (poziomo, pionowo, po skosie).
2. Otoczone kropki przeciwnika są złapane i liczą się jako punkty.
3. Złapanych kropek nie można używać do budowania obwódek.
4. Kropka postawiona w cudzym zamkniętym „domku” zostaje od razu złapana.

## Struktura
| Plik | Zawartość |
|---|---|
| `index.html` | strona gry |
| `css/style.css` | wygląd (zeszyt, karteczki, przyciski) |
| `js/engine.js` | logika gry i przeciwnik komputerowy |
| `js/app.js` | rysowanie na canvas, obsługa myszy/dotyku, dźwięk |
| `PROMPT.md` | prompt opisujący grę |
