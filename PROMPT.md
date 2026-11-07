# Prompt: gra „Kropki” w HTML

Skopiuj poniższy prompt do asystenta AI, aby odtworzyć lub rozbudować tę grę.

---

Zbuduj przeglądarkową grę **„Kropki”** — cyfrową wersję klasycznej gry z kratkowanego zeszytu. Gra ma działać jako statyczna strona WWW (czysty HTML + CSS + JavaScript, bez frameworków i bez kroku budowania), tak by dało się ją otworzyć z pliku `index.html` albo opublikować na GitHub Pages.

## Zasady gry
1. Grają dwie osoby (Niebieski i Czerwony). Na zmianę stawiają po jednej kropce na skrzyżowaniach linii kratki.
2. Celem jest otoczenie kropek przeciwnika zamkniętym łańcuchem własnych kropek.
3. Łączyć można tylko kropki z najbliższego otoczenia: sąsiednie w poziomie, w pionie i po skosie (8 kierunków).
4. Kropki złapane przez przeciwnika nie mogą być używane do budowania obwódek.
5. Gdy otoczenie się uda, gra automatycznie łączy kropki obwódki liniami w kolorze gracza i wypełnia obszar półprzezroczystym kolorem; złapane kropki są wyblakłe i przekreślone.
6. Wnętrze zamkniętego obszaru jest zajęte — nie można tam stawiać kropek.
7. Kropka postawiona w pustym „domku” otoczonym przez przeciwnika zostaje od razu złapana (najpierw liczy się otoczenie gracza wykonującego ruch, potem przeciwnika).
8. Własne kropki złapane wcześniej przez przeciwnika wracają do gry, jeśli zostaną odbite większą obwódką.
9. Wygrywa osoba, która złapie więcej kropek. Gra kończy się, gdy zabraknie wolnych miejsc albo po kliknięciu „Koniec gry”.

## Algorytm otaczania (wymagany)
- Aktywne kropki gracza P tworzą „mur”.
- Przeszukiwanie wszerz (BFS, 4 kierunki) od wszystkich punktów krawędzi planszy, które nie są murem → punkty „zewnętrzne”.
- Każda spójna grupa pozostałych punktów to obszar zamknięty. Jeśli zawiera aktywną kropkę przeciwnika — P ją łapie.
- Obrys rysuj z odcinków między sąsiednimi kropkami muru, które oddzielają obszar od zewnątrz (bez przekątnych wewnątrz kwadratów).

## Tryby i funkcje
- 2 graczy na jednym ekranie oraz gra z komputerem (poziom łatwy i trudny).
- Komputer: ocenia ruchy w pobliżu istniejących kropek — premiuje otoczenia, blokowanie otoczeń gracza, unika ruchów samobójczych; na poziomie trudnym patrzy dwa ruchy do przodu.
- Rozmiary kartki: 16×12, 24×18, 32×24. Na ekranie pionowym plansza obraca się.
- Przyciski: Nowa gra, Cofnij, Koniec gry, Zasady, wyciszenie dźwięku. Edytowalne imiona graczy.
- Licznik złapanych kropek dla każdego gracza i wyróżnienie, czyj jest ruch.

## Grafika (ma być atrakcyjna)
- Klimat zeszytu szkolnego na drewnianym biurku: kremowa kartka w niebieską kratkę, czerwony margines, dziurki od segregatora, delikatny cień.
- Odręczne fonty (Google Fonts: Caveat, Patrick Hand).
- Kropki jak atrament z długopisu (niebieski i czerwony) z gradientem; animacja „wskoczenia” nowej kropki; pulsujące kółko przy ostatnim ruchu; półprzezroczysty podgląd pod kursorem.
- Obwódki rysowane lekko falującą linią „od ręki”, z animacją rysowania, wypełnieniem i kreskowaniem; unoszący się napis „+N” po otoczeniu.
- Karty graczy jak przyklejone taśmą karteczki, przyciski w stylu szkicu, komunikaty na żółtej karteczce.
- Proste dźwięki generowane przez Web Audio API (bez plików).
- Pełna responsywność: mysz i dotyk, ekran o wysokiej gęstości pikseli (canvas × devicePixelRatio).

## Struktura plików
```
index.html
css/style.css
js/engine.js   – czysta logika gry (do testów także w Node.js)
js/app.js      – interfejs, rysowanie na <canvas>, dźwięk
```
Na koniec utwórz repozytorium git o nazwie **Kropki** i wypchnij do niego kod.
