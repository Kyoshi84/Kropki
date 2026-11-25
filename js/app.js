/* Kropki / Notebook Dots — interfejs, rysowanie, dźwięk */
(() => {
  'use strict';
  const E = window.KropkiEngine;
  const I = window.KropkiI18n;
  const PF = window.KropkiPlatform;
  const t = I.t;
  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const page = $('page');

  // Kolory atramentu do wyboru w menu
  const PALETTE = {
    blue:   { ink: '#1e4fd6', dark: '#13369c', light: '#4c78f0', bg1: '#e3efff', bg2: '#d3e4ff' },
    red:    { ink: '#d8342c', dark: '#9e1f19', light: '#f0605a', bg1: '#ffe7e2', bg2: '#ffd9d2' },
    green:  { ink: '#1f9d48', dark: '#14692f', light: '#4cc472', bg1: '#e2f6e6', bg2: '#d0efd7' },
    purple: { ink: '#7a3fc9', dark: '#522690', light: '#9f6be6', bg1: '#efe5ff', bg2: '#e3d4fb' },
    orange: { ink: '#e47a0f', dark: '#a35406', light: '#f6a04a', bg1: '#fff0dd', bg2: '#ffe3c2' },
    black:  { ink: '#2b2a33', dark: '#121117', light: '#5a5968', bg1: '#ececee', bg2: '#dedee2' },
  };
  const COLOR_KEYS = Object.keys(PALETTE);
  const colors = { 1: 'blue', 2: 'red' };
  const INK = {}, INK_DARK = {}, INK_LIGHT = {}, FILL = {}, HATCH = {};
  const AI = 2;

  // Samouczek: plansza 9×9, kropka komputera w środku, gracz otacza ją w 4 ruchach
  const TUT = { W: 9, H: 9, cpuDot: [4, 4], targets: [[4, 3], [5, 4], [4, 5], [3, 4]], cpuMoves: [[1, 1], [7, 7], [1, 7]] };
  let tut = null;
  let aiToken = 0; // unieważnia zaplanowane ruchy komputera po rozpoczęciu nowej partii

  let state = null;
  let history = [];
  let mode = 'ai2';
  let busy = false;
  let over = false;
  let hover = -1;
  let soundOn = true;
  const customName = { 1: false, 2: false };
  const view = { cell: 30, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };
  const dotAnims = new Map();
  let floaters = [];

  // ---------- zapisywanie ustawień i bilansu (przez platformę) ----------
  let saved = {};
  const stats = { wins: 0, losses: 0, draws: 0 };
  let paused = false;      // pauza zgłoszona przez platformę (reklama, zmiana karty)
  let hintCell = -1, hintUntil = 0, hintBusy = false;

  // ---------- kolory graczy ----------
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function applyColors() {
    const root = document.documentElement.style;
    [1, 2].forEach((p) => {
      const c = PALETTE[colors[p]];
      INK[p] = c.ink; INK_DARK[p] = c.dark; INK_LIGHT[p] = c.light;
      FILL[p] = rgba(c.ink, 0.15); HATCH[p] = rgba(c.ink, 0.10);
      root.setProperty(`--c${p}`, c.ink);
      root.setProperty(`--c${p}-bg1`, c.bg1);
      root.setProperty(`--c${p}-bg2`, c.bg2);
    });
  }
  function renderSwatches() {
    [1, 2].forEach((p) => {
      const box = $('sw' + p);
      box.innerHTML = '';
      COLOR_KEYS.forEach((k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'swatch' + (colors[p] === k ? ' selected' : '');
        b.style.background = PALETTE[k].ink;
        b.title = t('col_' + k);
        b.setAttribute('aria-label', t('col_' + k));
        b.setAttribute('aria-pressed', colors[p] === k ? 'true' : 'false');
        b.addEventListener('click', () => setColor(p, k));
        box.appendChild(b);
      });
    });
    const ai = isAiGame() || tut;
    $('colorLabel1').textContent = ai ? t('colorYou') : t('color1');
    $('colorLabel2').textContent = ai ? t('colorCpu') : t('color2');
  }
  function setColor(p, k) {
    if (colors[p] === k) return;
    if (colors[3 - p] === k) colors[3 - p] = colors[p]; // ten sam kolor — zamień się z rywalem
    colors[p] = k;
    PF.save({ color1: colors[1], color2: colors[2] });
    applyColors();
    applyLanguage();
  }
  function updateStarterLabels() {
    const opts = $('starter').options;
    const ai = isAiGame();
    opts[0].textContent = ai ? t('you') : nameOf(1);
    opts[1].textContent = ai ? t('cpu') : nameOf(2);
  }

  // ---------- pomocnicze ----------
  const nameOf = (p) => ($('name' + p).value.trim() || defaultName(p));
  const defaultName = (p) => ((p === 2 && (mode !== 'pvp' || tut)) ? t('cpu') : t('col_' + colors[p]));
  const isAiGame = () => mode !== 'pvp';
  const px = (x) => view.ox + x * view.cell;
  const py = (y) => view.oy + y * view.cell;
  const easeOutBack = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  function hash(a, b, c, d) {
    let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791) ^ (d * 2654435761);
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  // ---------- dźwięk (Web Audio, bez plików) ----------
  let actx = null;
  const audible = () => soundOn && !PF.muted && !paused;
  function audio() {
    if (!audible()) return null;
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    return actx;
  }
  // Wznowienie AudioContext zawsze w geście użytkownika (wymóg iOS / CrazyGames)
  function resumeAudio() { if (actx && actx.state !== 'running') actx.resume().catch(() => {}); }
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) => window.addEventListener(ev, resumeAudio, { passive: true }));

  function tone(freq, start, dur, type, vol, slideTo) {
    const a = audio(); if (!a) return;
    if (a.state !== 'running') a.resume().catch(() => {});
    const o = a.createOscillator(), g = a.createGain(), now = a.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, now + start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + start + dur);
    g.gain.setValueAtTime(0.0001, now + start);
    g.gain.exponentialRampToValueAtTime(vol, now + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    o.connect(g).connect(a.destination);
    o.start(now + start); o.stop(now + start + dur + 0.02);
  }
  const sfx = {
    place(p) { tone(p === 1 ? 520 : 440, 0, 0.12, 'sine', 0.18, p === 1 ? 300 : 260); },
    capture() { [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.07, 0.22, 'triangle', 0.13)); },
    trapped() { [392, 311, 233].forEach((f, k) => tone(f, k * 0.09, 0.2, 'sawtooth', 0.05)); },
    win() { [523, 659, 784, 659, 1047].forEach((f, k) => tone(f, k * 0.12, 0.3, 'triangle', 0.12)); },
  };

  // ---------- język ----------
  function applyLanguage() {
    document.documentElement.lang = I.lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-size]').forEach((el) => {
      el.textContent = `${t(el.dataset.i18nSize)} (${el.value.replace('x', ' × ')})`;
    });
    $('rulesList').innerHTML = t('rulesList').map((li) => `<li>${li}</li>`).join('');
    $('undo').setAttribute('aria-label', t('undo'));
    $('menuBtn').setAttribute('aria-label', t('menu'));
    canvas.setAttribute('aria-label', t('title'));
    [1, 2].forEach((p) => {
      $('name' + p).setAttribute('aria-label', p === 1 ? t('p1') : t('p2'));
      if (!customName[p]) $('name' + p).value = defaultName(p);
    });
    updateSoundBtn();
    renderSwatches();
    updateStarterLabels();
    if (tut && !over) showCoach();
    updateUI();
  }
  function updateSoundBtn() {
    const b = $('soundBtn');
    if (PF.muted) { b.textContent = '🔇 ' + t('mutedByPlatform'); b.disabled = true; return; }
    b.disabled = false;
    b.textContent = soundOn ? '🔊 ' + t('on') : '🔇 ' + t('off');
  }

  // ---------- gra ----------
  function newGame() {
    mode = $('mode').value;
    let [W, H] = $('size').value.split('x').map(Number);
    const r = canvas.getBoundingClientRect();
    if (r.width < r.height * 0.9) [W, H] = [H, W]; // ekran pionowy – obróć kartkę
    state = E.createState(W, H);
    const st = $('starter').value;
    state.turn = st === 'random' ? (Math.random() < 0.5 ? 1 : 2) : (st === 'p2' ? 2 : 1);
    endTutorialUI();
    aiToken++;
    history = [];
    over = false; busy = false; hover = -1;
    dotAnims.clear(); floaters = [];
    [1, 2].forEach((p) => { if (!customName[p]) $('name' + p).value = defaultName(p); });
    hintCell = -1;
    $('hint').classList.remove('hidden');
    layout();
    updateUI();
    PF.levelStarted();
    if (!anyDialogOpen()) PF.gameplayStart();
    if (isAiGame() && state.turn === AI) scheduleAi(); // komputer zaczyna
  }

  // ---------- samouczek ----------
  const tutIndex = ([x, y]) => y * state.W + x;
  function startTutorial() {
    document.querySelectorAll('dialog').forEach((d) => { if (d.open) d.close(); });
    state = E.createState(TUT.W, TUT.H);
    state.owner[tutIndex(TUT.cpuDot)] = AI; // kropka komputera, którą gracz otoczy
    state.turn = 1;
    tut = { step: 0 };
    aiToken++;
    history = [];
    over = false; busy = false; hover = -1; hintCell = -1;
    dotAnims.clear(); floaters = [];
    dotAnims.set(tutIndex(TUT.cpuDot), performance.now());
    [1, 2].forEach((p) => { if (!customName[p]) $('name' + p).value = defaultName(p); });
    $('hint').classList.add('hidden');
    layout();
    showCoach();
    renderSwatches();
    updateUI();
    PF.levelStarted();
    PF.gameplayStart();
  }
  function endTutorialUI() {
    if (!tut) return;
    tut = null;
    $('coach').hidden = true;
    layout();
  }
  function setCoach(text, step) {
    const c = $('coach');
    c.hidden = false;
    $('coachStep').textContent = step != null ? t('tutStep', { k: step + 1 }) : '';
    $('coachText').textContent = text;
    layout();
  }
  function showCoach() { setCoach(t('tut' + (tut.step + 1)), tut.step); }
  function nudgeCoach() {
    const c = $('coach');
    c.classList.remove('nudge'); void c.offsetWidth; c.classList.add('nudge');
    toast(t('tutWrong'), 1);
  }
  function tutorialPlay(i) {
    if (state.turn !== 1 || tut.done) return;
    if (i !== tutIndex(TUT.targets[tut.step])) { nudgeCoach(); return; }
    doMove(i);
    if (tut.step === TUT.targets.length - 1) { // ostatnia kropka zamyka pętlę
      tut.done = true;
      busy = true; updateUI();
      const tok = aiToken;
      setTimeout(() => { if (tok === aiToken) finishTutorial(); }, 1400);
      return;
    }
    busy = true;
    setCoach(t('tutCpu'));
    updateUI();
    const tok = aiToken;
    const cpuTurn = () => {
      if (tok !== aiToken || !tut || !state) return;
      if (paused) { setTimeout(cpuTurn, 250); return; }
      doMove(tutIndex(TUT.cpuMoves[tut.step])); // komputer gra daleko i daje się otoczyć
      tut.step++;
      busy = false;
      showCoach();
      updateUI();
    };
    setTimeout(cpuTurn, 750);
  }
  function finishTutorial() {
    if (!tut) return;
    busy = false;
    over = true;
    $('coach').hidden = true;
    PF.gameplayStop();
    PF.levelCompleted();
    PF.save({ seenTutorial: '1' });
    sfx.win();
    updateUI();
    openDialog('tutDone');
    PF.interstitial('tutorial_done'); // koniec samouczka — naturalna przerwa
  }

  // Nowa partia na żądanie gracza = naturalna przerwa: najpierw reklama (Bridge decyduje, czy ją pokazać)
  function newGameWithBreak() {
    PF.interstitial('new_game');
    newGame();
  }

  function tryPlay(i) {
    if (busy || over || paused || !state || !E.isLegal(state, i)) return;
    if (tut) { tutorialPlay(i); return; }
    if (isAiGame() && state.turn === AI) return;
    doMove(i);
    if (!over && isAiGame() && state.turn === AI) scheduleAi();
  }

  function scheduleAi() {
    busy = true; updateUI();
    const tok = ++aiToken;
    const aiTurn = () => {
      if (tok !== aiToken) return; // w międzyczasie zaczęła się nowa partia
      if (!state || over || tut) { busy = false; updateUI(); return; }
      if (paused) { setTimeout(aiTurn, 250); return; }
      if (!isAiGame() || state.turn !== AI) { busy = false; updateUI(); return; }
      const c = E.aiMove(state, AI, mode === 'ai2' ? 2 : 1);
      if (c >= 0) doMove(c);
      busy = false; updateUI();
    };
    setTimeout(aiTurn, 380 + Math.random() * 300);
  }

  function doMove(i) {
    history.push(E.cloneState(state));
    hintCell = -1;
    const P = state.turn;
    const before = state.captures.length;
    const res = E.applyMove(state, i, P, true);
    const now = performance.now();
    dotAnims.set(i, now);
    $('hint').classList.add('hidden');
    for (let k = before; k < state.captures.length; k++) {
      const c = state.captures[k];
      c.t = now + 120;
      floaters.push({ x: c.cx, y: c.cy, text: '+' + c.n, p: c.p, t: now + 250 });
    }
    sfx.place(P);
    if (res.gained > 0) {
      setTimeout(() => sfx.capture(), 120);
      toast(t('toastCapture', { n: nameOf(P), k: res.gained, dots: I.dots(res.gained) }), P);
      bump(P);
    } else if (res.lost > 0) {
      setTimeout(() => sfx.trapped(), 120);
      toast(t('toastTrap', { n: nameOf(3 - P), k: res.lost, dots: I.dots(res.lost) }), 3 - P);
      bump(3 - P);
    }
    updateUI();
    if (!E.hasLegalMove(state)) setTimeout(finish, 900);
  }

  function undo() {
    if (busy || tut || history.length === 0) return;
    state = history.pop();
    hintCell = -1;
    while (isAiGame() && state.turn === AI && history.length) state = history.pop();
    if (over) { over = false; PF.gameplayStart(); }
    updateUI();
    if (isAiGame() && state.turn === AI) scheduleAi();
  }

  function finish() {
    if (over || !state) return;
    over = true;
    PF.gameplayStop();
    const s1 = E.score(state, 1), s2 = E.score(state, 2);
    let title, result = 'draw';
    if (s1 === s2) title = t('draw');
    else {
      const w = s1 > s2 ? 1 : 2;
      if (isAiGame() && w === AI) { title = t('cpuWins'); result = 'loss'; }
      else {
        title = t('wins', { n: nameOf(w) });
        result = 'win';
        sfx.win();
        if (mode === 'ai2') PF.happytime(); // rzadkie osiągnięcie: pokonanie trudnego komputera
      }
    }
    if (result === 'loss') PF.levelFailed(); else PF.levelCompleted();
    let text = t('score', { a: s1, b: s2 });
    if (isAiGame()) {
      if (result === 'win') stats.wins++; else if (result === 'loss') stats.losses++; else stats.draws++;
      PF.save({ wins: stats.wins, losses: stats.losses, draws: stats.draws });
      text += ' · ' + t('record', { w: stats.wins, l: stats.losses });
    }
    $('overTitle').textContent = title;
    $('overText').textContent = text;
    updateUI();
    openDialog('over');
    PF.interstitial('game_over'); // koniec partii — naturalna przerwa
  }

  // ---------- podpowiedź za reklamę z nagrodą ----------
  function askHint() {
    if (hintBusy || busy || over || paused || !state) return;
    if (isAiGame() && state.turn === AI) return;
    hintBusy = true; updateUI();
    PF.gameplayStop();
    PF.rewarded('hint', () => {
      hintBusy = false;
      if (!state || over) { updateUI(); return; }
      const c = E.aiMove(state, state.turn, 2);
      if (c >= 0) { hintCell = c; hintUntil = performance.now() + 6000; }
      PF.gameplayStart();
      updateUI();
    }, () => {
      hintBusy = false;
      toast(t('adUnavailable'), state ? state.turn : 1);
      if (!anyDialogOpen()) PF.gameplayStart();
      updateUI();
    });
  }

  // ---------- okna dialogowe + zdarzenia gameplay start/stop ----------
  const anyDialogOpen = () => [...document.querySelectorAll('dialog')].some((d) => d.open);
  function openDialog(id) {
    PF.gameplayStop();
    const d = $(id);
    if (!d.open) d.showModal();
  }
  function closeDialog(id) {
    const d = $(id);
    if (d.open) d.close();
  }
  document.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('close', () => {
      if (!anyDialogOpen() && !over && state) PF.gameplayStart();
    });
    // klik w tło zamyka okno (poza oknem końca gry)
    d.addEventListener('click', (e) => { if (e.target === d && d.id !== 'over') d.close(); });
  });

  // ---------- UI ----------
  let toastTimer = 0;
  function toast(msg, p) {
    const el = $('toast');
    el.textContent = msg;
    el.style.color = INK_DARK[p];
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }
  function bump(p) {
    const el = $('score' + p);
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
  function updateUI() {
    if (!state) return;
    $('score1').textContent = E.score(state, 1);
    $('score2').textContent = E.score(state, 2);
    $('card1').classList.toggle('active', !over && state.turn === 1);
    $('card2').classList.toggle('active', !over && state.turn === 2);
    const onlyAiOpening = isAiGame() && history.length === 1 && history[0].turn === AI;
    $('undo').disabled = history.length === 0 || busy || !!tut || onlyAiOpening;
    $('hintBtn').hidden = !PF.rewardedSupported;
    $('hintBtn').disabled = over || busy || hintBusy || !!tut || (isAiGame() && state.turn === AI);
    $('endGame').disabled = over;
    let st;
    if (tut && !over) st = t('tutorial');
    else if (over) st = t('gameOver');
    else if (busy) st = t('thinking');
    else if (isAiGame()) st = state.turn === 1 ? t('statusYou') : t('statusCpu');
    else st = t('statusTurn', { n: nameOf(state.turn) });
    $('status').textContent = st;
  }

  // ---------- rysowanie ----------
  function layout() {
    const r = canvas.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = r.width; view.h = r.height;
    canvas.width = Math.max(1, Math.round(r.width * view.dpr));
    canvas.height = Math.max(1, Math.round(r.height * view.dpr));
    if (!state) return;
    const m = Math.max(14, Math.min(r.width, r.height) * 0.04);
    // w samouczku notatka z instrukcją dostaje własne miejsce pod planszą
    const coach = $('coach');
    const reserve = tut && !coach.hidden ? coach.offsetHeight + 18 : 0;
    const usableH = r.height - reserve;
    view.cell = Math.min((r.width - 2 * m) / (state.W - 1), (usableH - 2 * m) / (state.H - 1));
    view.ox = (r.width - (state.W - 1) * view.cell) / 2;
    view.oy = (usableH - (state.H - 1) * view.cell) / 2;
  }

  function wobblyLine(x1, y1, x2, y2, seed, prog) {
    const X1 = px(x1), Y1 = py(y1);
    let X2 = px(x2), Y2 = py(y2);
    const dx = X2 - X1, dy = Y2 - Y1;
    const off = (seed - 0.5) * view.cell * 0.16;
    const len = Math.hypot(dx, dy) || 1;
    const cx = X1 + dx / 2 - (dy / len) * off, cy = Y1 + dy / 2 + (dx / len) * off;
    ctx.moveTo(X1, Y1);
    if (prog < 1) { // częściowe rysowanie krzywej (animacja kreślenia)
      const qx = X1 + (cx - X1) * prog, qy = Y1 + (cy - Y1) * prog;
      const rx = cx + (X2 - cx) * prog, ry = cy + (Y2 - cy) * prog;
      ctx.quadraticCurveTo(qx, qy, qx + (rx - qx) * prog, qy + (ry - qy) * prog);
      return;
    }
    ctx.quadraticCurveTo(cx, cy, X2, Y2);
  }

  function drawPaper() {
    const { w, h, cell, ox, oy } = view;
    ctx.fillStyle = '#fdfbf3';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(160,140,100,0.035)';
    for (let k = 0; k < 140; k++) ctx.fillRect(hash(k, 7, 3, 1) * w, hash(k, 11, 5, 2) * h, 1 + hash(k, 1, 1, 1) * 2, 1);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(80,140,205,0.30)';
    ctx.beginPath();
    let sx = ox % cell; if (sx < 0) sx += cell;
    for (let x = sx; x <= w; x += cell) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); }
    let sy = oy % cell; if (sy < 0) sy += cell;
    for (let y = sy; y <= h; y += cell) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); }
    ctx.stroke();
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(70,70,80,0.28)';
    ctx.lineWidth = 1.5;
    const pad = cell * 0.5;
    ctx.strokeRect(ox - pad, oy - pad, (state.W - 1) * cell + 2 * pad, (state.H - 1) * cell + 2 * pad);
    ctx.restore();
  }

  function drawCaptures(now) {
    for (const c of state.captures) {
      const p = c.t ? clamp01((now - c.t) / 650) : 1;
      if (p <= 0) continue;
      ctx.globalAlpha = p;
      ctx.fillStyle = FILL[c.p];
      ctx.beginPath();
      for (const poly of c.polys) {
        ctx.moveTo(px(poly[0]), py(poly[1]));
        for (let k = 2; k < poly.length; k += 2) ctx.lineTo(px(poly[k]), py(poly[k + 1]));
        ctx.closePath();
      }
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = HATCH[c.p];
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const step = Math.max(5, view.cell * 0.28);
      for (let d = -view.h; d < view.w + view.h; d += step) { ctx.moveTo(d, 0); ctx.lineTo(d - view.h, view.h); }
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = INK[c.p];
      ctx.lineWidth = Math.max(2, view.cell * 0.085);
      ctx.lineCap = 'round';
      ctx.beginPath();
      const e = easeOutCubic(p);
      for (let k = 0; k < c.edges.length; k += 4) {
        const a = c.edges[k], b = c.edges[k + 1], d = c.edges[k + 2], f = c.edges[k + 3];
        wobblyLine(a, b, d, f, hash(a, b, d, f), e);
      }
      ctx.stroke();
    }
  }

  function inkDot(x, y, r, p, alpha) {
    if (r <= 0) return;
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, INK_LIGHT[p]);
    g.addColorStop(0.7, INK[p]);
    g.addColorStop(1, INK_DARK[p]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawDots(now) {
    const { W } = state;
    const r0 = Math.max(4.5, Math.min(11, view.cell * 0.22));
    for (let i = 0; i < state.owner.length; i++) {
      const o = state.owner[i];
      if (!o) continue;
      const x = px(i % W), y = py((i / W) | 0);
      let s = 1;
      const st = dotAnims.get(i);
      if (st != null) { const k = clamp01((now - st) / 280); s = easeOutBack(k); if (k >= 1) dotAnims.delete(i); }
      const captured = state.cap[i] !== 0;
      inkDot(x, y, r0 * s, o, captured ? 0.4 : 1);
      if (captured) {
        ctx.strokeStyle = INK_DARK[state.cap[i]];
        ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - r0 * 0.8, y - r0 * 0.8); ctx.lineTo(x + r0 * 0.8, y + r0 * 0.8);
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    if (state.last >= 0 && !over) {
      const i = state.last, x = px(i % W), y = py((i / W) | 0);
      const pulse = 0.5 + 0.5 * Math.sin(now / 260);
      ctx.strokeStyle = INK[state.owner[i]];
      ctx.globalAlpha = 0.25 + 0.25 * pulse;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r0 * (1.7 + 0.3 * pulse), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (tut && !over && !busy && state.turn === 1) drawTutorialArrow(tutIndex(TUT.targets[tut.step]), r0, now);
    if (hintCell >= 0 && !over && now < hintUntil && state.owner[hintCell] === 0) {
      const x = px(hintCell % W), y = py((hintCell / W) | 0);
      const pulse = 0.5 + 0.5 * Math.sin(now / 160);
      ctx.strokeStyle = '#1f9d55';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.55 + 0.4 * pulse;
      ctx.beginPath(); ctx.arc(x, y, r0 * (1.4 + 0.5 * pulse), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      inkDot(x, y, r0 * 0.8, state.turn, 0.3);
    }
    if (hover >= 0 && !over && !busy && E.isLegal(state, hover) && !(isAiGame() && state.turn === AI)) {
      inkDot(px(hover % W), py((hover / W) | 0), r0, state.turn, 0.35);
    }
  }

  // Odręczna strzałka wskazująca miejsce na kolejną kropkę
  function drawTutorialArrow(i, r0, now) {
    const W = state.W, x = px(i % W), y = py((i / W) | 0);
    const pulse = 0.5 + 0.5 * Math.sin(now / 200);
    ctx.strokeStyle = INK[1];
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.45 + 0.4 * pulse;
    ctx.beginPath(); ctx.arc(x, y, r0 * (1.5 + 0.5 * pulse), 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    inkDot(x, y, r0, 1, 0.25 + 0.2 * pulse);
    // strzałka z góry (albo z dołu, gdy punkt jest przy górnej krawędzi)
    const dir = ((i / W) | 0) < 2 ? 1 : -1;
    const bob = Math.sin(now / 240) * view.cell * 0.15;
    const tipY = y + dir * (r0 * 2.3 + bob);
    const len = Math.max(30, view.cell * 1.4);
    const tailY = tipY + dir * len;
    const head = Math.max(9, view.cell * 0.32);
    ctx.strokeStyle = '#2b2a33';
    ctx.lineWidth = Math.max(3, view.cell * 0.09);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + len * 0.12, tailY);
    ctx.quadraticCurveTo(x - len * 0.08, (tipY + tailY) / 2, x, tipY);
    ctx.moveTo(x - head * 0.8, tipY + dir * head);
    ctx.lineTo(x, tipY);
    ctx.lineTo(x + head * 0.8, tipY + dir * head);
    ctx.stroke();
  }

  function drawFloaters(now) {
    floaters = floaters.filter((f) => now - f.t < 1300);
    for (const f of floaters) {
      if (now < f.t) continue;
      const k = clamp01((now - f.t) / 1300);
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = INK_DARK[f.p];
      ctx.font = `700 ${Math.max(22, view.cell * 1.1)}px Caveat, 'Patrick Hand', cursive`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f.text, px(f.x), py(f.y) - k * view.cell * 1.6);
      ctx.globalAlpha = 1;
    }
  }

  function frame(now) {
    if (state && view.w > 0) {
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      drawPaper();
      drawCaptures(now);
      drawDots(now);
      drawFloaters(now);
    }
    requestAnimationFrame(frame);
  }

  // ---------- wejście ----------
  function pickPoint(ev) {
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left - view.ox) / view.cell;
    const y = (ev.clientY - r.top - view.oy) / view.cell;
    const gx = Math.round(x), gy = Math.round(y);
    if (gx < 0 || gy < 0 || gx >= state.W || gy >= state.H) return -1;
    if (Math.hypot(x - gx, y - gy) > 0.5) return -1;
    return gy * state.W + gx;
  }
  canvas.addEventListener('pointermove', (e) => { if (state && e.pointerType === 'mouse') hover = pickPoint(e); });
  canvas.addEventListener('pointerleave', () => { hover = -1; });
  canvas.addEventListener('pointerup', (e) => {
    if (!state) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const i = pickPoint(e);
    if (i >= 0) tryPlay(i);
  });
  document.addEventListener('contextmenu', (e) => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });

  $('newGame').addEventListener('click', newGameWithBreak);
  $('hintBtn').addEventListener('click', askHint);
  $('undo').addEventListener('click', undo);
  $('menuBtn').addEventListener('click', () => { openDialog('menu'); PF.interstitial('menu'); });
  $('menuClose').addEventListener('click', () => closeDialog('menu'));
  $('rulesBtn').addEventListener('click', () => { closeDialog('menu'); openDialog('rules'); });
  $('rulesClose').addEventListener('click', () => closeDialog('rules'));
  $('endGame').addEventListener('click', () => {
    closeDialog('menu');
    if (tut) { newGame(); return; }
    if (!over && !busy) finish();
  });
  $('tutorialBtn').addEventListener('click', startTutorial);
  $('rulesTutorial').addEventListener('click', startTutorial);
  $('tutPlay').addEventListener('click', () => {
    if ($('mode').value === 'pvp') $('mode').value = 'ai1';
    mode = $('mode').value;
    closeDialog('tutDone');
    newGame();
  });
  $('starter').addEventListener('change', () => { PF.save({ starter: $('starter').value }); if (!tut) newGame(); });
  $('overView').addEventListener('click', () => closeDialog('over'));
  $('overAgain').addEventListener('click', () => { closeDialog('over'); newGame(); });
  $('rules').addEventListener('close', () => {
    if (saved.seenRules !== '1') { saved.seenRules = '1'; PF.save({ seenRules: '1' }); }
  });
  $('soundBtn').addEventListener('click', () => {
    soundOn = !soundOn;
    PF.save({ sound: soundOn ? '1' : '0' });
    updateSoundBtn();
  });
  $('mode').addEventListener('change', () => { PF.save({ mode: $('mode').value }); mode = $('mode').value; applyLanguage(); newGame(); });
  $('size').addEventListener('change', () => { PF.save({ size: $('size').value }); newGame(); });
  $('lang').addEventListener('change', () => {
    I.setLanguage($('lang').value);
    PF.save({ lang: I.lang });
    applyLanguage();
  });
  [1, 2].forEach((p) => {
    const el = $('name' + p);
    el.addEventListener('input', () => { customName[p] = el.value.trim() !== ''; updateUI(); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
  });
  PF.onSettings = () => { updateSoundBtn(); syncAudio(); };
  PF.onPause = (p) => { paused = p; syncAudio(); updateUI(); };
  function syncAudio() {
    if (!actx) return;
    if (audible()) actx.resume().catch(() => {}); else actx.suspend().catch(() => {});
  }

  new ResizeObserver(() => layout()).observe(canvas);
  window.__kropki = { view, get state() { return state; } }; // do debugowania w konsoli

  // ---------- start ----------
  async function boot() {
    await PF.init();
    paused = !!PF.paused;
    saved = await PF.load();
    stats.wins = +saved.wins || 0; stats.losses = +saved.losses || 0; stats.draws = +saved.draws || 0;
    const store = { get: (k) => saved[k] };
    // język: zapisany wybór gracza > język platformy (wymóg platformy) > angielski (domyślny)
    I.setLanguage(I.pickLanguage(store.get('lang'), PF.locale));
    $('lang').innerHTML = I.SUPPORTED.map((c) => `<option value="${c}">${I.NATIVE[c]}</option>`).join('');
    $('lang').value = I.lang;
    const m = store.get('mode'); if (m && $('mode').querySelector(`option[value="${m}"]`)) $('mode').value = m; else $('mode').value = 'ai2';
    const s = store.get('size'); if (s && $('size').querySelector(`option[value="${s}"]`)) $('size').value = s; else $('size').value = '16x12'; // mała kartka: partia ok. 5 minut
    soundOn = store.get('sound') !== '0';
    const c1 = store.get('color1'), c2 = store.get('color2');
    if (PALETTE[c1] && PALETTE[c2] && c1 !== c2) { colors[1] = c1; colors[2] = c2; }
    applyColors();
    const st = store.get('starter');
    $('starter').value = ['p1', 'p2', 'random'].includes(st) ? st : 'p1';
    mode = $('mode').value;
    applyLanguage();
    newGame();
    requestAnimationFrame(frame);
    PF.gameReady();
    if (saved.seenRules !== '1') openDialog('rules'); // pierwsze uruchomienie: krótkie zasady
  }
  boot();
})();
