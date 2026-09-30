'use strict';
// Sonderregeln der Karten Bahnhof, Schiffsdeck, Wüste, Jahrmarkt, Stadt bei Nacht, Bibliothek, Spiegelsaal und Mond.
// Bewegliche Schattenwerfer (Züge, Segel, Gondeln, Dünen) liegen in S.casters: Sie werfen Schatten wie Säulen,
// man läuft aber nicht gegen sie. „tall“ verlängert ihren Schatten. Lichtquellen der dunklen Karten liefert darkLights().

const NO_LIGHTS = [];
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => Math.abs(((a - b) % TAU + TAU + Math.PI) % TAU - Math.PI);

// ---------- Aufbau ----------
// Bereiche, in denen keine Säule stehen darf (Gleise, Strasse, Riesenrad, Karussells, Mastenreihe)
function mapBlocks(r) {
  const m = S.map, pad = 10;
  if (m.tracks) for (const y of m.tracks) if (r.y < y + m.trackH / 2 + pad && r.y + r.h > y - m.trackH / 2 - pad) return true;
  if (m.road && r.y < m.road[1] + pad && r.y + r.h > m.road[0] - pad) return true;
  const near = (c, rr) => Math.hypot(c.x - clampN(c.x, r.x, r.x + r.w), c.y - clampN(c.y, r.y, r.y + r.h)) < rr;
  if (m.wheel && near(m.wheel, m.wheel.r + 20)) return true;
  if (m.carousels) for (const c of m.carousels) if (near(c, c.r + 14)) return true;
  if (m.id === 'ship' && (Math.abs(r.x + r.w / 2 - W / 2) < r.w / 2 + 40 || r.x < DECK_X0 + 8 || r.x + r.w > DECK_X1 - 8)) return true;
  if (m.beams) { for (const [x, y] of MIRRORS) if (near({ x, y }, 52)) return true; for (const E of EMITTERS) if (near(E, 40)) return true; }
  if (m.id === 'city') for (const [x, y] of CITY_LAMPS) if (near({ x, y }, 16)) return true;
  return false;
}
// Schiff: Deck zwischen der Reling, links und rechts Wasser
const DECK_X0 = 74, DECK_X1 = 406;
const offLimits = (x, y) => S.map.id === 'ship' && (x < DECK_X0 + 12 || x > DECK_X1 - 12);
// Zusätzliche Grenzen für die Figur: Reling auf dem Schiff, Spiegelscheiben im Spiegelsaal
function mapResolve(r0) {
  const m = S.map;
  if (m.id === 'ship') S.p.x = Math.max(DECK_X0 + r0, Math.min(DECK_X1 - r0, S.p.x));
  if (m.beams && S.fx.mirrors) for (const M of S.fx.mirrors) {
    const [x1, y1, x2, y2] = mirrorEnds(M), d = segDist(S.p.x, S.p.y, x1, y1, x2, y2), min = r0 + 4;
    if (d >= min) continue;
    const nx = -Math.sin(M.a), ny = Math.cos(M.a), side = ((S.p.x - M.x) * nx + (S.p.y - M.y) * ny) >= 0 ? 1 : -1;
    S.p.x += nx * side * (min - d); S.p.y += ny * side * (min - d);
  }
}
const mirrorEnds = M => { const c = Math.cos(M.a) * M.len / 2, s = Math.sin(M.a) * M.len / 2; return [M.x - c, M.y - s, M.x + c, M.y + s]; };

// Säulenformen der neuen Karten; null heisst: die normale Form nehmen
function mapPillarShape() {
  switch (S.map.id) {
    case 'library': return rng() < 0.5 ? { w: rand(90, 130), h: 18, shelf: true } : { w: 18, h: rand(90, 130), shelf: true };
    case 'desert': return rng() < 0.7 ? { w: 14, h: 14, round: true, cactus: true } : { w: rand(30, 42), h: rand(24, 34), rock: true };
    case 'city': return { w: rand(46, 76), h: rand(46, 76), building: true };
    case 'ship': return { w: rand(26, 36), h: rand(26, 36), crate: true };
    case 'fair': return { w: rand(36, 52), h: rand(28, 40), booth: true };
    case 'station': return rng() < 0.5 ? { w: rand(52, 72), h: 16, bench: true } : { w: rand(24, 32), h: rand(24, 32) };
    case 'moon': { const d = rand(30, 56); return { w: d, h: d, round: true, boulder: true }; }
  }
  return null;
}
// Spiegelsaal: Spiegel [x, y, Länge, Grundwinkel, Schwenk] und Lichtwerfer an den Wänden
const MIRRORS = [[360, 112, 74, 0.6, 0.35], [120, 332, 74, -0.7, 0.3], [384, 312, 64, 1.2, 0.4], [104, 150, 64, -1.0, 0.3], [248, 414, 74, 0.1, 0.5]];
const EMITTERS = [{ x: 0, y: 112, a: 0.12, amp: 0.45, sp: 0.42 }, { x: W, y: 372, a: Math.PI + 0.1, amp: 0.45, sp: 0.37 },
                  { x: 150, y: 0, a: Math.PI / 2, amp: 0.5, sp: 0.33 }, { x: 340, y: H, a: -Math.PI / 2, amp: 0.5, sp: 0.46 },
                  { x: 0, y: 330, a: -0.2, amp: 0.5, sp: 0.39 }, { x: W, y: 150, a: Math.PI - 0.15, amp: 0.5, sp: 0.44 },
                  { x: 330, y: 0, a: Math.PI / 2 + 0.3, amp: 0.45, sp: 0.35 }];
const CITY_LAMPS = [[60, 184], [180, 296], [300, 184], [420, 296], [120, 70], [360, 60], [110, 420], [370, 424]];

