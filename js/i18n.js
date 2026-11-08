/* Kropki — tłumaczenia (PL, EN, DE, ES) */
(function (root) {
  'use strict';

  const STRINGS = {
    pl: {
      docTitle: 'Kropki — gra z zeszytu',
      title: 'Kropki',
      tagline: 'otocz kropki przeciwnika',
      p1: 'Niebieski', p2: 'Czerwony', cpu: 'Komputer',
      yourTurnFlag: 'Twój ruch ✎',
      newGame: 'Nowa gra', undo: 'Cofnij', menu: 'Menu', endGame: 'Koniec gry', rules: 'Zasady', done: 'Gotowe',
      mode: 'Tryb', modePvp: '2 graczy (jeden ekran)', modeAi1: 'Z komputerem — łatwy', modeAi2: 'Z komputerem — trudny',
      size: 'Kartka', sizeS: 'Mała', sizeM: 'Średnia', sizeL: 'Duża',
      language: 'Język', sound: 'Dźwięk', on: 'Wł.', off: 'Wył.', mutedByPlatform: 'wyciszone przez stronę',
      statusTurn: 'Ruch: {n}', statusYou: 'Twój ruch', statusCpu: 'Ruch komputera', thinking: 'Komputer myśli…',
      gameOver: 'Koniec gry',
      toastCapture: '{n} otacza {k} {dots}!',
      toastTrap: 'Pułapka! {n} łapie {k} {dots}',
      draw: 'Remis!', wins: 'Wygrywa {n}! 🎉', cpuWins: 'Komputer wygrywa', score: 'Wynik {a} : {b}',
      viewBoard: 'Zobacz planszę', again: 'Jeszcze raz',
      hint: 'Stawiaj kropki na skrzyżowaniach linii i otaczaj kropki rywala!',
      rulesTitle: 'Zasady gry w kropki',
      rulesList: [
        'Grają dwie osoby, na zmianę stawiając kropki na skrzyżowaniach linii.',
        'Celem jest <b>otoczenie</b> kropek przeciwnika zamkniętym łańcuchem własnych kropek.',
        'Łączyć można tylko kropki sąsiednie — w poziomie, w pionie lub po skosie.',
        'Gdy otoczysz kropki przeciwnika, gra sama je obrysuje — są złapane i liczą się jako Twoje punkty.',
        'Złapanych kropek nie można używać do budowania obwódek. Wnętrze zamkniętego obszaru jest zajęte.',
        'Kropka postawiona w cudzym zamkniętym „domku” zostaje od razu złapana.',
        'Wygrywa ten, kto złapie więcej kropek. Gra kończy się, gdy zabraknie miejsc albo po wybraniu „Koniec gry”.',
      ],
      rulesOk: 'Do gry!',
      dots: (k) => {
        if (k === 1) return 'kropkę';
        const d = k % 10, t = k % 100;
        return (d >= 2 && d <= 4 && (t < 12 || t > 14)) ? 'kropki' : 'kropek';
      },
    },
    en: {
      docTitle: 'Notebook Dots — the classic paper game',
      title: 'Notebook Dots',
      tagline: "surround your opponent's dots",
      p1: 'Blue', p2: 'Red', cpu: 'Computer',
      yourTurnFlag: 'Your turn ✎',
      newGame: 'New game', undo: 'Undo', menu: 'Menu', endGame: 'End game', rules: 'Rules', done: 'Done',
      mode: 'Mode', modePvp: '2 players (same screen)', modeAi1: 'vs Computer — easy', modeAi2: 'vs Computer — hard',
      size: 'Board', sizeS: 'Small', sizeM: 'Medium', sizeL: 'Large',
      language: 'Language', sound: 'Sound', on: 'On', off: 'Off', mutedByPlatform: 'muted by the website',
      statusTurn: "{n}'s turn", statusYou: 'Your move', statusCpu: "Computer's move", thinking: 'Computer is thinking…',
      gameOver: 'Game over',
      toastCapture: '{n} surrounds {k} {dots}!',
      toastTrap: 'Trapped! {n} captures {k} {dots}',
      draw: "It's a draw!", wins: '{n} wins! 🎉', cpuWins: 'The computer wins', score: 'Score {a} : {b}',
      viewBoard: 'View board', again: 'Play again',
      hint: "Place dots on the line crossings and surround your rival's dots!",
      rulesTitle: 'How to play',
      rulesList: [
        'Two players take turns placing dots on the crossings of the grid lines.',
        "The goal is to <b>surround</b> your opponent's dots with a closed chain of your own dots.",
        'Only neighbouring dots connect — horizontally, vertically or diagonally.',
        'When you enclose enemy dots, the game draws the outline for you — they are captured and count as your points.',
        'Captured dots can no longer be used to build outlines. The inside of a closed area is taken.',
        "A dot placed inside your opponent's closed \"house\" is captured right away.",
        'Whoever captures more dots wins. The game ends when the board is full or when you choose "End game".',
      ],
      rulesOk: "Let's play!",
      dots: (k) => (k === 1 ? 'dot' : 'dots'),
    },
    de: {
      docTitle: 'Notebook Dots — das klassische Papierspiel',
      title: 'Notebook Dots',
      tagline: 'Umzingle die Punkte deines Gegners',
      p1: 'Blau', p2: 'Rot', cpu: 'Computer',
      yourTurnFlag: 'Du bist dran ✎',
      newGame: 'Neues Spiel', undo: 'Zurück', menu: 'Menü', endGame: 'Spiel beenden', rules: 'Regeln', done: 'Fertig',
      mode: 'Modus', modePvp: '2 Spieler (ein Bildschirm)', modeAi1: 'Gegen Computer — leicht', modeAi2: 'Gegen Computer — schwer',
      size: 'Spielfeld', sizeS: 'Klein', sizeM: 'Mittel', sizeL: 'Groß',
      language: 'Sprache', sound: 'Ton', on: 'An', off: 'Aus', mutedByPlatform: 'von der Website stummgeschaltet',
      statusTurn: '{n} ist dran', statusYou: 'Du bist dran', statusCpu: 'Computer ist dran', thinking: 'Computer denkt nach…',
      gameOver: 'Spielende',
      toastCapture: '{n} umzingelt {k} {dots}!',
      toastTrap: 'Falle! {n} fängt {k} {dots}',
      draw: 'Unentschieden!', wins: '{n} gewinnt! 🎉', cpuWins: 'Der Computer gewinnt', score: 'Ergebnis {a} : {b}',
      viewBoard: 'Spielfeld ansehen', again: 'Nochmal',
      hint: 'Setze Punkte auf die Kreuzungen und umzingle die Punkte deines Gegners!',
      rulesTitle: 'Spielregeln',
      rulesList: [
        'Zwei Spieler setzen abwechselnd Punkte auf die Kreuzungen der Kästchenlinien.',
        'Ziel ist es, die Punkte des Gegners mit einer geschlossenen Kette eigener Punkte zu <b>umzingeln</b>.',
        'Verbunden werden nur benachbarte Punkte — waagerecht, senkrecht oder diagonal.',
        'Umzingelst du gegnerische Punkte, zeichnet das Spiel den Umriss automatisch — sie sind gefangen und zählen als deine Punkte.',
        'Gefangene Punkte dürfen nicht mehr für Umrisse verwendet werden. Das Innere eines geschlossenen Bereichs ist belegt.',
        'Ein Punkt, der in ein geschlossenes „Haus“ des Gegners gesetzt wird, ist sofort gefangen.',
        'Wer mehr Punkte fängt, gewinnt. Das Spiel endet, wenn das Feld voll ist oder du „Spiel beenden“ wählst.',
      ],
      rulesOk: 'Los geht’s!',
      dots: (k) => (k === 1 ? 'Punkt' : 'Punkte'),
    },
    es: {
      docTitle: 'Notebook Dots — el clásico juego de papel',
      title: 'Notebook Dots',
      tagline: 'rodea los puntos de tu rival',
      p1: 'Azul', p2: 'Rojo', cpu: 'CPU',
      yourTurnFlag: 'Tu turno ✎',
      newGame: 'Nueva partida', undo: 'Deshacer', menu: 'Menú', endGame: 'Terminar', rules: 'Reglas', done: 'Listo',
      mode: 'Modo', modePvp: '2 jugadores (misma pantalla)', modeAi1: 'Contra la CPU — fácil', modeAi2: 'Contra la CPU — difícil',
      size: 'Tablero', sizeS: 'Pequeño', sizeM: 'Mediano', sizeL: 'Grande',
      language: 'Idioma', sound: 'Sonido', on: 'Sí', off: 'No', mutedByPlatform: 'silenciado por el sitio',
      statusTurn: 'Turno de {n}', statusYou: 'Tu turno', statusCpu: 'Turno de la CPU', thinking: 'La CPU está pensando…',
      gameOver: 'Fin de la partida',
      toastCapture: '¡{n} rodea {k} {dots}!',
      toastTrap: '¡Trampa! {n} atrapa {k} {dots}',
      draw: '¡Empate!', wins: '¡Gana {n}! 🎉', cpuWins: 'Gana la CPU', score: 'Resultado {a} : {b}',
      viewBoard: 'Ver tablero', again: 'Otra vez',
      hint: '¡Coloca puntos en los cruces de las líneas y rodea los puntos de tu rival!',
      rulesTitle: 'Cómo se juega',
      rulesList: [
        'Dos jugadores colocan puntos por turnos en los cruces de las líneas de la cuadrícula.',
        'El objetivo es <b>rodear</b> los puntos del rival con una cadena cerrada de tus propios puntos.',
        'Solo se unen puntos vecinos: en horizontal, en vertical o en diagonal.',
        'Cuando encierras puntos rivales, el juego dibuja el contorno: quedan atrapados y cuentan como tus puntos.',
        'Los puntos atrapados ya no sirven para formar contornos. El interior de una zona cerrada queda ocupado.',
        'Un punto colocado dentro de una «casa» cerrada del rival queda atrapado al instante.',
        'Gana quien atrape más puntos. La partida termina cuando no quedan sitios libres o al elegir «Terminar».',
      ],
      rulesOk: '¡A jugar!',
      dots: (k) => (k === 1 ? 'punto' : 'puntos'),
    },
  };

  const SUPPORTED = ['en', 'pl', 'de', 'es'];
  const NATIVE = { en: 'English', pl: 'Polski', de: 'Deutsch', es: 'Español' };

  function pickLanguage(...candidates) {
    for (const c of candidates) {
      if (!c) continue;
      const code = String(c).toLowerCase().slice(0, 2);
      if (SUPPORTED.includes(code)) return code;
    }
    return 'en'; // wymóg CrazyGames: domyślnie angielski
  }

  let current = 'en';
  function setLanguage(code) { current = SUPPORTED.includes(code) ? code : 'en'; }
  function t(key, vars) {
    const table = STRINGS[current] || STRINGS.en;
    let s = key in table ? table[key] : STRINGS.en[key];
    if (typeof s === 'string' && vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }
  const dots = (k) => (STRINGS[current] || STRINGS.en).dots(k);

  root.KropkiI18n = { SUPPORTED, NATIVE, pickLanguage, setLanguage, t, dots, get lang() { return current; } };
})(window);
