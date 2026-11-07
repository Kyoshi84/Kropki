/* Kropki — interfejs, rysowanie i dźwięk */
(() => {
  'use strict';
  const E = window.KropkiEngine;
  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const page = $('page');

  const INK = { 1: '#1e4fd6', 2: '#d8342c' };
  const INK_DARK = { 1: '#13369c', 2: '#9e1f19' };
  const FILL = { 1: 'rgba(30,79,214,0.15)', 2: 'rgba(216,52,44,0.14)' };
  const AI = 2;

  let state = null;
  let history = [];
  let mode = 'ai2';
  let busy = false;
  let over = false;
  let hover = -1;
  let soundOn = true;
  const view = { cell: 30, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };
  const dotAnims = new Map();
  let floaters = [];

  // ---------- pomocnicze ----------
  const nameOf = (p) => ($('name' + p).value.trim() || (p === 1 ? 'Niebieski' : 'Czerwony'));
  const px = (x) => view.ox + x * view.cell;
  const py = (y) => view.oy + y * view.cell;
  const easeOutBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  function hash(a, b, c, d) {
    let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791) ^ (d * 2654435761);
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function plural(n) {
    if (n === 1) return 'kropkę';
    const d = n % 10, t = n % 100;
    return (d >= 2 && d <= 4 && (t < 12 || t > 14)) ? 'kropki' : 'kropek';
  }

  // ---------- dźwięk (WebAudio, bez plików) ----------
  let actx = null;
  function audio() {
    if (!soundOn) return null;
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, start, dur, type, vol, slideTo) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + start + dur);
    g.gain.setValueAtTime(0.0001, a.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol, a.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
    o.connect(g).connect(a.destination);
    o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + 0.02);
  }
  const sfx = {
    place(p) { tone(p === 1 ? 520 : 440, 0, 0.12, 'sine', 0.18, p === 1 ? 300 : 260); },
    capture() { [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.07, 0.22, 'triangle', 0.13)); },
    trapped() { [392, 311, 233].forEach((f, k) => tone(f, k * 0.09, 0.2, 'sawtooth', 0.06)); },
    win() { [523, 659, 784, 659, 1047].forEach((f, k) => tone(f, k * 0.12, 0.3, 'triangle', 0.12)); },
  };

  // ---------- gra ----------
  function newGame() {
    mode = $('mode').value;
    let [W, H] = $('size').value.split('x').map(Number);
    const r = page.getBoundingClientRect();
    if (r.width < r.height * 0.9) [W, H] = [H, W]; // ekran pionowy – obróć kartkę
    state = E.createState(W, H);
    history = [];
    over = false; busy = false; hover = -1;
    dotAnims.clear(); floaters = [];
    layout();
    updateUI();
  }

  function tryPlay(i) {
    if (busy || over || !state || !E.isLegal(state, i)) return;
    if (mode !== 'pvp' && state.turn === AI) return;
    doMove(i);
    if (!over && mode !== 'pvp' && state.turn === AI) {
      busy = true; updateUI();
      setTimeout(() => {
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
    for (let k = before; k < state.captures.length; k++) {
      const c = state.captures[k];
      c.t = now + 120;
      floaters.push({ x: c.cx, y: c.cy, text: '+' + c.n, p: c.p, t: now + 250 });
    }
    sfx.place(P);
    if (res.gained > 0) {
      setTimeout(() => sfx.capture(), 120);
      toast(`${nameOf(P)} otacza ${res.gained} ${plural(res.gained)}!`, P);
      bump(P);
    } else if (res.lost > 0) {
      setTimeout(() => sfx.trapped(), 120);
      toast(`Pułapka! ${nameOf(3 - P)} łapie ${res.lost} ${plural(res.lost)}`, 3 - P);
      bump(3 - P);
    }
    updateUI();
    if (!E.hasLegalMove(state)) setTimeout(finish, 900);
  }

  function undo() {
    if (busy || history.length === 0) return;
    state = history.pop();
    while (mode !== 'pvp' && state.turn === AI && history.length) state = history.pop();
    over = false;
    updateUI();
  }

  function finish() {
    if (over) return;
    over = true;
    const s1 = E.score(state, 1), s2 = E.score(state, 2);
    let title, text;
    if (s1 === s2) { title = 'Remis!'; text = `Obaj gracze złapali po ${s1} ${plural(s1)}.`; }
    else {
      const w = s1 > s2 ? 1 : 2;
      title = (mode !== 'pvp' && w === AI) ? 'Komputer wygrywa' : `Wygrywa ${nameOf(w)}! 🎉`;
      text = `Wynik ${s1} : ${s2}.`;
      if (!(mode !== 'pvp' && w === AI)) sfx.win();
    }
    $('overTitle').textContent = title;
    $('overText').textContent = text;
    updateUI();
    $('over').showModal();
  }

  // ---------- UI ----------
  let toastTimer = 0;
  function toast(msg, p) {
    const t = $('toast');
    t.textContent = msg;
    t.style.color = INK_DARK[p];
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
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
    if (over) st = 'Koniec gry';
    else if (busy) st = 'Komputer myśli…';
    else if (mode !== 'pvp') st = state.turn === 1 ? 'Twój ruch' : 'Ruch komputera';
    else st = 'Ruch: ' + nameOf(state.turn);
    $('status').textContent = st;
  }

  // ---------- rysowanie ----------
  function layout() {
    const r = canvas.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    view.w = r.width; view.h = r.height;
    canvas.width = Math.round(r.width * view.dpr);
    canvas.height = Math.round(r.height * view.dpr);
    if (!state) return;
    const m = Math.max(16, Math.min(r.width, r.height) * 0.04);
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
    const nx = -dy / len, ny = dx / len;
    const cx = X1 + dx / 2 + nx * off, cy = Y1 + dy / 2 + ny * off;
    if (prog < 1) { // rysowanie częściowe po krzywej Béziera
      const t = prog;
      const qx = X1 + (cx - X1) * t, qy = Y1 + (cy - Y1) * t;
      const rx = cx + (X2 - cx) * t, ry = cy + (Y2 - cy) * t;
      X2 = qx + (rx - qx) * t; Y2 = qy + (ry - qy) * t;
      ctx.moveTo(X1, Y1);
      ctx.quadraticCurveTo(qx, qy, X2, Y2);
      return;
    }
    ctx.moveTo(X1, Y1);
    ctx.quadraticCurveTo(cx, cy, X2, Y2);
  }

  function drawPaper() {
    const { w, h, cell, ox, oy } = view;
    ctx.fillStyle = '#fdfbf3';
    ctx.fillRect(0, 0, w, h);
    // drobne "włókna" papieru
    ctx.fillStyle = 'rgba(160,140,100,0.035)';
    for (let k = 0; k < 140; k++) {
      const a = hash(k, 7, 3, 1), b = hash(k, 11, 5, 2);
      ctx.fillRect(a * w, b * h, 1 + hash(k, 1, 1, 1) * 2, 1);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(80,140,205,0.30)';
    ctx.beginPath();
    let sx = ox % cell; if (sx < 0) sx += cell;
    for (let x = sx; x <= w; x += cell) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); }
    let sy = oy % cell; if (sy < 0) sy += cell;
    for (let y = sy; y <= h; y += cell) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); }
    ctx.stroke();
    // ołówkowa ramka pola gry
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
      // wypełnienie
      ctx.globalAlpha = p;
      ctx.fillStyle = FILL[c.p];
      ctx.beginPath();
      for (const poly of c.polys) {
        ctx.moveTo(px(poly[0]), py(poly[1]));
        for (let k = 2; k < poly.length; k += 2) ctx.lineTo(px(poly[k]), py(poly[k + 1]));
        ctx.closePath();
      }
      ctx.fill();
      // kreskowanie jak długopisem
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = c.p === 1 ? 'rgba(30,79,214,0.10)' : 'rgba(216,52,44,0.10)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const step = Math.max(5, view.cell * 0.28);
      for (let d = -view.h; d < view.w + view.h; d += step) { ctx.moveTo(d, 0); ctx.lineTo(d - view.h, view.h); }
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
      // obrys
      const e = easeOutCubic(p);
      ctx.strokeStyle = INK[c.p];
      ctx.lineWidth = Math.max(2, view.cell * 0.085);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k < c.edges.length; k += 4) {
        const [a, b, d, f] = [c.edges[k], c.edges[k + 1], c.edges[k + 2], c.edges[k + 3]];
        wobblyLine(a, b, d, f, hash(a, b, d, f), e);
      }
      ctx.stroke();
    }
  }
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function inkDot(x, y, r, p, alpha) {
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, p === 1 ? '#4c78f0' : '#f0605a');
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
      if (st != null) { const t = clamp01((now - st) / 280); s = easeOutBack(t); if (t >= 1) dotAnims.delete(i); }
      const captured = state.cap[i] !== 0;
      inkDot(x, y, r0 * s, o, captured ? 0.4 : 1);
      if (captured) { // przekreślenie złapanej kropki
        ctx.strokeStyle = INK_DARK[state.cap[i]];
        ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - r0 * 0.8, y - r0 * 0.8); ctx.lineTo(x + r0 * 0.8, y + r0 * 0.8);
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    // ostatni ruch – pulsujące kółko
    if (state.last >= 0 && !over) {
      const i = state.last, x = px(i % W), y = py((i / W) | 0);
      const pulse = 0.5 + 0.5 * Math.sin(now / 260);
      ctx.strokeStyle = INK[state.owner[i]];
      ctx.globalAlpha = 0.25 + 0.25 * pulse;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r0 * (1.7 + 0.3 * pulse), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // podgląd pod kursorem
    if (hover >= 0 && !over && !busy && E.isLegal(state, hover) && !(mode !== 'pvp' && state.turn === AI)) {
      const x = px(hover % W), y = py((hover / W) | 0);
      inkDot(x, y, r0, state.turn, 0.35);
    }
  }

  function drawFloaters(now) {
    floaters = floaters.filter((f) => now - f.t < 1300);
    for (const f of floaters) {
      const t = clamp01((now - f.t) / 1300);
      if (now < f.t) continue;
      ctx.globalAlpha = 1 - t * t;
      ctx.fillStyle = INK_DARK[f.p];
      ctx.font = `700 ${Math.max(22, view.cell * 1.1)}px Caveat, 'Patrick Hand', cursive`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(f.text, px(f.x), py(f.y) - t * view.cell * 1.6);
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
  canvas.addEventListener('pointermove', (e) => { if (state) hover = pickPoint(e); });
  canvas.addEventListener('pointerleave', () => { hover = -1; });
  canvas.addEventListener('pointerup', (e) => {
    if (!state) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const i = pickPoint(e);
    hover = e.pointerType === 'mouse' ? i : -1;
    if (i >= 0) tryPlay(i);
  });

  $('newGame').addEventListener('click', newGame);
  $('undo').addEventListener('click', undo);
  $('endGame').addEventListener('click', () => { if (!over && !busy) finish(); });
  $('rulesBtn').addEventListener('click', () => $('rules').showModal());
  $('soundBtn').addEventListener('click', (e) => {
    soundOn = !soundOn;
    e.currentTarget.textContent = soundOn ? '🔊' : '🔇';
    e.currentTarget.setAttribute('aria-pressed', String(soundOn));
  });
  $('mode').addEventListener('change', () => {
    const n2 = $('name2');
    if ($('mode').value !== 'pvp' && (n2.value === 'Czerwony' || !n2.value.trim())) n2.value = 'Komputer';
    if ($('mode').value === 'pvp' && n2.value === 'Komputer') n2.value = 'Czerwony';
    newGame();
  });
  $('size').addEventListener('change', newGame);
  ['name1', 'name2'].forEach((id) => $(id).addEventListener('input', updateUI));
  $('over').addEventListener('close', () => { if ($('over').returnValue === 'again') newGame(); });

  new ResizeObserver(() => layout()).observe(canvas);
  window.__kropki = { view, get state() { return state; } }; // do debugowania w konsoli

  if ($('mode').value !== 'pvp') $('name2').value = 'Komputer';
  newGame();
  requestAnimationFrame(frame);
})();