function initMapFx() {
  const m = S.map, F = S.fx = {};
  S.casters = []; S.vel = { x: 0, y: 0 };
  const fixed = (x, y, d, extra) => Object.assign({ x: x - d / 2, y: y - d / 2, w: d, h: d, round: true, fixed: true, crumble: 0 }, extra);
  const addFixed = r => { S.pillars = S.pillars.filter(q => !overlaps(q, r, 18)); S.pillars.push(r); };
  if (m.tracks) {
    F.trains = m.tracks.map((y, i) => ({ y, next: rand(2, 4) + i * 4, warn: 0, train: null }));
    // Bahnsteigdächer: Stücke mit Lücken, damit man zwischen ihnen wechseln muss
    F.roofs = [[70, 222, 64, 36], [346, 222, 64, 36]].map(([x, y, w, h]) => ({ x, y, w, h, tall: 0.5 }));
  }
  if (m.id === 'ship') {
    F.sway = 0;
    F.masts = [104, 214, 384].map((y, i) => { addFixed(fixed(W / 2, y, 16, { mast: true })); return { x: W / 2, y, ph: i * 4.6, open: 1, big: i === 1 }; });
    S.p.x = W / 2 + 60;
  }
  if (m.id === 'desert') {
    F.dunes = [0, 1, 2].map(i => ({ x: rand(40, W - 40), y: 90 + i * 150 + rand(-25, 25), r: rand(36, 48), vx: (rng() < 0.5 ? -1 : 1) * rand(7, 12) }));
    F.stormIn = rand(20, 28); F.storm = 0; F.stormWarn = 0; F.windA = 0; F.haze = 0;
  }
  if (m.wheel) { addFixed(fixed(m.wheel.x, m.wheel.y, 24, { hub: true })); F.wheelA = 0; }
  if (m.carousels) { for (const c of m.carousels) addFixed(fixed(c.x, c.y, 14, { pole: true })); F.carA = 0; }
  if (m.id === 'city') {
    F.lamps = CITY_LAMPS.map(([x, y], i) => ({ x, y, r: 112, st: i % 3 === 0 ? 'on' : 'off', t: i % 3 === 0 ? rand(3, 6) : rand(1, 7), ph: i }));
    F.cars = []; F.carIn = rand(1.5, 3);
    // Nicht mitten auf der Strasse anfangen
    S.p.y = m.road[0] - 46; S.pillars = S.pillars.filter(r => !pillarContains(r, S.p.x, S.p.y, 24));
  }
  if (m.id === 'library') { F.chand = { x: W / 2, y: H / 2, r: 205, ph: 0, warm: true }; F.bookIn = rand(5, 8); F.falls = []; }
  if (m.lowG) { F.earthW = 0; F.earthUp = false; }
  if (m.beams) { F.mirrors = MIRRORS.map(([x, y, len, a0, sw], i) => ({ x, y, len, a0, sw, a: a0, ph: i * 1.9 })); F.beams = []; }
}

// ---------- Licht ----------
function darkLights() {
  const m = S.map, F = S.fx;
  if (m.id === 'city') { const out = F.lamps.filter(l => l.st === 'on'); for (const c of F.cars) out.push(c.head); return out; }
  if (m.id === 'library') return [F.chand];
  return S.torches;
}
function lightHits(L, px, py) {
  const dx = px - L.x, dy = py - L.y, d = Math.hypot(dx, dy);
  if (d >= L.r * 0.84) return false;
  if (d < 0.1) return true;
  const a = Math.atan2(dy, dx);
  if (L.cone && angDiff(a, L.cone.a) > L.cone.h) return false;
  return rayLen(L.x, L.y, a, d) >= d - 1;
}
function darkLight(px, py) {
  if (on('eclipse')) return 0;
  if (S.map.beams) return S.fx.beams.some(b => segDist(px, py, b.x1, b.y1, b.x2, b.y2) < BEAM_W) ? 1 : 0;
  for (const L of darkLights()) if (lightHits(L, px, py)) return 1;
  return 0;
}
const sandstorm = () => S.map.id === 'desert' && S.fx.storm > 0;
const earthAz = () => S.az + 2.4;
// Nebenlichter: Spiegel (zwei gedrehte Sonnenstrahlen) und Erdlicht. w = wie stark es brennt.
function extraLights() {
  const m = S.map;
  if (m.lowG && S.fx.earthW > 0.04) return [{ az: earthAz(), w: S.fx.earthW }];
  return NO_LIGHTS;
}

// ---------- Ablauf ----------
function carRects(tr) {
  const out = [], CL = 88, GAP = 6;
  for (let i = 0; i < tr.cars; i++) {
    const back = tr.x - tr.dir * (i * (CL + GAP)), front = back - tr.dir * CL;
    out.push({ x: Math.min(back, front), y: tr.y - 15, w: CL, h: 30, tall: 1.7, i });
  }
  return out;
}
const rectHit = (r, x, y, pad) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
// Rückstoss quer zur Fahrbahn, damit man nicht zweimal erwischt wird
function knock(y0, halfH, along, text, dmg) {
  if (!hit(dmg, text)) return;
  const side = Math.sign(S.p.y - y0) || (rng() < 0.5 ? -1 : 1);
  S.p.y = y0 + side * (halfH + pr() + 22); S.p.x += along;
  S.vel.x = 0; S.vel.y = 0;
  S.shake = Math.max(S.shake, 0.6); sparks(S.p.x, S.p.y, COL.warn, 16); Sound.sfx('boom');
  resolve();
}

