'use strict';
// Karten (Innenhöfe): Farben, Säulenformen, Sonderregeln, Fackeln im Keller, Dunkelheit des Nachtmahrs.

const MAPS = [
  { id: 'yard', icon: 'noon', name: ['Innenhof', 'Courtyard'],
    desc: ['Der sonnige Innenhof. Die Sonne wandert im Kreis, Säulen werfen lange Schatten.', 'The sunny courtyard. The sun moves in a circle, pillars cast long shadows.'],
    pal: { lit: '#F4CF63', tile: '#EABF4A', shade: '#3F4C6B', shadeTile: '#394562', top: '#1F2535', edge: '#323B55' } },
  { id: 'garden', icon: 'seed', name: ['Garten', 'Garden'], unlock: { stat: 'maxLevel', n: 4 },
    desc: ['Runde Bäume werfen weiche Schatten. Mehr Tau, aber die Käfer sind flinker.', 'Round trees cast soft shadows. More dew, but the bugs are quicker.'],
    pal: { lit: '#C9DF74', tile: '#B8D064', shade: '#2E5243', shadeTile: '#284A3C', top: '#2F6B3B', edge: '#245830' },
    round: 0.8, dewCap: 5, dewF: 0.7, bugF: 1.2 },
  { id: 'roof', icon: 'wind', name: ['Dach', 'Rooftop'], unlock: { stat: 'bosses', n: 5 },
    desc: ['Der Wind schiebt dich ständig über die Ziegel. Viele Schornsteine, viele Wolken.', 'The wind keeps pushing you across the tiles. Lots of chimneys and clouds.'],
    pal: { lit: '#EFAA76', tile: '#DC9461', shade: '#4B3B55', shadeTile: '#43344C', top: '#3A2D33', edge: '#5A4440' },
    wind: 44, chimneys: true, pillars: 8, cloudF: 0.45 },
  { id: 'cellar', icon: 'flame', name: ['Keller', 'Cellar'], unlock: { stat: 'bosses', n: 12 },
    desc: ['Keine Sonne, nur wandernde Fackeln. Ihr Licht brennt, und Säulen werfen Schatten von ihnen weg.', 'No sun, only wandering torches. Their light burns, and pillars cast shadows away from them.'],
    pal: { lit: '#F2B45E', tile: '#DE9E4A', shade: '#1F1C27', shadeTile: '#27232F', top: '#3E3845', edge: '#524A58' },
    dark: true },
];
const MAP_BY = Object.fromEntries(MAPS.map(m => [m.id, m]));
const SUN_RULES = ['twosun', 'summer', 'night', 'clouds'];
const mapName = m => tr(m.name[0], m.name[1]);
const mapDesc = m => tr(m.desc[0], m.desc[1]);
const mapUnlocked = m => !m.unlock || (P.stats[m.unlock.stat] || 0) >= m.unlock.n;
function mapLockText(m) {
  const u = m.unlock, v = Math.min(P.stats[u.stat] || 0, u.n);
  return (u.stat === 'maxLevel' ? tr('Erreiche Stufe ' + u.n, 'Reach level ' + u.n) : tr('Besiege ' + u.n + ' Bosse', 'Defeat ' + u.n + ' bosses')) + ' · ' + v + '/' + u.n;
}
function applyPalette(m) { Object.assign(COL, m.pal); }
const gameTrack = () => (S && S.map ? S.map.id : 'yard');

