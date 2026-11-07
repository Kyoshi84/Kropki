/*
 * Kropki — silnik gry (czysta logika, bez grafiki).
 *
 * Plansza to siatka W x H punktów (skrzyżowań linii w zeszycie).
 * owner[i]  – 0 pusto, 1 lub 2 – czyja kropka stoi w punkcie
 * cap[i]    – 0 lub numer gracza, który "złapał" tę kropkę
 * terr[i]   – 0 lub numer gracza, do którego należy pusty punkt wewnątrz zamkniętego obszaru
 *
 * Zasada otaczania: aktywne (niezłapane) kropki gracza P tworzą "mur".
 * Kropki muru łączą się tylko z najbliższymi sąsiadami (8 kierunków).
 * Każdy obszar wolnych punktów, z którego nie da się dojść do krawędzi planszy
 * (ruchem w 4 kierunkach, bez przechodzenia przez mur), jest otoczony.
 * Jeżeli w takim obszarze jest choć jedna aktywna kropka przeciwnika – P ją łapie.
 */
(function (root) {
  'use strict';

  function createState(W, H) {
    return {
      W, H,
      owner: new Int8Array(W * H),
      cap: new Int8Array(W * H),
      terr: new Int8Array(W * H),
      captures: [],          // { p, edges:[x1,y1,x2,y2,...], polys:[[x,y,...]], cx, cy, n, t }
      turn: 1,
      last: -1,
      moves: 0,
    };
  }

  function cloneState(s) {
    return {
      W: s.W, H: s.H,
      owner: s.owner.slice(), cap: s.cap.slice(), terr: s.terr.slice(),
      captures: s.captures.slice(),
      turn: s.turn, last: s.last, moves: s.moves,
    };
  }

  function isLegal(s, i) {
    return i >= 0 && i < s.W * s.H && s.owner[i] === 0 && s.terr[i] === 0;
  }

  function hasLegalMove(s) {
    for (let i = 0; i < s.W * s.H; i++) if (isLegal(s, i)) return true;
    return false;
  }

  function score(s, p) {
    let n = 0;
    for (let i = 0; i < s.cap.length; i++) if (s.cap[i] === p) n++;
    return n;
  }

  // Szuka i wykonuje wszystkie otoczenia gracza P. Zwraca liczbę nowo złapanych kropek.
  function resolveCaptures(s, P, withGeometry) {
    const { W, H, owner, cap, terr } = s;
    const O = 3 - P;
    const N = W * H;
    const wall = new Uint8Array(N);
    for (let i = 0; i < N; i++) wall[i] = (owner[i] === P && cap[i] === 0) ? 1 : 0;

    const mark = new Int32Array(N); // 0 = nieodwiedzony, -1 = zewnątrz, k>0 = obszar k
    const queue = new Int32Array(N);
    let head = 0, tail = 0;

    const pushOut = (i) => { if (!wall[i] && mark[i] === 0) { mark[i] = -1; queue[tail++] = i; } };
    for (let x = 0; x < W; x++) { pushOut(x); pushOut((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { pushOut(y * W); pushOut(y * W + W - 1); }
    while (head < tail) {
      const i = queue[head++], x = i % W, y = (i / W) | 0;
      if (x > 0) pushOut(i - 1);
      if (x < W - 1) pushOut(i + 1);
      if (y > 0) pushOut(i - W);
      if (y < H - 1) pushOut(i + W);
    }

    let gained = 0, rid = 0;
    for (let start = 0; start < N; start++) {
      if (wall[start] || mark[start] !== 0) continue;
      rid++;
      head = tail = 0;
      mark[start] = rid; queue[tail++] = start;
      let enemy = false;
      while (head < tail) {
        const i = queue[head++], x = i % W, y = (i / W) | 0;
        if (owner[i] === O && cap[i] === 0) enemy = true;
        const nb = [];
        if (x > 0) nb.push(i - 1);
        if (x < W - 1) nb.push(i + 1);
        if (y > 0) nb.push(i - W);
        if (y < H - 1) nb.push(i + W);
        for (const j of nb) if (!wall[j] && mark[j] === 0) { mark[j] = rid; queue[tail++] = j; }
      }
      if (!enemy) continue; // pusty "domek" – nic nie łapiemy (ale przeciwnik nie może tam bezkarnie wejść)

      const cells = Array.from(queue.subarray(0, tail));
      let n = 0;
      for (const i of cells) {
        if (owner[i] === O && cap[i] === 0) { cap[i] = P; n++; }
        else if (owner[i] === P && cap[i] === O) { cap[i] = 0; }   // odbicie własnych jeńców
        else if (owner[i] === 0) { terr[i] = P; }
      }
      gained += n;
      if (withGeometry) {
        const g = buildGeometry(s, cells, mark, rid, wall);
        g.p = P; g.n = n;
        s.captures = s.captures.concat([g]);
      }
    }
    return gained;
  }

  // Wylicza odcinki obrysu i wielokąty wypełnienia dla zamkniętego obszaru.
  function buildGeometry(s, cells, mark, rid, wall) {
    const { W, H } = s;
    const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const inR = (x, y) => inB(x, y) && mark[y * W + x] === rid;
    const isW = (x, y) => inB(x, y) && wall[y * W + x] === 1;
    let minx = W, miny = H, maxx = 0, maxy = 0, sx = 0, sy = 0;
    for (const i of cells) {
      const x = i % W, y = (i / W) | 0;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
      sx += x; sy += y;
    }
    const edges = [];
    for (let y = miny - 1; y <= maxy + 1; y++) {
      for (let x = minx - 1; x <= maxx + 1; x++) {
        if (!isW(x, y)) continue;
        // poziomo
        if (isW(x + 1, y)) {
          const up = inR(x, y - 1) || inR(x + 1, y - 1);
          const dn = inR(x, y + 1) || inR(x + 1, y + 1);
          if (up !== dn) edges.push(x, y, x + 1, y);
        }
        // pionowo
        if (isW(x, y + 1)) {
          const lf = inR(x - 1, y) || inR(x - 1, y + 1);
          const rt = inR(x + 1, y) || inR(x + 1, y + 1);
          if (lf !== rt) edges.push(x, y, x, y + 1);
        }
        // ukośnie w prawo-dół
        if (isW(x + 1, y + 1)) {
          const a = [x + 1, y], b = [x, y + 1];
          if ((inR(...a) && !inR(...b) && !isW(...b)) || (inR(...b) && !inR(...a) && !isW(...a)))
            edges.push(x, y, x + 1, y + 1);
        }
        // ukośnie w lewo-dół
        if (isW(x - 1, y + 1)) {
          const a = [x - 1, y], b = [x, y + 1];
          if ((inR(...a) && !inR(...b) && !isW(...b)) || (inR(...b) && !inR(...a) && !isW(...a)))
            edges.push(x, y, x - 1, y + 1);
        }
      }
    }
    const polys = [];
    for (let y = miny - 1; y <= maxy; y++) {
      for (let x = minx - 1; x <= maxx; x++) {
        const c = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
        const inS = c.map(([a, b]) => inR(a, b) || isW(a, b));
        const anyR = c.some(([a, b]) => inR(a, b));
        const cnt = inS.filter(Boolean).length;
        if (!anyR || cnt < 3) continue;
        const poly = [];
        c.forEach(([a, b], k) => { if (inS[k]) poly.push(a, b); });
        polys.push(poly);
      }
    }
    return { edges, polys, cx: sx / cells.length, cy: sy / cells.length };
  }

  // Wykonuje ruch gracza P w punkcie i. Najpierw liczą się otoczenia gracza wykonującego ruch,
  // potem przeciwnika (np. gdy kropka została postawiona w jego "domku").
  function applyMove(s, i, P, withGeometry) {
    s.owner[i] = P;
    s.last = i;
    s.moves++;
    const gained = resolveCaptures(s, P, withGeometry);
    const lost = resolveCaptures(s, 3 - P, withGeometry);
    s.turn = 3 - P;
    return { gained, lost };
  }

  // ---------- Prosty przeciwnik komputerowy ----------
  function nearDots(s, i, dist) {
    const { W, H } = s, x = i % W, y = (i / W) | 0;
    for (let dy = -dist; dy <= dist; dy++) for (let dx = -dist; dx <= dist; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      if (s.owner[Y * W + X] !== 0) return true;
    }
    return false;
  }

  function candidates(s, dist, around) {
    const out = [];
    const N = s.W * s.H;
    for (let i = 0; i < N; i++) {
      if (!isLegal(s, i)) continue;
      if (around != null) {
        const ax = around % s.W, ay = (around / s.W) | 0, x = i % s.W, y = (i / s.W) | 0;
        if (Math.max(Math.abs(ax - x), Math.abs(ay - y)) > dist) continue;
      } else if (!nearDots(s, i, dist)) continue;
      out.push(i);
    }
    return out;
  }

  function aiMove(s, P, level) {
    const O = 3 - P, { W, H } = s;
    let cands = candidates(s, 2, null);
    if (cands.length === 0) {
      const c = ((H / 2) | 0) * W + ((W / 2) | 0);
      if (isLegal(s, c)) return c;
      for (let i = 0; i < W * H; i++) if (isLegal(s, i)) return i;
      return -1;
    }
    const scored = cands.map((c) => {
      let sc = Math.random() * 2.5;
      const a = cloneState(s);
      const r = applyMove(a, c, P, false);
      sc += r.gained * 100 - r.lost * 120;
      if (a.cap[c] !== 0) sc -= 160; // samobójczy ruch
      const b = cloneState(s);
      const r2 = applyMove(b, c, O, false);
      sc += r2.gained * 90; // blokowanie otoczenia przeciwnika
      const x = c % W, y = (c / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const o = s.owner[Y * W + X], cp = s.cap[Y * W + X];
        if (cp) continue;
        if (o === O) sc += (dx && dy) ? 2.5 : 4;
        if (o === P) sc += (dx && dy) ? 2 : 1;
      }
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) sc -= 3;
      return { c, sc, a };
    });
    if (level >= 2) {
      scored.sort((p, q) => q.sc - p.sc);
      for (const it of scored.slice(0, 14)) {
        const near = candidates(it.a, 2, it.c);
        let myBest = 0;
        for (const n of near) {
          const t = cloneState(it.a);
          const r = applyMove(t, n, P, false);
          if (r.gained > myBest) myBest = r.gained;
        }
        let oppBest = 0;
        for (const n of candidates(it.a, 2, null).slice(0, 220)) {
          const t = cloneState(it.a);
          const r = applyMove(t, n, O, false);
          if (r.gained > oppBest) oppBest = r.gained;
        }
        it.sc += myBest * 30 - oppBest * 55;
      }
    }
    scored.sort((p, q) => q.sc - p.sc);
    return scored[0].c;
  }

  const api = { createState, cloneState, isLegal, hasLegalMove, score, applyMove, aiMove };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KropkiEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