function updateMapFx(dt, sunDt, playing) {
  const m = S.map, F = S.fx;
  S.casters = [];
  const cast = r => S.casters.push(r);

  // Bahnhof: Züge kündigen sich mit roten Gleisen an und rasen dann durch
  if (F.trains) for (const T of F.trains) {
    if (T.train) {
      const tn = T.train;
      if (tn.st === 'in') {   // bremst bis zum Halt am Bahnsteig
        const rest = (tn.stopX - tn.x) * tn.dir;
        tn.v = Math.max(30, tn.v0 * Math.sqrt(Math.max(0, rest) / tn.d0));
        tn.x += tn.dir * Math.min(tn.v * dt, Math.max(0, rest));
        if (rest <= 1) { tn.x = tn.stopX; tn.v = 0; tn.st = 'stop'; tn.wait = rand(2.2, 3.2); Sound.sfx('block'); }
      } else if (tn.st === 'stop') {
        tn.wait -= dt;
        if (tn.wait < 1.4 && !tn.horn) { tn.horn = true; Sound.sfx('alarm'); }
        if (tn.wait <= 0) tn.st = 'out';
      } else { tn.v = Math.min(tn.v0, tn.v + 300 * dt); tn.x += tn.dir * tn.v * dt; }
      for (const r of carRects(tn)) {
        cast(r);
        if (playing && rectHit(r, S.p.x, S.p.y, pr())) {
          if (tn.v > 70) {
            const base = S.diff.dmg < 1 ? 20 : S.diff.dmg > 1 ? 40 : 30;
            knock(T.y, m.trackH / 2, tn.dir * 30, tr_('Vom Zug erwischt!', 'Hit by the train!'), base);
          } else {   // stehender Zug: nur wegschieben
            const side = Math.sign(S.p.y - T.y) || 1;
            S.p.y = T.y + side * (15 + pr() + 1); S.vel.y = 0;
          }
        }
        for (const b of S.bugs) if (tn.v > 70 && rectHit(r, b.x, b.y, 6)) { b.life = 0; sparks(b.x, b.y, COL.bug, 6); }
      }
      const tail = tn.x - tn.dir * tn.cars * 94;
      if (tn.st === 'out' && (tn.dir > 0 ? tail > W + 30 : tail < -30)) { T.train = null; T.next = Math.max(3, rand(5, 9) - lv() * 0.3); }
    } else if (T.warn > 0) {
      T.warn -= dt;
      if (T.warn <= 0) {
        const dir = rng() < 0.5 ? 1 : -1, cars = 3 + (S.level >= 4 ? 1 : 0), len = cars * 94 - 6;
        const x = dir > 0 ? -10 : W + 10, stopX = dir > 0 ? W / 2 + len / 2 : W / 2 - len / 2;
        const v0 = 480 + lv() * 12;
        T.train = { dir, x, y: T.y, v: v0, v0, cars, stopX, d0: Math.abs(stopX - x), st: 'in', col: pick(['#C3402C', '#2472B3', '#2F7D5B']) };
        Sound.sfx('whoosh');
      }
    } else if (playing) {
      T.next -= dt;
      if (T.next <= 0) { T.warn = 1.8; Sound.sfx('alarm'); }
    }
  }

  if (F.roofs) for (const r of F.roofs) cast(r);

  // Schiffsdeck: Das Schiff schaukelt, die Segel gehen im Takt auf und zu
  if (m.id === 'ship') {
    const sway = 0.34 * Math.sin(S.t * 0.62);
    S.az += sway - F.sway; F.sway = sway;
    if (playing && !S.dash) { S.p.x += Math.sin(S.t * 0.62 + 0.9) * 18 * dt; }
    for (const M of F.masts) {
      const c = ((S.t + M.ph) % 14) / 14;
      M.open = c < 0.55 ? 1 : c < 0.62 ? 1 - (c - 0.55) / 0.07 : c < 0.93 ? 0 : (c - 0.93) / 0.07;
      // Grosses Segel unten, kleines Topsegel darüber, beide werfen Schatten
      if (M.open > 0.05) {
        if (M.big) { const w = 26 + 200 * M.open, wt = 20 + 120 * M.open; cast({ x: M.x - w / 2, y: M.y - 10, w, h: 20, tall: 1.8 }); cast({ x: M.x - wt / 2, y: M.y - 40, w: wt, h: 14, tall: 2.2 }); }
        else { const w = 22 + 150 * M.open; cast({ x: M.x - w / 2, y: M.y - 8, w, h: 16, tall: 1.5 }); }
      }
    }
  }

  // Wüste: Dünen wandern, ab und zu kommt ein Sandsturm
  if (m.id === 'desert') {
    for (const d of F.dunes) {
      d.x += d.vx * sunDt;
      if (d.x < -d.r - 20) d.x = W + d.r + 10; else if (d.x > W + d.r + 20) d.x = -d.r - 10;
      cast({ x: d.x - d.r, y: d.y - d.r, w: d.r * 2, h: d.r * 2, round: true, tall: 0.75 });
    }
    if (F.storm > 0) {
      F.storm -= dt;
      F.windA += Math.sin(S.t * 0.8) * 0.3 * dt;
      if (playing && !S.dash) { S.p.x += Math.cos(F.windA) * 62 * dt; S.p.y += Math.sin(F.windA) * 62 * dt; }
      if (Math.random() < dt * 40) S.parts.push({ x: fx(0, W), y: fx(0, H), vx: Math.cos(F.windA) * 320, vy: Math.sin(F.windA) * 320, life: 0.3, streak: true });
      if (F.storm <= 0) { flash(tr_('Der Sturm legt sich', 'The storm dies down'), '#E6BF72'); F.stormIn = rand(32, 46); }
    } else if (F.stormWarn > 0) {
      F.stormWarn -= dt;
      if (F.stormWarn <= 0) { F.storm = 8; F.windA = rand(0, TAU); flash(tr_('Sandsturm! Schutz, aber kaum Sicht', 'Sandstorm! Cover, but barely any sight'), '#E6BF72'); Sound.sfx('whoosh'); }
    } else if (playing) {
      F.stormIn -= dt;
      if (F.stormIn <= 0) { F.stormWarn = 3; flash(tr_('Ein Sandsturm zieht auf!', 'A sandstorm is coming!'), COL.warn); Sound.sfx('alarm'); }
    }
    const want = F.storm > 0 ? 1 : F.stormWarn > 0 ? 0.3 * (1 - F.stormWarn / 3) : 0;
    F.haze += (want - F.haze) * Math.min(1, dt * 2.5);
  }

  // Jahrmarkt: Riesenrad mit Gondeln, Karussells drehen die Figur mit
  if (m.wheel) {
    F.wheelA += 0.3 * sunDt;
    for (let i = 0; i < 8; i++) {
      const a = F.wheelA + i * TAU / 8, x = m.wheel.x + Math.cos(a) * m.wheel.r, y = m.wheel.y + Math.sin(a) * m.wheel.r;
      cast({ x: x - 13, y: y - 13, w: 26, h: 26, round: true, tall: 1.25 });
    }
  }
  if (m.carousels) {
    const w = 1.05;
    F.carA += w * dt;
    if (playing && !S.dash) for (const c of m.carousels) {
      const dx = S.p.x - c.x, dy = S.p.y - c.y, d = Math.hypot(dx, dy);
      if (d < c.r && d > 0.5) { const a = Math.atan2(dy, dx) + w * dt; S.p.x = c.x + Math.cos(a) * d; S.p.y = c.y + Math.sin(a) * d; }
    }
  }

  // Stadt: Laternen flackern, gehen an und wieder aus; Autos fahren mit Scheinwerfern
  if (m.id === 'city') {
    for (const l of F.lamps) {
      if (playing || l.st !== 'off') l.t -= dt;
      if (l.t > 0) continue;
      if (l.st === 'off') { l.st = 'warn'; l.t = 1.3; }
      else if (l.st === 'warn') { l.st = 'on'; l.t = rand(4, 7) + lv() * 0.3; }
      else { l.st = 'off'; l.t = Math.max(2, rand(4, 8) - lv() * 0.3); }
    }
    if (playing) F.carIn -= dt;
    if (F.carIn <= 0) {
      const dir = rng() < 0.5 ? 1 : -1, y = dir > 0 ? m.road[0] + 22 : m.road[1] - 22;
      F.cars.push({ x: dir > 0 ? -30 : W + 30, y, dir, v: rand(140, 190) + lv() * 6, col: pick(['#D6304F', '#2B8FD6', '#F4CF63', '#E9EDF6', '#5FBE90']) });
      F.carIn = Math.max(1.4, rand(2.5, 4.5) - lv() * 0.2);
    }
    for (const c of F.cars) {
      c.x += c.dir * c.v * sunDt;
      const fxp = c.x + c.dir * 23;
      c.head = { x: fxp, y: c.y, r: 215, cone: { a: c.dir > 0 ? 0 : Math.PI, h: 0.36 }, cool: true, ph: 0 };
      if (playing && Math.abs(S.p.x - c.x) < 23 + pr() && Math.abs(S.p.y - c.y) < 11 + pr()) {
        const lane = (m.road[0] + m.road[1]) / 2;
        knock(c.y, 11, c.dir * 24, tr_('Angefahren!', 'Hit by a car!'), 14);
        if (Math.abs(S.p.y - lane) < 1) S.p.y += 1;
      }
    }
    F.cars = F.cars.filter(c => c.x > -60 && c.x < W + 60);
  }

  // Bibliothek: Der Leuchter schwingt, Bücher fallen aus den Regalen
  if (m.id === 'library') {
    const C = F.chand, w = 0.52;
    C.x = W / 2 + 178 * Math.sin(S.t * w); C.y = H / 2 - 8 + 28 * Math.cos(2 * S.t * w); C.r = 205 + lv() * 5;
    const shelves = S.pillars.filter(r => r.shelf);
    if (playing) F.bookIn -= dt;
    if (F.bookIn <= 0 && shelves.length && S.pillars.filter(r => r.books).length < 6) {
      const s = pick(shelves), horiz = s.w > s.h;
      for (let k = 0; k < 10; k++) {
        const side = rng() < 0.5 ? -1 : 1;
        const x = horiz ? pcx(s) + rand(-s.w / 2 + 14, s.w / 2 - 14) : pcx(s) + side * (s.w / 2 + 22);
        const y = horiz ? pcy(s) + side * (s.h / 2 + 22) : pcy(s) + rand(-s.h / 2 + 14, s.h / 2 - 14);
        if (x < 20 || x > W - 20 || y < 20 || y > H - 20 || inPillar(x, y, 12)) continue;
        F.falls.push({ x, y, warn: 1.3 }); break;
      }
      F.bookIn = Math.max(2.5, rand(4.5, 7) - lv() * 0.25);
    }
    for (const f of F.falls) {
      f.warn -= dt;
      if (f.warn > 0) continue;
      const r = { x: f.x - 14, y: f.y - 11, w: 28, h: 22, books: true, life: 12, crumble: 0, grow: 0.25, ph: rand(0, 6) };
      if (playing && Math.abs(S.p.x - f.x) < 14 + pr() && Math.abs(S.p.y - f.y) < 11 + pr()) hit(12, tr_('Bücher auf den Kopf!', 'Books on your head!'));
      S.pillars.push(r); resolve(); sparks(f.x, f.y, '#C98A1B', 10); Sound.sfx('block');
    }
    F.falls = F.falls.filter(f => f.warn > 0);
    for (const r of S.pillars) if (r.books) r.life -= dt;
    S.pillars = S.pillars.filter(r => !r.books || r.life > 0);
  }

  // Spiegelsaal: Spiegel schwenken, Strahlen prallen an ihnen ab
  if (m.beams) {
    for (const M of F.mirrors) M.a = M.a0 + M.sw * Math.sin(S.t * 0.3 + M.ph);
    const n = Math.min(EMITTERS.length, 4 + Math.floor(S.level / 3));
    F.beams = [];
    for (let i = 0; i < n; i++) {
      const E = EMITTERS[i];
      E.cur = E.a + E.amp * Math.sin(S.t * E.sp + i * 1.3);
      castBeam(E.x, E.y, E.cur, F.beams);
    }
  }

  // Mond: Die Erde geht regelmässig auf und unter
  if (m.lowG) {
    const e = Math.sin(S.t * TAU / 44 - 1.3);
    F.earthW = 0.5 * clampN((e + 0.15) * 2.5, 0, 1);
    if (F.earthW > 0.2 && !F.earthUp) { F.earthUp = true; if (playing) flash(tr_('Die Erde geht auf', 'The Earth rises'), '#8FC7FF'); }
    else if (F.earthW < 0.04) F.earthUp = false;
  }
}
const tr_ = (de, en) => tr(de, en);