// ---------- Säulenformen: eckig (Säule, Schornstein) oder rund (Baum) ----------
function newPillarShape() {
  const m = S.map;
  if (m.round && rng() < m.round) { const d = rand(36, 60); return { w: d, h: d, round: true }; }
  if (m.chimneys) return { w: rand(22, 40), h: rand(22, 40), chimney: true };
  return { w: rand(28, 64), h: rand(28, 64) };
}
const pcx = r => r.x + r.w / 2, pcy = r => r.y + r.h / 2;
function pillarContains(r, x, y, pad) {
  if (r.round) return Math.hypot(x - pcx(r), y - pcy(r)) < r.w / 2 + pad;
  return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
}
// Wie weit läuft ein Strahl ab (x, y) in Richtung (ux, uy), bis er die Säule trifft? Infinity, wenn nie.
function pillarEnter(r, x, y, ux, uy) {
  if (r.round) {
    const ox = x - pcx(r), oy = y - pcy(r), rr = r.w / 2;
    const b = ox * ux + oy * uy, c = ox * ox + oy * oy - rr * rr;
    if (c <= 0) return 0;
    const disc = b * b - c;
    if (disc < 0) return Infinity;
    const t = -b - Math.sqrt(disc);
    return t >= 0 ? t : Infinity;
  }
  let tmin = 0, tmax = Infinity;
  for (const [p, u, lo, hi] of [[x, ux, r.x, r.x + r.w], [y, uy, r.y, r.y + r.h]]) {
    if (Math.abs(u) < 1e-9) { if (p < lo || p > hi) return Infinity; }
    else {
      let t1 = (lo - p) / u, t2 = (hi - p) / u;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}
function pillarOutline(r) {
  if (!r.round) return [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
  const pts = [], cx = pcx(r), cy = pcy(r), rr = r.w / 2;
  for (let i = 0; i < 16; i++) { const a = i * TAU / 16; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return pts;
}
function pushOut(r, r0) {
  if (r.round) {
    const cx = pcx(r), cy = pcy(r), rr = r.w / 2 + r0, dx = S.p.x - cx, dy = S.p.y - cy, d = Math.hypot(dx, dy);
    if (d < rr) { if (d > 0.001) { S.p.x = cx + dx / d * rr; S.p.y = cy + dy / d * rr; } else S.p.y = cy - rr; }
    return;
  }
  const nx = Math.max(r.x, Math.min(S.p.x, r.x + r.w)), ny = Math.max(r.y, Math.min(S.p.y, r.y + r.h));
  const dx = S.p.x - nx, dy = S.p.y - ny, d = Math.hypot(dx, dy);
  if (d < r0) {
    if (d > 0.001) { S.p.x = nx + dx / d * r0; S.p.y = ny + dy / d * r0; }
    else S.p.y = r.y - r0;
  }
}

// ---------- Kartenzustand ----------
function initMap() {
  const m = S.map;
  S.roofA = rand(0, TAU); S.gust = 0;
  S.torches = [];
  if (m.dark) for (let i = 0; i < 3; i++) S.torches.push(newTorch(i));
  // Dekor: Blumen im Garten, Risse im Keller (nur optisch)
  S.deco = [];
  const n = m.id === 'garden' ? 26 : m.id === 'cellar' ? 14 : 0;
  for (let i = 0; i < n; i++) S.deco.push({ x: fx(8, W - 8), y: fx(8, H - 8), k: Math.floor(fx(0, 3)), s: fx(0.7, 1.2) });
}
// Fackeln wandern auf verschlungenen Bahnen quer durch den Keller, auch durch die Mitte. Es gibt keinen Platz, der immer dunkel bleibt.
function newTorch(i) {
  const T = { s: 0, dir: i % 2 ? 1 : -1, r: 150, ph: fx(0, 6), x: 0, y: 0,
              wx: 1 + (i % 3) * 0.35, wy: 1.3 + ((i + 1) % 3) * 0.3, px: i * 2.1, py: i * 1.3 + 0.7 };
  // nicht direkt neben der Figur anfangen
  for (let k = 0; k < 40; k++) { T.s = fx(0, 40); torchPos(T); if (!S.p || Math.hypot(T.x - S.p.x, T.y - S.p.y) > 210) break; }
  return T;
}
function torchPos(T) {
  const a = W / 2 - 22;
  T.x = W / 2 + a * Math.sin(T.wx * T.s + T.px);
  T.y = H / 2 + a * Math.sin(T.wy * T.s + T.py);
}
function updateMap(dt, sunDt, playing) {
  const m = S.map;
  if (m.dark) {
    const want = 3 + (S.level >= 3 ? 1 : 0) + (S.level >= 6 ? 1 : 0);
    while (S.torches.length < want) S.torches.push(newTorch(S.torches.length));
    for (const T of S.torches) { T.s += T.dir * (0.13 + lv() * 0.018) * sunDt; torchPos(T); }
  }
  if (m.wind) {
    S.roofA += dt * 0.12;
    S.gust = 0.6 + 0.4 * Math.sin(S.t * 0.7) * Math.sin(S.t * 0.23 + 1);
    if (playing && !S.dash) {
      const f = m.wind * S.gust;
      S.p.x += Math.cos(S.roofA) * f * dt; S.p.y += Math.sin(S.roofA) * f * dt;
    }
    if (Math.random() < dt * 12) S.parts.push({ x: fx(0, W), y: fx(0, H), vx: Math.cos(S.roofA) * 260, vy: Math.sin(S.roofA) * 260, life: 0.3, streak: true });
  }
}
// Licht im Keller: nur innerhalb eines Fackelscheins, wenn keine Säule dazwischen steht
function torchLight(px, py) {
  if (on('eclipse')) return 0;
  for (const T of S.torches) {
    const dx = px - T.x, dy = py - T.y, d = Math.hypot(dx, dy);
    if (d < T.r * 0.84 && d > 0.1 && rayLen(T.x, T.y, Math.atan2(dy, dx), d) >= d - 1) return 1;
  }
  return 0;
}
const duskDark = () => !!(S.boss && S.boss.type === 'dusk' && S.boss.enter <= 0);
const eaterAura = () => S.boss && S.boss.type === 'eater' && S.boss.enter <= 0 ? S.boss : null;

// ---------- Zeichnen: Fackellicht, Dekor, Säulen, Dunkelheit ----------
let layerA = null, layerB = null;
function layers() {
  if (!layerA) {
    layerA = document.createElement('canvas'); layerA.width = W; layerA.height = H;
    layerB = document.createElement('canvas'); layerB.width = W; layerB.height = H;
  }
  return [layerA.getContext('2d'), layerB.getContext('2d')];
}
function gridPath(c, color) {
  c.strokeStyle = color; c.lineWidth = 1; c.beginPath();
  for (let i = CELL; i < W; i += CELL) { c.moveTo(i + .5, 0); c.lineTo(i + .5, H); c.moveTo(0, i + .5); c.lineTo(W, i + .5); }
  c.stroke();
}
function drawTorchLight() {
  if (on('eclipse')) return;
  const [A, B] = layers();
  A.globalCompositeOperation = 'source-over';
  A.clearRect(0, 0, W, H);
  for (const T of S.torches) {
    B.globalCompositeOperation = 'source-over'; B.clearRect(0, 0, W, H);
    const R = T.r + Math.sin(S.t * 9 + T.ph) * 4 + Math.sin(S.t * 23 + T.ph) * 2;
    const g = B.createRadialGradient(T.x, T.y, 4, T.x, T.y, R);
    g.addColorStop(0, 'rgba(255,220,150,1)'); g.addColorStop(0.6, 'rgba(242,180,94,1)');
    g.addColorStop(0.84, 'rgba(236,166,80,0.75)'); g.addColorStop(1, 'rgba(236,166,80,0)');
    B.fillStyle = g; B.beginPath(); B.arc(T.x, T.y, R, 0, TAU); B.fill();
    B.globalCompositeOperation = 'source-atop'; gridPath(B, 'rgba(150,92,30,.35)');
    B.globalCompositeOperation = 'destination-out'; B.fillStyle = '#000'; B.beginPath();
    for (const r of S.pillars) {
      if (r.glass > 0) continue;
      const pts = pillarOutline(r);
      const far = pts.map(([x, y]) => { const dx = x - T.x, dy = y - T.y, d = Math.hypot(dx, dy) || 1; return [x + dx / d * 700, y + dy / d * 700]; });
      const h = hull(pts.concat(far));
      B.moveTo(h[0][0], h[0][1]); for (let i = 1; i < h.length; i++) B.lineTo(h[i][0], h[i][1]); B.closePath();
    }
    B.fill();
    A.drawImage(layerB, 0, 0);
  }
  ctx.drawImage(layerA, 0, 0, W, H);
}
function drawDeco() {
  const m = S.map;
  if (m.id === 'garden') {
    for (const d of S.deco) {
      ctx.fillStyle = ['#F2F4F8', '#F08AB0', '#FFE36B'][d.k];
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ctx.beginPath(); ctx.arc(d.x + Math.cos(a) * 2.6 * d.s, d.y + Math.sin(a) * 2.6 * d.s, 1.8 * d.s, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#E8A92A'; ctx.beginPath(); ctx.arc(d.x, d.y, 1.4 * d.s, 0, TAU); ctx.fill();
    }
  } else if (m.id === 'roof') {
    ctx.strokeStyle = 'rgba(120,60,40,.18)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = CELL / 2; y < H; y += CELL) for (let x = (Math.round(y / CELL) % 2 ? 0 : CELL / 2) - CELL; x < W; x += CELL) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + CELL / 4, y + 6, x + CELL / 2, y); }
    ctx.stroke();
  } else if (m.id === 'cellar') {
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (const d of S.deco) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 9 * d.s, d.y + 4 * d.s); ctx.lineTo(d.x + 14 * d.s, d.y - 3 * d.s); }
    ctx.stroke();
  }
}
function drawPillar(r) {
  const blink = r.doomed && Math.floor(r.crumble * 8) % 2 === 0;
  const g = r.grow > 0 ? 1 - r.grow / 0.4 : 1;
  const cx = pcx(r), cy = pcy(r), w = r.w * g, h = r.h * g;
  const glass = r.glass > 0 && !(r.glass < 1 && Math.floor(r.glass * 10) % 2);
  if (r.round) {
    const rr = w / 2;
    ctx.fillStyle = 'rgba(20,30,20,.25)'; ctx.beginPath(); ctx.arc(cx + 2, cy + 3, rr, 0, TAU); ctx.fill();
    ctx.fillStyle = blink ? COL.warn : glass ? 'rgba(200,240,200,.5)' : COL.top;
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) { const a = i * TAU / 18, k = rr * (0.9 + 0.1 * Math.sin(i * 2.7 + cx)); ctx.lineTo(cx + Math.cos(a) * k, cy + Math.sin(a) * k); }
    ctx.fill();
    if (!glass && !blink && rr > 6) {
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      ctx.beginPath(); ctx.arc(cx - rr * 0.3, cy - rr * 0.3, rr * 0.45, 0, TAU); ctx.fill();
      ctx.fillStyle = COL.edge;
      for (const [ox, oy] of [[0.35, 0.1], [-0.1, 0.4], [0.1, -0.35]]) { ctx.beginPath(); ctx.arc(cx + ox * rr, cy + oy * rr, rr * 0.18, 0, TAU); ctx.fill(); }
    }
    return;
  }
  ctx.fillStyle = blink ? COL.warn : glass ? 'rgba(190,225,255,.55)' : COL.top;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.strokeStyle = glass ? '#8FC7EE' : COL.edge; ctx.lineWidth = 3;
  if (w > 8) ctx.strokeRect(cx - w / 2 + 3, cy - h / 2 + 3, w - 6, h - 6);
  if (r.chimney && !glass && !blink && w > 14 && h > 14) {
    ctx.fillStyle = '#15100F'; ctx.fillRect(cx - w / 2 + 7, cy - h / 2 + 7, w - 14, h - 14);
    if (S.mode === 'play' && Math.random() < 0.05) S.parts.push({ x: cx + fx(-4, 4), y: cy, vx: fx(-6, 6) + Math.cos(S.roofA || 0) * 25, vy: fx(-26, -14) + Math.sin(S.roofA || 0) * 25, life: fx(0.8, 1.4), smoke: true });
  }
}
function drawTorches() {
  for (const T of S.torches) {
    ctx.fillStyle = '#2A2530'; ctx.beginPath(); ctx.arc(T.x, T.y, 6, 0, TAU); ctx.fill();
    if (on('eclipse')) continue;
    const g = ctx.createRadialGradient(T.x, T.y, 1, T.x, T.y, 22);
    g.addColorStop(0, 'rgba(255,230,160,.9)'); g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(T.x, T.y, 22, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(T.x, T.y - 5); ctx.scale(0.55 + Math.sin(S.t * 14 + T.ph) * 0.05, 0.6 + Math.sin(S.t * 11 + T.ph) * 0.07); icon(ctx, 'flame'); ctx.restore();
  }
}
function drawWindVane() {
  if (!S.map.wind) return;
  ctx.save(); ctx.translate(W - 30, 52);
  ctx.fillStyle = 'rgba(20,24,33,.55)'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
  ctx.rotate(S.roofA); ctx.strokeStyle = '#FFFFFF'; ctx.fillStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const k = 5 + S.gust * 4;
  ctx.beginPath(); ctx.moveTo(-k, 0); ctx.lineTo(k, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(k + 4, 0); ctx.lineTo(k - 2, -4); ctx.lineTo(k - 2, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// Dunkelheit des Nachtmahrs: nur rund um die Figur, Käfer, Kugeln und Lichtflecken sieht man etwas.
function drawDarkness() {
  const [A] = layers();
  A.globalCompositeOperation = 'source-over';
  A.clearRect(0, 0, W, H);
  A.fillStyle = 'rgba(7,7,20,0.93)'; A.fillRect(0, 0, W, H);
  A.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, k) => {
    const g = A.createRadialGradient(x, y, r * k, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    A.fillStyle = g; A.beginPath(); A.arc(x, y, r, 0, TAU); A.fill();
  };
  hole(S.p.x, S.p.y, 125, 0.45);
  for (const s of S.spots) hole(s.x, s.y, s.r * 1.5, 0.6);
  for (const b of S.bugs) hole(b.x, b.y, 20, 0.2);
  for (const s of S.shots) hole(s.x, s.y, 16, 0.2);
  if (S.lens) hole(S.lens.x, S.lens.y, S.lens.r * 1.3, 0.6);
  if (S.boss) hole(S.boss.x, S.boss.y, 60, 0.3);
  if (!on('eclipse')) for (const T of S.torches) hole(T.x, T.y, 40, 0.3);
  A.globalCompositeOperation = 'source-over';
  ctx.drawImage(layerA, 0, 0, W, H);
}
