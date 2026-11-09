# Zgłoszenie do CrazyGames — Notebook Dots

## Pliki do przesłania
| Co | Plik |
|---|---|
| Gra (paczka HTML5) | `dist/notebook-dots-crazygames.zip`, budowana przez `tools/build-crazygames.sh` |
| Okładka 16:9 (1920×1080) | `promo/covers/cover-landscape-1920x1080.png` |
| Okładka 2:3 (800×1200) | `promo/covers/cover-portrait-800x1200.png` |
| Okładka 1:1 (800×800) | `promo/covers/cover-square-800x800.png` |
| Film 16:9 1080p, 18,5 s, bez dźwięku | `promo/video/preview-landscape-1920x1080.mp4` |
| Film 2:3 1080p, 18,5 s, bez dźwięku | `promo/video/preview-portrait-1080x1620.mp4` |

Okładki i filmy generuje `promo/cover.html` (powtarzalnie, dzięki stałemu ziarnu losowania). Pierwsza klatka filmu to okładka.

Ustawienia w Developer Portal:
- **Orientacja:** obie (gra sama dopasowuje się do ekranu poziomego i pionowego).
- **Urządzenia:** komputer, telefon i tablet (obsługuje mysz i dotyk).
- **Kategoria:** Puzzle / Board / 2 Player.

---

## Game description (EN, wymagany)
**Notebook Dots** is the classic paper-and-pencil game from the back of every school notebook. Take turns placing dots on the crossings of the squared paper and trap your opponent's dots inside a closed chain of your own. Close a loop and the game draws the outline for you, while the captured dots count as your points. Build walls, set traps and don't step into your rival's "houses"!

- Play against the computer (easy or hard) or challenge a friend on the same screen
- Three board sizes, from a quick game to a long battle
- Hand-drawn notebook look with ink dots and animated outlines
- Available in English, Polish, German and Spanish

## Controls (EN, wymagany)
- **Mouse / touch:** click or tap a line crossing to place a dot.
- **Undo** takes back your last move. **Menu** opens game mode, board size, language, sound and rules.

---

## Opis gry (PL)
**Notebook Dots** to klasyczna gra w kropki z ostatniej strony szkolnego zeszytu. Na zmianę stawiajcie kropki na skrzyżowaniach kratek i otaczajcie kropki przeciwnika zamkniętym łańcuchem własnych. Gdy zamkniesz obwódkę, gra sama ją narysuje, a złapane kropki trafią na Twoje konto. Buduj mury, zastawiaj pułapki i nie wchodź do cudzych „domków”!

**Sterowanie:** kliknij lub dotknij skrzyżowania linii, aby postawić kropkę. „Cofnij” cofa ruch, „Menu” zawiera tryb gry, rozmiar kartki, język, dźwięk i zasady.

## Spielbeschreibung (DE)
**Notebook Dots** ist das klassische Papier-und-Stift-Spiel aus jedem Schulheft. Setzt abwechselnd Punkte auf die Kreuzungen des Karopapiers und umzingelt die Punkte eures Gegners mit einer geschlossenen Kette eigener Punkte. Schließt du einen Kreis, zeichnet das Spiel den Umriss für dich, und die gefangenen Punkte zählen für dich. Baue Mauern, stelle Fallen und tappe nicht in die „Häuser“ deines Gegners!

**Steuerung:** Klicke oder tippe auf eine Linienkreuzung, um einen Punkt zu setzen. „Zurück“ nimmt den letzten Zug zurück, im „Menü“ findest du Spielmodus, Spielfeldgröße, Sprache, Ton und Regeln.

## Descripción del juego (ES)
**Notebook Dots** es el clásico juego de lápiz y papel de la última página de cualquier cuaderno escolar. Colocad puntos por turnos en los cruces de la cuadrícula y rodead los puntos del rival con una cadena cerrada de los vuestros. Al cerrar un contorno, el juego lo dibuja por ti y los puntos atrapados suman a tu marcador. ¡Construye muros, tiende trampas y no te metas en las «casas» de tu rival!

**Controles:** haz clic o toca un cruce de líneas para colocar un punto. «Deshacer» anula tu última jugada y en el «Menú» están el modo de juego, el tamaño del tablero, el idioma, el sonido y las reglas.

---

## Lista kontrolna wymagań
| Wymaganie | Stan |
|---|---|
| Rozmiar ≤ 50 MB, ≤ 1500 plików, tylko ścieżki względne | ✅ ok. 210 KB, 14 plików |
| Język angielski jako domyślny + wybór języka z SDK (`systemInfo.locale`) | ✅ EN, PL, DE, ES |
| Czytelność w oknach 907×510, 1216×684, 1077×606, 821×462, 1366×768, 1920×1080, 800×450, 1080×607 | ✅ bez przewijania, sprawdzone automatycznie |
| `user-select: none` na `body` (mobile) | ✅ |
| Mysz i dotyk | ✅ |
| AudioContext wznawiany w geście użytkownika | ✅ |
| Wyciszenie z SDK (`settings.muteAudio`) ma pierwszeństwo przed przyciskiem w grze | ✅ |
| Brak własnego przycisku pełnego ekranu | ✅ |
| Brak zewnętrznych linków i reklam | ✅ |
| PEGI 12 | ✅ |
| Gracz od razu trafia do rozgrywki | ✅ partia z komputerem startuje od razu |
| SDK: `gameplayStart` / `gameplayStop` (menu, zasady, koniec gry), `happytime` (wygrana z trudnym komputerem) | ✅ |
| Animacje niezależne od częstotliwości odświeżania (144 Hz) | ✅ oparte na czasie |
| Czcionki dołączone do paczki (bez Google Fonts) | ✅ licencja SIL OFL w `fonts/` |
| Brak zbierania danych osobowych | ✅ tylko ustawienia w `localStorage` |

Przed wysłaniem przetestuj paczkę w **QA Tool** w Developer Portal. Lokalnie możesz włączyć tryb SDK `local`, dopisując do adresu `?useLocalSdk=true`.