// Ein Strahl läuft bis zur Wand oder Säule und prallt an Spiegeln ab (höchstens 6-mal)
const BEAM_W = 13;
function castBeam(x, y, a, out) {
  let dx = Math.cos(a), dy = Math.sin(a), left = 1500, last = null;
  for (let k = 0; k < 7 && left > 1; k++) {
    let best = Math.min(dx > 1e-9 ? (W - x) / dx : dx < -1e-9 ? -x / dx : Infinity, dy > 1e-9 ? (H - y) / dy : dy < -1e-9 ? -y / dy : Infinity), hitM = null;
    for (const r of S.pillars) { if (r.glass > 0) continue; const t = pillarEnter(r, x, y, dx, dy); if (t > 0.5 && t < best) best = t; }
    for (const M of S.fx.mirrors) {
      if (M === last) continue;
      const [x1, y1, x2, y2] = mirrorEnds(M), ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x1 - x) * ey - (y1 - y) * ex) / den, u = ((x1 - x) * dy - (y1 - y) * dx) / den;
      if (t > 0.5 && u >= 0 && u <= 1 && t < best) { best = t; hitM = M; }
    }
    best = Math.min(best, left);
    const x2 = x + dx * best, y2 = y + dy * best;
    out.push({ x1: x, y1: y, x2, y2 }); left -= best;
    if (!hitM) break;
    const nx = -Math.sin(hitM.a), ny = Math.cos(hitM.a), d = dx * nx + dy * ny;
    dx -= 2 * d * nx; dy -= 2 * d * ny; x = x2; y = y2; last = hitM;
  }
}

