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

  const INK = { 1: '#1e4fd6', 2: '#d8342c' };
  const INK_DARK = { 1: '#13369c', 2: '#9e1f19' };
  const INK_LIGHT = { 1: '#4c78f0', 2: '#f0605a' };
  const FILL = { 1: 'rgba(30,79,214,0.15)', 2: 'rgba(216,52,44,0.14)' };
  const HATCH = { 1: 'rgba(30,79,214,0.10)', 2: 'rgba(216,52,44,0.10)' };
  const AI = 2;

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

  // ---------- zapisywanie ustawień (opcjonalne) ----------
  const store = {
    get(k) { try { return localStorage.getItem('kropki.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('kropki.' + k, v); } catch (e) { /* brak dostępu */ } },
  };

  // ---------- pomocnicze ----------
  const nameOf = (p) => ($('name' + p).value.trim() || defaultName(p));
  const defaultName = (p) => (p === 1 ? t('p1') : (mode !== 'pvp' ? t('cpu') : t('p2')));
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
  const audible = () => soundOn && !PF.muted;
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
    history = [];
    over = false; busy = false; hover = -1;
    dotAnims.clear(); floaters = [];
    [1, 2].forEach((p) => { if (!customName[p]) $('name' + p).value = defaultName(p); });
    $('hint').classList.remove('hidden');
    layout();
    updateUI();
    if (!anyDialogOpen()) PF.gameplayStart();
  }

  function tryPlay(i) {
    if (busy || over || !state || !E.isLegal(state, i)) return;
    if (isAiGame() && state.turn === AI) return;
    doMove(i);
    if (!over && isAiGame() && state.turn === AI) {
      busy = true; updateUI();
      setTimeout(() => {
        if (!state || over) { busy = false; return; }
        const c = E.aiMove(state, AI, mode === 'ai2' ? 2 : 1);
        if (c >= 0) doMove(c);
        busy = false; updateUI();
      }, 380 + Math.random() * 300);
    }
  }

  function doMove(i) {
    history.push(E.cloneState(state));
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
    if (busy || history.length === 0) return;
    state = history.pop();
    while (isAiGame() && state.turn === AI && history.length) state = history.pop();
    if (over) { over = false; PF.gameplayStart(); }
    updateUI();
  }

  function finish() {
    if (over || !state) return;
    over = true;
    PF.gameplayStop();
    const s1 = E.score(state, 1), s2 = E.score(state, 2);
    let title;
    if (s1 === s2) title = t('draw');
    else {
      const w = s1 > s2 ? 1 : 2;
      if (isAiGame() && w === AI) title = t('cpuWins');
      else {
        title = t('wins', { n: nameOf(w) });
        sfx.win();
        if (mode === 'ai2') PF.happytime(); // rzadkie osiągnięcie: pokonanie trudnego komputera
      }
    }
    $('overTitle').textContent = title;
    $('overText').textContent = t('score', { a: s1, b: s2 });
    updateUI();
    openDialog('over');
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
    $('undo').disabled = history.length === 0 || busy;
    $('endGame').disabled = over;
    let st;
    if (over) st = t('gameOver');
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
    view.cell = Math.min((r.width - 2 * m) / (state.W - 1), (r.height - 2 * m) / (state.H - 1));
    view.ox = (r.width - (state.W - 1) * view.cell) / 2;
    view.oy = (r.height - (state.H - 1) * view.cell) / 2;
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
    if (hover >= 0 && !over && !busy && E.isLegal(state, hover) && !(isAiGame() && state.turn === AI)) {
      inkDot(px(hover % W), py((hover / W) | 0), r0, state.turn, 0.35);
    }
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

  $('newGame').addEventListener('click', newGame);
  $('undo').addEventListener('click', undo);
  $('menuBtn').addEventListener('click', () => openDialog('menu'));
  $('menuClose').addEventListener('click', () => closeDialog('menu'));
  $('rulesBtn').addEventListener('click', () => { closeDialog('menu'); openDialog('rules'); });
  $('rulesClose').addEventListener('click', () => closeDialog('rules'));
  $('endGame').addEventListener('click', () => { closeDialog('menu'); if (!over && !busy) finish(); });
  $('overView').addEventListener('click', () => closeDialog('over'));
  $('overAgain').addEventListener('click', () => { closeDialog('over'); newGame(); });
  $('soundBtn').addEventListener('click', () => {
    soundOn = !soundOn;
    store.set('sound', soundOn ? '1' : '0');
    updateSoundBtn();
  });
  $('mode').addEventListener('change', () => { store.set('mode', $('mode').value); newGame(); });
  $('size').addEventListener('change', () => { store.set('size', $('size').value); newGame(); });
  $('lang').addEventListener('change', () => {
    I.setLanguage($('lang').value);
    store.set('lang', I.lang);
    applyLanguage();
  });
  [1, 2].forEach((p) => {
    const el = $('name' + p);
    el.addEventListener('input', () => { customName[p] = el.value.trim() !== ''; updateUI(); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
  });
  PF.onSettings = () => updateSoundBtn();

  new ResizeObserver(() => layout()).observe(canvas);
  window.__kropki = { view, get state() { return state; } }; // do debugowania w konsoli

  // ---------- start ----------
  async function boot() {
    await PF.init();
    // język: zapisany wybór > ustawienie CrazyGames > przeglądarka > angielski
    I.setLanguage(I.pickLanguage(store.get('lang'), PF.locale, navigator.language));
    $('lang').innerHTML = I.SUPPORTED.map((c) => `<option value="${c}">${I.NATIVE[c]}</option>`).join('');
    $('lang').value = I.lang;
    const m = store.get('mode'); if (m && $('mode').querySelector(`option[value="${m}"]`)) $('mode').value = m; else $('mode').value = 'ai2';
    const s = store.get('size'); if (s && $('size').querySelector(`option[value="${s}"]`)) $('size').value = s; else $('size').value = '24x18';
    soundOn = store.get('sound') !== '0';
    mode = $('mode').value;
    applyLanguage();
    newGame();
    requestAnimationFrame(frame);
  }
  boot();
})();