// ---------- Zeichnen ----------
// Boden: vor den Schatten (helle Karten) bzw. nach dem Licht (dunkle Karten)
function drawMapFloor() {
  const m = S.map, F = S.fx;
  if (m.tracks) {
    for (const T of F.trains) {
      const y = T.y, h = m.trackH;
      ctx.fillStyle = 'rgba(70,58,48,.28)'; ctx.fillRect(0, y - h / 2, W, h);
      ctx.fillStyle = 'rgba(92,70,52,.55)';
      for (let x = 4; x < W; x += 16) ctx.fillRect(x, y - h / 2 + 3, 7, h - 6);
      const leaving = T.train && T.train.st === 'stop' && T.train.wait < 1.4;
      const warn = (T.warn > 0 || leaving) && Math.floor(S.t * 8) % 2 === 0;
      ctx.strokeStyle = warn ? '#E8403C' : '#8A8F9C'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, y - 8); ctx.lineTo(W, y - 8); ctx.moveTo(0, y + 8); ctx.lineTo(W, y + 8); ctx.stroke();
      ctx.fillStyle = 'rgba(244,207,99,.9)';
      for (let x = 0; x < W; x += 24) { ctx.fillRect(x, y - h / 2 - 5, 12, 3); ctx.fillRect(x + 12, y + h / 2 + 2, 12, 3); }
    }
    // Bahnsteigdächer: Pfosten und Fläche, ihr Schatten liegt darüber
    for (const r of F.roofs) {
      ctx.fillStyle = 'rgba(71,76,90,.18)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#474C5A';
      for (const [px, py] of [[r.x + 6, r.y + 6], [r.x + r.w - 6, r.y + 6], [r.x + 6, r.y + r.h - 6], [r.x + r.w - 6, r.y + r.h - 6]]) { ctx.beginPath(); ctx.arc(px, py, 3.5, 0, TAU); ctx.fill(); }
    }
  }
  if (m.id === 'ship') {
    ctx.strokeStyle = 'rgba(90,55,30,.28)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = 10; y < H; y += 20) { ctx.moveTo(DECK_X0, y + .5); ctx.lineTo(DECK_X1, y + .5); }
    for (let y = 10, i = 0; y < H; y += 20, i++) for (let x = DECK_X0 + (i % 3) * 53; x < DECK_X1; x += 160) { ctx.moveTo(x + .5, y); ctx.lineTo(x + .5, y + 20); }
    ctx.stroke();
    // Wasser links und rechts, mit Wellen
    for (const [x0, x1] of [[0, DECK_X0 - 8], [DECK_X1 + 8, W]]) {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, '#2B6F9E'); g.addColorStop(1, '#1F5A85');
      ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, H);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let y = 12; y < H; y += 26) for (let x = x0 + 6; x < x1 - 14; x += 26) {
        const o = Math.sin(S.t * 1.6 + y * 0.1 + x) * 3, yy = y + ((x / 26) % 2) * 12;
        ctx.moveTo(x, yy + o); ctx.quadraticCurveTo(x + 6, yy - 4 + o, x + 12, yy + o);
      }
      ctx.stroke();
    }
    // Reling
    for (const x of [DECK_X0 - 8, DECK_X1]) {
      ctx.fillStyle = '#6B4428'; ctx.fillRect(x, 0, 8, H);
      ctx.fillStyle = '#8A5A34'; for (let y = 10; y < H; y += 34) ctx.fillRect(x - 1, y, 10, 6);
    }
  }
  if (m.id === 'desert') {
    ctx.strokeStyle = 'rgba(160,110,50,.22)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let y = 18; y < H; y += 26) { ctx.moveTo(0, y); for (let x = 0; x <= W; x += 20) ctx.quadraticCurveTo(x + 10, y + ((x / 20) % 2 ? 4 : -4), x + 20, y); }
    ctx.stroke();
  }
  if (m.carousels) {
    for (const c of m.carousels) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(F.carA);
      for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? 'rgba(232,64,90,.55)' : 'rgba(255,246,230,.7)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, c.r, i * TAU / 12, (i + 1) * TAU / 12); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#A8404E'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, c.r, 0, TAU); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.fillStyle = ['#F4CF63', '#6FB8F0', '#5FBE90'][i % 3]; ctx.beginPath(); ctx.ellipse(Math.cos(a) * c.r * 0.68, Math.sin(a) * c.r * 0.68, 7, 4, a + Math.PI / 2, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  if (m.id === 'city') {
    const [y0, y1] = m.road;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(0, y0, W, y1 - y0);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; for (let x = 8; x < W; x += 40) ctx.fillRect(x, (y0 + y1) / 2 - 1.5, 22, 3);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; for (let y = y0 + 6; y < y1 - 4; y += 12) ctx.fillRect(228, y, 24, 7);
    ctx.fillStyle = 'rgba(160,170,190,.35)'; ctx.fillRect(0, y0 - 3, W, 3); ctx.fillRect(0, y1, W, 3);
  }
  if (m.id === 'library') {
    ctx.fillStyle = 'rgba(120,30,40,.22)'; ctx.fillRect(150, 170, 180, 140);
    ctx.strokeStyle = 'rgba(244,207,99,.25)'; ctx.lineWidth = 2; ctx.strokeRect(156, 176, 168, 128);
  }
  // Spiegelsaal: die Lichtstrahlen, aussen weich, innen grell
  if (m.beams && !on('eclipse')) {
    ctx.save(); ctx.lineCap = 'round';
    for (const [wd, col] of [[BEAM_W * 3.2, 'rgba(255,236,160,.18)'], [BEAM_W * 1.8, 'rgba(255,240,180,.55)'], [BEAM_W * 0.7, 'rgba(255,255,245,.95)']]) {
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath();
      for (const b of F.beams) { ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); }
      ctx.stroke();
    }
    ctx.restore();
  }
  if (m.lowG) {
    for (const d of S.deco) {
      ctx.fillStyle = 'rgba(60,66,84,.18)'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 16 * d.s, 11 * d.s, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(d.x, d.y + 1, 16 * d.s, 11 * d.s, 0, 0.2, Math.PI - 0.2); ctx.stroke();
    }
  }
}

// Säulen der neuen Karten; false heisst: normal zeichnen
function drawPillarFx(r) {
  if (r.doomed && Math.floor(r.crumble * 8) % 2 === 0) return false;
  if (r.glass > 0) return false;
  const g = r.grow > 0 ? 1 - r.grow / 0.4 : 1, cx = pcx(r), cy = pcy(r), w = r.w * g, h = r.h * g, x = cx - w / 2, y = cy - h / 2;
  if (r.shelf) {
    ctx.fillStyle = COL.top; ctx.fillRect(x, y, w, h);
    const horiz = w > h, n = Math.floor((horiz ? w : h) / 7);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = ['#8E2F2A', '#2F5A7A', '#C98A1B', '#3F6B3A', '#6B3F7A'][(i * 7 + Math.floor(r.x)) % 5];
      if (horiz) ctx.fillRect(x + 3 + i * 7, y + 3, 5, h - 6); else ctx.fillRect(x + 3, y + 3 + i * 7, w - 6, 5);
    }
    ctx.strokeStyle = COL.edge; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    return true;
  }
  if (r.books) {
    if (r.life < 1.5 && Math.floor(r.life * 8) % 2 === 0) return true;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = ['#8E2F2A', '#2F5A7A', '#C98A1B', '#3F6B3A'][i];
      ctx.save(); ctx.translate(cx, cy - 6 + i * 4); ctx.rotate(Math.sin(r.ph + i * 1.7) * 0.18); ctx.fillRect(-w / 2 + 1, -2, w - 2, 5); ctx.restore();
    }
    return true;
  }
  if (r.cactus) {
    const rr = w / 2;
    ctx.fillStyle = COL.top; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.edge; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - rr + 2, cy); ctx.lineTo(cx + rr - 2, cy); ctx.moveTo(cx, cy - rr + 2); ctx.lineTo(cx, cy + rr - 2); ctx.stroke();
    ctx.fillStyle = '#F08AB0'; ctx.beginPath(); ctx.arc(cx + 2, cy - 2, 2, 0, TAU); ctx.fill();
    return true;
  }
  if (r.rock) {
    ctx.fillStyle = '#9A6B45'; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(cx - w * 0.15, cy - h * 0.18, w * 0.25, h * 0.18, 0, 0, TAU); ctx.fill();
    return true;
  }
  if (r.boulder) {
    const rr = w / 2;
    ctx.fillStyle = COL.top; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; for (const [ox, oy, s] of [[0.3, 0.2, 0.22], [-0.25, -0.1, 0.16], [0.05, -0.4, 0.12]]) { ctx.beginPath(); ctx.arc(cx + ox * rr, cy + oy * rr, s * rr, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(cx - rr * 0.35, cy - rr * 0.35, rr * 0.35, 0, TAU); ctx.fill();
    return true;
  }
  if (r.crate) {
    ctx.fillStyle = '#9A6436'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#5B3A22'; ctx.lineWidth = 2.5; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + w - 3, y + h - 3); ctx.moveTo(x + w - 3, y + 3); ctx.lineTo(x + 3, y + h - 3); ctx.stroke();
    return true;
  }
  if (r.mast || r.hub || r.pole) {
    const rr = w / 2;
    ctx.fillStyle = r.mast ? '#4A2E1A' : r.hub ? '#5B6376' : '#C9A227'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, rr - 3, 0, TAU); ctx.stroke();
    return true;
  }
  if (r.booth) {
    ctx.fillStyle = COL.top; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h * 0.45); ctx.clip();
    for (let i = 0; i < w; i += 10) { ctx.fillStyle = (i / 10) % 2 ? '#FFF6E6' : '#E8405A'; ctx.fillRect(x + i, y, 10, h * 0.45); }
    ctx.restore();
    ctx.strokeStyle = COL.edge; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    return true;
  }
  if (r.building) {
    ctx.fillStyle = COL.top; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = COL.edge; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const lit = ((Math.floor(r.x) + i * 3 + j * 5) % 4) === 0;
      ctx.fillStyle = lit ? 'rgba(244,216,142,.8)' : 'rgba(0,0,0,.3)';
      ctx.fillRect(x + 6 + i * (w - 12) / 3, y + 6 + j * (h - 12) / 3, (w - 12) / 3 - 5, (h - 12) / 3 - 5);
    }
    return true;
  }
  if (r.bench) {
    ctx.fillStyle = '#8A5A2B'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#5B3A1A'; for (let i = 4; i < w; i += 10) ctx.fillRect(x + i, y + 2, 2, h - 4);
    return true;
  }
  return false;
}

// Über den Säulen: Züge, Segel, Dünen, Riesenrad, Autos, Laternen, Leuchter, Erde
function drawMapTop() {
  const m = S.map, F = S.fx;
  if (F.trains) for (const T of F.trains) {
    for (const x of [8, W - 8]) {
      const warn = T.warn > 0 || !!T.train;
      ctx.fillStyle = '#20242E'; ctx.beginPath(); ctx.arc(x, T.y - m.trackH / 2 - 10, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = warn && Math.floor(S.t * 8) % 2 === 0 ? '#FF4B4B' : warn ? '#7A1F1F' : '#3A8F5A';
      ctx.beginPath(); ctx.arc(x, T.y - m.trackH / 2 - 10, 3.5, 0, TAU); ctx.fill();
    }
    if (!T.train) continue;
    for (const r of carRects(T.train)) {
      ctx.fillStyle = 'rgba(20,24,33,.3)'; ctx.fillRect(r.x + 3, r.y + 4, r.w, r.h);
      ctx.fillStyle = T.train.col; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(r.x, r.y, r.w, 6);
      ctx.fillStyle = '#CFE6FF'; for (let wx = r.x + 8; wx < r.x + r.w - 10; wx += 16) ctx.fillRect(wx, r.y + 10, 10, 9);
      if (r.i === 0) { ctx.fillStyle = '#FFF6D0'; const fxp = T.train.dir > 0 ? r.x + r.w - 4 : r.x; ctx.fillRect(fxp, r.y + 5, 4, 5); ctx.fillRect(fxp, r.y + 20, 4, 5); }
    }
  }
  if (m.id === 'ship') for (const M of F.masts) {
    // Grosses Segel am Mast, kleines Topsegel darüber
    const sail = (y, w, h, yard) => {
      ctx.strokeStyle = '#4A2E1A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(M.x - yard, y); ctx.lineTo(M.x + yard, y); ctx.stroke();
      ctx.fillStyle = 'rgba(248,242,226,' + (0.6 + 0.35 * M.open) + ')'; ctx.strokeStyle = '#B8A888'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(M.x - w / 2, y - h / 2); ctx.quadraticCurveTo(M.x, y - h / 2 - 9 * M.open * Math.sin(S.t * 1.3 + M.ph), M.x + w / 2, y - h / 2);
      ctx.lineTo(M.x + w / 2, y + h / 2); ctx.quadraticCurveTo(M.x, y + h / 2 + 7 * M.open, M.x - w / 2, y + h / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    if (M.big) {
      sail(M.y, 26 + 200 * M.open, 20, 108);
      sail(M.y - 33, 20 + 120 * M.open, 14, 66);
      ctx.strokeStyle = '#4A2E1A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M.x, M.y); ctx.lineTo(M.x, M.y - 33); ctx.stroke();
    } else sail(M.y, 22 + 150 * M.open, 16, 80);
    ctx.fillStyle = '#4A2E1A'; ctx.beginPath(); ctx.arc(M.x, M.y, 5, 0, TAU); ctx.fill();
  }
  if (m.beams) {
    for (const M of F.mirrors) {
      const [x1, y1, x2, y2] = mirrorEnds(M);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#4B4466'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const g = ctx.createLinearGradient(x1, y1, x2, y2); g.addColorStop(0, '#AAB6CA'); g.addColorStop(0.5, '#FFFFFF'); g.addColorStop(1, '#CFD8E6');
      ctx.strokeStyle = g; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = '#6B5C8E'; ctx.beginPath(); ctx.arc(M.x, M.y, 4, 0, TAU); ctx.fill();
    }
    // Lichtwerfer an den Wänden; noch nicht aktive bleiben grau
    const n = Math.min(EMITTERS.length, 4 + Math.floor(S.level / 3));
    EMITTERS.forEach((E, i) => {
      ctx.save(); ctx.translate(Math.max(8, Math.min(W - 8, E.x)), Math.max(8, Math.min(H - 8, E.y))); ctx.rotate(E.cur ?? E.a);
      ctx.fillStyle = '#2B2F3A'; ctx.fillRect(-9, -8, 16, 16);
      ctx.fillStyle = i < n ? '#FFF3C4' : '#5B6376'; ctx.beginPath(); ctx.arc(7, 0, 5, 0, TAU); ctx.fill();
      ctx.restore();
    });
  }
  if (m.id === 'desert') for (const d of F.dunes) {
    const g = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 2, d.x, d.y, d.r);
    g.addColorStop(0, '#F8DFA2'); g.addColorStop(0.7, '#E9C27A'); g.addColorStop(1, 'rgba(214,170,98,.6)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.85, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,110,50,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(d.x + d.r * 0.2, d.y + d.r * 0.2, d.r * 0.6, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  }
  if (m.wheel) {
    const Wh = m.wheel;
    ctx.strokeStyle = 'rgba(90,96,112,.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(Wh.x, Wh.y, Wh.r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = F.wheelA + i * TAU / 8; ctx.moveTo(Wh.x, Wh.y); ctx.lineTo(Wh.x + Math.cos(a) * Wh.r, Wh.y + Math.sin(a) * Wh.r); }
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = F.wheelA + i * TAU / 8, x = Wh.x + Math.cos(a) * Wh.r, y = Wh.y + Math.sin(a) * Wh.r;
      ctx.fillStyle = ['#E8405A', '#F4CF63', '#6FB8F0', '#5FBE90'][i % 4]; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - 6, y - 4, 12, 4);
    }
  }
  if (m.id === 'city') {
    for (const c of F.cars) {
      const gl = ctx.createRadialGradient(c.x + c.dir * 26, c.y, 1, c.x + c.dir * 26, c.y, 16);
      gl.addColorStop(0, 'rgba(255,255,230,.9)'); gl.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(c.x + c.dir * 26, c.y, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = c.col; ctx.fillRect(c.x - 23, c.y - 11, 46, 22);
      ctx.fillStyle = 'rgba(20,24,40,.75)'; ctx.fillRect(c.x - 8 + c.dir * 4, c.y - 9, 16, 18);
      ctx.fillStyle = '#FF4B4B'; ctx.fillRect(c.x - c.dir * 23 - 1.5, c.y - 9, 3, 5); ctx.fillRect(c.x - c.dir * 23 - 1.5, c.y + 4, 3, 5);
    }
    for (const l of F.lamps) {
      const flick = l.st === 'warn' && Math.floor(S.t * 12 + l.ph) % 3 === 0;
      if (l.st === 'on' || flick) {
        const g = ctx.createRadialGradient(l.x, l.y, 1, l.x, l.y, 24);
        g.addColorStop(0, 'rgba(255,236,170,.95)'); g.addColorStop(1, 'rgba(255,220,140,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, 24, 0, TAU); ctx.fill();
      }
      if (l.st === 'warn') { ctx.strokeStyle = 'rgba(255,220,140,' + (0.35 + 0.3 * Math.sin(S.t * 20)) + ')'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.84, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = '#12151F'; ctx.beginPath(); ctx.arc(l.x, l.y, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = l.st === 'on' ? '#FFF1C2' : l.st === 'warn' ? (flick ? '#FFE08A' : '#5A5238') : '#3A3E4A';
      ctx.beginPath(); ctx.arc(l.x, l.y, 3.5, 0, TAU); ctx.fill();
    }
  }
  if (m.id === 'library') {
    for (const f of F.falls) {
      ctx.strokeStyle = 'rgba(232,102,79,' + (0.5 + 0.4 * Math.sin(S.t * 22)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.strokeRect(f.x - 14, f.y - 11, 28, 22); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(232,102,79,.25)'; const k = 1 - f.warn / 1.3; ctx.fillRect(f.x - 14 * k, f.y - 11 * k, 28 * k, 22 * k);
    }
    const C = F.chand;
    ctx.strokeStyle = 'rgba(40,30,20,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(W / 2, -10); ctx.lineTo(C.x, C.y); ctx.stroke();
    ctx.strokeStyle = '#C9A227'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(C.x, C.y, 14, 0, TAU); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + S.t * 0.3, x = C.x + Math.cos(a) * 14, y = C.y + Math.sin(a) * 14;
      ctx.fillStyle = 'rgba(255,214,120,.4)'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFF1C2'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
    }
  }
}

// Himmel: Spiegelsonnen und Erde am Rand
function drawMapSky() {
  const m = S.map;
  if (m.lowG && S.fx.earthW > 0.02) {
    const d = dirOf(earthAz()), k = Math.min((W / 2 - 18) / Math.max(Math.abs(d.x), 1e-6), (H / 2 - 18) / Math.max(Math.abs(d.y), 1e-6));
    const x = W / 2 - d.x * k, y = H / 2 - d.y * k, a = Math.min(1, S.fx.earthW * 2);
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x, y, 4, x, y, 26); g.addColorStop(0, 'rgba(143,199,255,.6)'); g.addColorStop(1, 'rgba(143,199,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2B6FD6'; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5FBE90'; ctx.beginPath(); ctx.ellipse(x - 3, y - 2, 4.5, 3, 0.5, 0, TAU); ctx.ellipse(x + 4, y + 4, 3, 2, -0.3, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Sandsturm: überall Staub, man sieht nur einen kleinen Kreis um die Figur
function drawMapOverlay() {
  const F = S.fx;
  if (S.map.id !== 'desert' || F.haze < 0.01) return;
  const [A] = layers();
  A.globalCompositeOperation = 'source-over'; A.clearRect(0, 0, W, H);
  A.fillStyle = 'rgba(122,86,48,' + (0.92 * F.haze) + ')'; A.fillRect(0, 0, W, H);
  if (F.storm > 0) {
    A.globalCompositeOperation = 'destination-out';
    const g = A.createRadialGradient(S.p.x, S.p.y, 40, S.p.x, S.p.y, 100);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    A.fillStyle = g; A.beginPath(); A.arc(S.p.x, S.p.y, 100, 0, TAU); A.fill();
    A.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(layerA, 0, 0, W, H);
}

// Mehrere Lichtrichtungen: Halbschatten dort, wo nur die Sonne fehlt, Kernschatten, wo alle fehlen
function drawMultiShadow() {
  const ex = extraLights(), wMax = Math.max(...ex.map(L => L.w));
  shadeRegion(shadowPaths(S.az), 1 - wMax, 0);
  ctx.save();
  for (const L of ex) { ctx.beginPath(); shadowPaths(L.az)(); ctx.clip(); }
  shadeRegion(shadowPaths(S.az), 1, 1);
  ctx.restore();
}

// Vorschaubild in der Kartenübersicht: typische Teile jeder Karte
function mapPreviewExtra(c, m, w, h) {
  const u = w / 16;
  c.save();
  switch (m.id) {
    case 'station':
      for (const y of [h * 0.3, h * 0.72]) {
        c.fillStyle = 'rgba(92,70,52,.5)'; for (let x = 0; x < w; x += u) c.fillRect(x, y - u * 0.5, u * 0.45, u);
        c.strokeStyle = '#8A8F9C'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, y - u * 0.25); c.lineTo(w, y - u * 0.25); c.moveTo(0, y + u * 0.25); c.lineTo(w, y + u * 0.25); c.stroke();
      }
      c.fillStyle = '#2F7D5B'; c.fillRect(w * 0.08, h * 0.3 - u * 0.45, w * 0.5, u * 0.9);
      c.fillStyle = '#CFE6FF'; for (let x = w * 0.1; x < w * 0.55; x += u * 1.2) c.fillRect(x, h * 0.3 - u * 0.2, u * 0.6, u * 0.35);
      break;
    case 'ship':
      c.strokeStyle = 'rgba(90,55,30,.35)'; c.lineWidth = 1; c.beginPath(); for (let y = u; y < h; y += u) { c.moveTo(0, y); c.lineTo(w, y); } c.stroke();
      c.fillStyle = '#2B6F9E'; c.fillRect(0, 0, u * 2.2, h); c.fillRect(w - u * 2.2, 0, u * 2.2, h);
      c.fillStyle = '#6B4428'; c.fillRect(u * 2.2, 0, u * 0.3, h); c.fillRect(w - u * 2.5, 0, u * 0.3, h);
      c.fillStyle = 'rgba(248,242,226,.95)'; c.fillRect(w * 0.24, h * 0.2, w * 0.52, u * 0.9); c.fillRect(w * 0.35, h * 0.07, w * 0.3, u * 0.6);
      c.fillStyle = '#4A2E1A'; c.beginPath(); c.arc(w * 0.5, h * 0.2 + u * 0.45, u * 0.35, 0, TAU); c.fill();
      break;
    case 'desert':
      c.fillStyle = '#EBC57E'; c.beginPath(); c.ellipse(w * 0.78, h * 0.3, u * 2, u * 1.6, 0, 0, TAU); c.fill();
      c.fillStyle = '#3F6B3A'; c.beginPath(); c.arc(w * 0.12, h * 0.8, u * 0.45, 0, TAU); c.fill();
      break;
    case 'fair':
      c.strokeStyle = '#5B6376'; c.lineWidth = 1.2; c.beginPath(); c.arc(w * 0.8, h * 0.32, u * 2.2, 0, TAU); c.stroke();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.fillStyle = ['#E8405A', '#F4CF63', '#6FB8F0'][i % 3]; c.beginPath(); c.arc(w * 0.8 + Math.cos(a) * u * 2.2, h * 0.32 + Math.sin(a) * u * 2.2, u * 0.5, 0, TAU); c.fill(); }
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? 'rgba(232,64,90,.6)' : 'rgba(255,246,230,.8)'; c.beginPath(); c.moveTo(w * 0.15, h * 0.82); c.arc(w * 0.15, h * 0.82, u * 1.6, i * TAU / 8, (i + 1) * TAU / 8); c.closePath(); c.fill(); }
      break;
    case 'city': {
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, h * 0.62, w, u * 2.2);
      c.fillStyle = 'rgba(255,255,255,.5)'; for (let x = 0; x < w; x += u * 2) c.fillRect(x, h * 0.62 + u * 1.05, u, u * 0.12);
      const g = c.createRadialGradient(w * 0.82, h * 0.25, 1, w * 0.82, h * 0.25, u * 3.5); g.addColorStop(0, 'rgba(255,236,170,.9)'); g.addColorStop(1, 'rgba(255,220,140,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#D6304F'; c.fillRect(w * 0.55, h * 0.62 + u * 0.3, u * 1.6, u * 0.7);
      break;
    }
    case 'library': {
      const g = c.createRadialGradient(w * 0.6, h * 0.35, 1, w * 0.6, h * 0.35, w * 0.4); g.addColorStop(0, 'rgba(255,220,150,.85)'); g.addColorStop(1, 'rgba(242,180,94,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#4A2E1E'; c.fillRect(w * 0.08, h * 0.15, u * 0.7, h * 0.7);
      for (let i = 0; i < 10; i++) { c.fillStyle = ['#8E2F2A', '#2F5A7A', '#C98A1B'][i % 3]; c.fillRect(w * 0.08 + u * 0.12, h * 0.17 + i * h * 0.066, u * 0.46, h * 0.05); }
      c.strokeStyle = '#C9A227'; c.lineWidth = 1.5; c.beginPath(); c.arc(w * 0.6, h * 0.35, u * 0.6, 0, TAU); c.stroke();
      break;
    }
    case 'mirror':
      c.lineCap = 'round';
      for (const [wd, col] of [[u * 0.9, 'rgba(255,240,180,.35)'], [u * 0.3, '#FFFBEA']]) {
        c.strokeStyle = col; c.lineWidth = wd; c.beginPath();
        c.moveTo(0, h * 0.25); c.lineTo(w * 0.72, h * 0.3); c.lineTo(w * 0.3, h * 0.95); c.moveTo(w, h * 0.7); c.lineTo(w * 0.2, h * 0.6); c.stroke();
      }
      c.strokeStyle = '#EEF2F8'; c.lineWidth = u * 0.35; c.beginPath(); c.moveTo(w * 0.69, h * 0.16); c.lineTo(w * 0.75, h * 0.44); c.stroke();
      break;
    case 'moon':
      c.fillStyle = 'rgba(60,66,84,.2)'; for (const [x, y, r] of [[0.15, 0.2, 1], [0.85, 0.75, 1.2], [0.5, 0.85, 0.7]]) { c.beginPath(); c.ellipse(w * x, h * y, u * r, u * r * 0.7, 0, 0, TAU); c.fill(); }
      c.fillStyle = '#2B6FD6'; c.beginPath(); c.arc(w * 0.88, h * 0.18, u * 0.7, 0, TAU); c.fill();
      c.fillStyle = '#5FBE90'; c.beginPath(); c.arc(w * 0.86, h * 0.16, u * 0.25, 0, TAU); c.fill();
      break;
  }
  c.restore();
}
