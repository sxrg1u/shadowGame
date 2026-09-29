'use strict';
// Spielwelt, Bosse, Chaos-Rad, Hilfsmittel, Upgrades, Spielschleife

// ---------- Spielwelt ----------
function overlaps(a, b, pad) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}
function makePillar(list, avoid) {
  for (let k = 0; k < 200; k++) {
    const w = rand(28, 64), h = rand(28, 64);
    const r = { x: rand(28, W - 28 - w), y: rand(28, H - 28 - h), w, h, crumble: 0 };
    if (list.some(o => overlaps(r, o, 44))) continue;
    if (avoid && avoid.x > r.x - 36 && avoid.x < r.x + w + 36 && avoid.y > r.y - 36 && avoid.y < r.y + h + 36) continue;
    return r;
  }
  return null;
}
const inPillar = (x, y, pad) => S.pillars.some(r => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad);

let S;
function reset(mode, cfg) {
  cfg = cfg || { mode: 'menu' };
  S = { mode, cfg, rule: cfg.rule || null, diff: DIFF[cfg.diff] || DIFF.normal, up: {}, upList: [],
        t: 0, sunT: 0, az: rand(0, TAU), pillars: [], p: { x: W / 2, y: H / 2 },
        energy: 100, score: 0, level: 0, levelIn: 12, grace: 1.5, hearts: 0,
        dews: [], dewIn: 2, items: [], itemIn: 2.5, bugs: [], bugIn: 4, hot: [], hotIn: 3.5,
        clouds: [], cloudIn: 2, lens: null, lensIn: 6, noonF: 1, eventIn: 6, banner: null,
        E: {}, wind: { x: 0, y: 0 }, puddles: [], honey: [], meteors: [], beam: null, magpies: [], portals: null, portalCd: 0,
        combo: 0, comboT: 0, hurt: 0, shake: 0, parts: [], msg: null, target: null, burn: 0, lit: false, litWas: true,
        bubble: 0, inv: 0, dash: null, dashCd: 0, dashMax: 1.1, charges: 1, face: { x: 1, y: 0 }, trailT: 0, shieldMax: 5, shieldGen: 20,
        boss: null, shots: [], lasers: [], bossKills: 0, bossClean: true,
        saws: [], missiles: [], vortex: null, decoy: null, lucky: 0,
        run: { hits: 0, newAch: [], newItems: [], dailyDone: false }, closeArmed: false, beatT: 0,
        pickT: 0, winT: 0, duelWinT: 0, incoming: [], countT: 0, countShown: 0 };
  S.energy = maxEnergy();
  if (ruleOn('rush')) S.levelIn = 6;
  if (ruleOn('night')) S.lensIn = 3;
  const c = { x: W / 2, y: H / 2 };
  for (let i = 0; i < 6; i++) { const r = makePillar(S.pillars, c); if (r) S.pillars.push(r); }
  if (mode === 'ready') {
    S.clouds.push({ x: 140, y: 330, vx: 18, rx: 62, ry: 40 });
    S.items.push({ x: 120, y: 110, kind: 'magnet', life: 1e9 }, { x: 360, y: 200, kind: 'shroom', life: 1e9 }, { x: 300, y: 380, kind: 'star', life: 1e9 });
    S.bugs.push({ x: 60, y: 60, life: 1e9, ph: 1 });
    S.boss = { type: 'prisma', name: 'Prisma', x: 390, y: 110, r: 26, hp: 5, maxHp: 5, inv: 0, t: 0, enter: 0, time: 35, maxTime: 35, state: 'move' };
    S.lasers.push({ x: 390, y: 110, a: 2.6, len: 700, warn: 0, life: 1e9, spin: 0, owner: S.boss });
  }
  hud();
}

const on = k => (S.E[k] || 0) > 0;
const ruleOn = id => S.rule === id;
const up = k => S.up[k] || 0;
const lv = () => Math.min(S.level, 14);
const isDuel = () => !!(S && S.cfg.duel);
const omega = () => (0.3 + lv() * 0.05) * (ruleOn('clouds') ? 1.6 : 1);
const shadowLen = () => (95 + 45 * Math.sin(S.sunT * 0.35)) * S.noonF * (1 + 0.2 * up('longshadow')) * (ruleOn('summer') ? 0.65 : ruleOn('night') ? 1.4 : 1);
const dirOf = az => ({ x: Math.cos(az), y: Math.sin(az) });
const az2 = () => S.az + 2.3;
const sun2On = () => on('sun2') || ruleOn('twosun');
const pr = () => (on('shrink') || ruleOn('tiny')) ? 5 : PR;
const inverted = () => on('invert') || ruleOn('mirror');
const maxEnergy = () => ruleOn('glass') ? 60 : 100;
const maxHearts = () => ruleOn('glass') ? 0 : 2 + up('heart');
const lingerF = () => 1 + 0.5 * up('linger');
const comboMax = () => up('combo') ? 8 : 5;
const mult = () => (on('star') ? 2 : 1) * S.diff.pts * (1 + 0.25 * up('greed')) * (ruleOn('glass') ? 2 : 1) * (1 + 0.1 * Math.floor(S.level / 5));
const pts = n => Math.round(n * mult());
const dashCdMax = () => on('dashy') ? 0.2 : ruleOn('dashfever') ? 0.25 : 1.1 * Math.pow(0.78, up('dashcd'));
const maxCharges = () => 1 + up('twin');

function shadowFrom(px, py, az) {
  const d = dirOf(az), ux = -d.x, uy = -d.y, L = shadowLen();
  for (const r of S.pillars) {
    if (r.glass > 0) continue;
    let tmin = 0, tmax = L, ok = true;
    for (const [p, u, lo, hi] of [[px, ux, r.x, r.x + r.w], [py, uy, r.y, r.y + r.h]]) {
      if (Math.abs(u) < 1e-9) { if (p < lo || p > hi) { ok = false; break; } }
      else {
        let t1 = (lo - p) / u, t2 = (hi - p) / u;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) { ok = false; break; }
      }
    }
    if (ok) return true;
  }
  return false;
}
// 0 = voller Schatten, 1 = volles Licht. Bei der Regel „Doppelte Sonne“ gibt es auch 0,5.
function lightAt(px, py) {
  if (on('eclipse')) return 0;
  if (S.clouds.some(c => ((px - c.x) / c.rx) ** 2 + ((py - c.y) / c.ry) ** 2 <= 1)) return 0;
  if (S.puddles.some(q => Math.hypot(px - q.x, py - q.y) < q.r)) return 0;
  const a = shadowFrom(px, py, S.az) ? 0 : 1;
  if (!sun2On()) return a;
  const b = shadowFrom(px, py, az2()) ? 0 : 1;
  return ruleOn('twosun') ? (a + b) / 2 : Math.max(a, b);
}
const inShadow = (px, py) => lightAt(px, py) === 0;

function flash(text, color) { S.msg = { text, color, t: 1.6 }; }
function sparks(x, y, color, n) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: fx(-90, 90), vy: fx(-90, 90), life: fx(0.3, 0.6), spark: color }); }
// Treffer: Dash und kurze Unverwundbarkeit schützen, das Blasenschild fängt ab
function hit(amount, text, extra) {
  if (S.dash || S.inv > 0 || S.grace > 0) return false;
  if (S.bubble > 0) {
    S.bubble--; S.inv = 0.5; S.shake = Math.max(S.shake, 0.2);
    sparks(S.p.x, S.p.y, '#6FC3FF', 14);
    flash(S.bubble ? tr('Schild blockt! Noch ', 'Shield blocks! Left: ') + S.bubble : tr('Schild zerbrochen!', 'Shield broken!'), '#6FC3FF');
    Sound.sfx('block');
    return false;
  }
  const dmg = Math.max(1, Math.round(amount * S.diff.dmg * Math.pow(0.8, up('armor'))));
  S.energy -= dmg; S.hurt = 0.4; S.inv = 0.6; S.shake = Math.max(S.shake, 0.3);
  S.run.hits++; stat('hits'); if (S.boss) S.bossClean = false;
  flash(text + ' −' + dmg + (extra || ''), COL.warn);
  Sound.sfx('hurt');
  return true;
}

function resolve() {
  const r0 = pr();
  S.p.x = Math.max(r0, Math.min(W - r0, S.p.x));
  S.p.y = Math.max(r0, Math.min(H - r0, S.p.y));
  for (const r of S.pillars) {
    const nx = Math.max(r.x, Math.min(S.p.x, r.x + r.w)), ny = Math.max(r.y, Math.min(S.p.y, r.y + r.h));
    const dx = S.p.x - nx, dy = S.p.y - ny, d = Math.hypot(dx, dy);
    if (d < r0) {
      if (d > 0.001) { S.p.x = nx + dx / d * r0; S.p.y = ny + dy / d * r0; }
      else S.p.y = r.y - r0;
    }
  }
}
function freeSpot(minFromPlayer, needLight) {
  for (let k = 0; k < 40; k++) {
    const x = rand(22, W - 22), y = rand(22, H - 22);
    if (inPillar(x, y, 10)) continue;
    if (Math.hypot(x - S.p.x, y - S.p.y) < minFromPlayer) continue;
    if (needLight && inShadow(x, y)) continue;
    return { x, y };
  }
  return null;
}
function edgePoint() {
  const side = Math.floor(rand(0, 4));
  return { x: side === 0 ? -12 : side === 1 ? W + 12 : rand(0, W), y: side === 2 ? -12 : side === 3 ? H + 12 : rand(0, H) };
}
// Wie weit kommt ein Strahl, bevor eine Säule ihn stoppt?
function rayLen(x, y, a, maxL) {
  const ux = Math.cos(a), uy = Math.sin(a);
  let bestL = maxL;
  for (const r of S.pillars) {
    if (r.glass > 0) continue;
    let tmin = 0, tmax = bestL, ok = true;
    for (const [p, u, lo, hi] of [[x, ux, r.x, r.x + r.w], [y, uy, r.y, r.y + r.h]]) {
      if (Math.abs(u) < 1e-9) { if (p < lo || p > hi) { ok = false; break; } }
      else {
        let t1 = (lo - p) / u, t2 = (hi - p) / u;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) { ok = false; break; }
      }
    }
    if (ok && tmin < bestL) bestL = tmin;
  }
  return bestL;
}
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ---------- Dash ----------
function dash(tx, ty) {
  if (S.mode !== 'play' || S.dash || S.charges <= 0) return;
  let dx = S.face.x, dy = S.face.y;
  if (tx !== undefined) {
    dx = tx - S.p.x; dy = ty - S.p.y;
    if (inverted()) { dx = -dx; dy = -dy; }
  }
  const d = Math.hypot(dx, dy) || 1;
  S.dash = { t: 0.19 * (1 + 0.3 * up('longdash')), vx: dx / d * 650, vy: dy / d * 650 };
  S.charges--; S.trailT = 0;
  if (S.dashCd <= 0) S.dashCd = S.dashMax = dashCdMax();
  stat('dashes'); Sound.sfx('dash');
}

// ---------- Bosse ----------
const BOSSES = [{ type: 'prisma', name: 'Prisma' }, { type: 'queen', name: 'Käferkönigin' }, { type: 'bull', name: 'Sonnenstier' }];
const CORE = { type: 'core', name: 'Sonnenkern' };
function bossFor(level) {
  if (S.cfg.mode === 'campaign') return level >= 10 ? CORE : BOSSES[(level - 1) % 3];
  return level % 10 === 0 ? CORE : BOSSES[(level - 1) % 3];
}
function spawnBoss(b) {
  b = b || bossFor(S.level);
  const core = b.type === 'core', final = core && S.cfg.mode === 'campaign';
  let hp = core ? 12 + Math.floor(S.level * 0.4) : 3 + Math.floor(S.level * 0.7);
  if (ruleOn('rush')) hp = Math.max(2, hp - 1);
  const time = final ? Infinity : core ? 35 : 20;
  const x = S.p.x < W / 2 ? W - 70 : 70, y = S.p.y < H / 2 ? H - 70 : 70;
  S.boss = { ...b, x, y, r: core ? 30 : 26, hp, maxHp: hp, inv: 0, t: 0, enter: 1, time, maxTime: time, atk: 1.5, phase: 0,
             state: b.type === 'bull' ? 'aim' : 'move', aim: 1.6, tx: S.p.x, ty: S.p.y };
  S.bossClean = true;
  S.banner = { text: (final ? tr('Endboss: ', 'Final boss: ') : 'Boss: ') + b.name, good: false, t: 2.4, head: tr('ACHTUNG', 'WARNING') };
  S.shake = 0.6;
  Sound.sfx('boss'); Sound.music('boss');
}
function defeatBoss(B) {
  const final = B.type === 'core' && S.cfg.mode === 'campaign';
  const p = pts((400 + S.level * 150) * (B.type === 'core' ? 3 : 1));
  S.score += p; S.bossKills++;
  stat('bosses'); stat(B.type);
  if (S.bossClean) stat('cleanBoss');
  if (B.spearHit) stat('spearKill');
  sparks(B.x, B.y, COL.gold, 30); sparks(B.x, B.y, COL.white, 20); S.shake = 0.9;
  S.shots = [];
  if (!final) {
    const cx = Math.max(24, Math.min(W - 24, B.x));
    S.items.push({ x: Math.max(20, cx - 20), y: B.y, kind: S.hearts < maxHearts() ? 'heart' : 'crystal', life: 10 },
                 { x: Math.min(W - 20, cx + 20), y: B.y, kind: pick(['bubble', 'star', 'dashy', 'umbrella', 'frost']), life: 10 });
    const n = makePillar(S.pillars, S.p); if (n) S.pillars.push(n);
  }
  S.boss = null;
  S.banner = { text: tr('Boss besiegt! +', 'Boss defeated! +') + fmt(p), good: true, t: 2.4, head: S.bossClean ? tr('OHNE TREFFER', 'NO HITS TAKEN') : tr('SIEG', 'VICTORY') };
  Sound.sfx('bossDown');
  if (isDuel()) Net.attack('boss');
  if (final) { S.winT = 2.2; S.grace = 99; Sound.music(null); }
  else { S.pickT = 1.4; Sound.music('game'); }
}
function prismaAct(B, dt, ef, n, every, spin) {
  const gx = W / 2 + Math.cos(B.t * 0.5) * 130, gy = H / 2 + Math.sin(B.t * 0.7) * 120;
  B.x += (gx - B.x) * 0.8 * dt * ef; B.y += (gy - B.y) * 0.8 * dt * ef;
  B.atk -= dt * ef;
  if (B.atk <= 0) {
    const a0 = rand(0, TAU), sp = (rng() < 0.5 ? 1 : -1) * spin;
    for (let i = 0; i < n; i++) S.lasers.push({ x: B.x, y: B.y, a: a0 + i * TAU / n, len: 700, warn: 0.9, life: 1.7, spin: sp, owner: B });
    B.atk = every;
  }
}
function queenAct(B, dt, ef, n, every, speed) {
  const a = B.t * 0.6, gx = W / 2 + Math.cos(a) * 150, gy = H / 2 + Math.sin(a) * 150;
  B.x += (gx - B.x) * 1.2 * dt * ef; B.y += (gy - B.y) * 1.2 * dt * ef;
  B.atk -= dt * ef;
  if (B.atk <= 0) {
    const a0 = rand(0, TAU);
    for (let i = 0; i < n; i++) { const aa = a0 + i * TAU / n; S.shots.push({ x: B.x, y: B.y, vx: Math.cos(aa) * speed, vy: Math.sin(aa) * speed, life: 6 }); }
    B.ring = (B.ring || 0) + 1;
    if (B.ring % 2 === 0) for (let i = 0; i < 2; i++) S.bugs.push({ x: B.x, y: B.y, life: 10, ph: rand(0, 6) });
    B.atk = every;
  }
}
function bullAct(B, dt, ef, v) {
  if (B.state === 'aim') {
    B.tx = S.p.x; B.ty = S.p.y; B.aim -= dt * ef;
    if (B.aim <= 0) {
      const dx = B.tx - B.x, dy = B.ty - B.y, d = Math.hypot(dx, dy) || 1;
      B.vx = dx / d * v; B.vy = dy / d * v; B.state = 'charge';
    }
  } else if (B.state === 'charge') {
    B.x += B.vx * dt * ef; B.y += B.vy * dt * ef;
    const i = S.pillars.findIndex(r => B.x > r.x - B.r && B.x < r.x + r.w + B.r && B.y > r.y - B.r && B.y < r.y + r.h + B.r);
    if (i >= 0) {
      const r = S.pillars[i]; sparks(r.x + r.w / 2, r.y + r.h / 2, COL.top, 18); S.pillars.splice(i, 1); S.shake = 0.5;
      flash(B.type === 'core' ? tr('Der Kern zerlegt eine Säule!', 'The Core smashes a pillar!') : tr('Der Stier zerlegt eine Säule!', 'The Bull smashes a pillar!'), COL.warn); Sound.sfx('boom');
    }
    if (B.x < B.r || B.x > W - B.r || B.y < B.r || B.y > H - B.r) {
      B.x = Math.max(B.r, Math.min(W - B.r, B.x)); B.y = Math.max(B.r, Math.min(H - B.r, B.y));
      B.state = 'stun'; B.stun = 1.5; S.shake = 0.5; sparks(B.x, B.y, COL.white, 14); Sound.sfx('boom');
      if (B.type === 'core') {
        const a0 = rand(0, TAU);
        for (let k = 0; k < 10; k++) { const aa = a0 + k * TAU / 10; S.shots.push({ x: B.x, y: B.y, vx: Math.cos(aa) * 120, vy: Math.sin(aa) * 120, life: 5 }); }
      }
    }
  } else if (B.state === 'stun') {
    B.stun -= dt;
    if (B.stun <= 0) { B.state = 'aim'; B.aim = Math.max(0.6, 1.2 - S.level * 0.05); }
  } else { B.state = 'aim'; B.aim = 1.2; }
}
function updateBoss(dt, ef) {
  const B = S.boss;
  B.t += dt;
  if (B.inv > 0) B.inv -= dt;
  if (B.enter > 0) { B.enter -= dt; return; }
  B.time -= dt;
  if (B.type === 'prisma') prismaAct(B, dt, ef, 3 + Math.min(3, Math.floor(S.level / 3)), 3.4, 0.5 + lv() * 0.03);
  else if (B.type === 'queen') queenAct(B, dt, ef, 10 + Math.min(6, S.level), 2.4, 115);
  else if (B.type === 'bull') bullAct(B, dt, ef, 380 + lv() * 15);
  else {
    const f = B.hp / B.maxHp, ph = f > 0.66 ? 0 : f > 0.33 ? 1 : 2;
    if (ph !== B.phase) {
      B.phase = ph; B.atk = 1.4;
      if (ph === 2) { B.state = 'aim'; B.aim = 1.4; }
      S.banner = { text: bossLabel('core') + ' · Phase ' + (ph + 1), good: false, t: 1.8, head: tr('ACHTUNG', 'WARNING') };
      S.shake = 0.7; sparks(B.x, B.y, COL.hot, 24); Sound.sfx('phase');
    }
    if (ph === 0) prismaAct(B, dt, ef, 4 + (S.level > 12 ? 1 : 0), 2.8, 0.6);
    else if (ph === 1) queenAct(B, dt, ef, 14, 2.0, 125);
    else bullAct(B, dt, ef, 430);
  }
  // Berührung
  const dx = S.p.x - B.x, dy = S.p.y - B.y, d = Math.hypot(dx, dy) || 1;
  if (d < B.r + pr()) {
    if ((S.dash || on('spikes')) && B.inv <= 0) {
      const dmg = (B.state === 'stun' ? 2 : 1) + (S.dash ? up('heavy') : 0);
      S.dash = null; B.hp -= dmg; B.inv = 0.5; B.spearHit = false; S.shake = 0.45; S.inv = 0.4;
      sparks(B.x, B.y, COL.white, 18);
      flash(dmg > 1 ? tr('Volltreffer ×', 'Critical hit ×') + dmg + '!' : tr('Treffer!', 'Hit!'), '#5FBE90');
      Sound.sfx('bossHit');
    } else if (!on('shield')) hit(20, tr('Boss-Treffer!', 'Boss hit!'));
    S.p.x = B.x + dx / d * (B.r + pr() + 14); S.p.y = B.y + dy / d * (B.r + pr() + 14);
    resolve();
  }
  if (B.hp <= 0) defeatBoss(B);
  else if (B.time <= 0) { S.boss = null; flash(tr('Der Boss zieht ab', 'The boss leaves'), '#98A1B4'); Sound.music('game'); }
}

// ---------- Chaos-Rad ----------
const EVENTS = [
  { name: 'Mittagssonne', min: 1, run() { S.E.noonWarn = 1.5; } },
  { name: 'Zweite Sonne', min: 1, skip: () => ruleOn('twosun'), run() { S.E.sun2 = 7; } },
  { name: 'Sturmböe', min: 0, run() { const a = rand(0, TAU); S.wind = { x: Math.cos(a) * 85, y: Math.sin(a) * 85 }; S.E.wind = 4; } },
  { name: 'Käferschwarm', min: 1, run() { const e = edgePoint(); for (let i = 0; i < 5; i++) S.bugs.push({ x: e.x + rand(-30, 30), y: e.y + rand(-30, 30), life: 12, ph: rand(0, 6) }); } },
  { name: 'Sonnenfunken', min: 0, run() {
      S.meteors.push({ x: S.p.x, y: S.p.y, r: 30, warn: 1.3 });
      for (let i = 0; i < 2 + Math.min(S.level, 8); i++) S.meteors.push({ x: rand(30, W - 30), y: rand(30, H - 30), r: 30, warn: 1.5 + i * 0.35 });
    } },
  { name: 'Erdbeben', min: 2, run() {
      const n = S.pillars.length; S.pillars = [];
      for (let i = 0; i < n; i++) { const r = makePillar(S.pillars, S.p); if (r) S.pillars.push(r); }
      S.shake = 1.2; resolve(); Sound.sfx('boom', true);
    } },
  { name: 'Blitzlicht', min: 1, run() { S.E.flash = 1.4; Sound.sfx('flash'); } },
  { name: 'Leuchtturm', min: 2, run() {
      const o = edgePoint(), dir = rng() < 0.5 ? 1 : -1;
      S.beam = { x: o.x, y: o.y, a: Math.atan2(H / 2 - o.y, W / 2 - o.x) - dir * 1.1, dir, warn: 1, life: 7 };
    } },
  { name: 'Elstern', min: 0, run() { for (let i = 0; i < 2; i++) { const e = edgePoint(); S.magpies.push({ ...e, life: 11, carry: 0, target: null, ph: rand(0, 6) }); } Sound.sfx('chirp'); } },
  { name: 'Honigregen', min: 0, run() { for (let i = 0; i < 3; i++) { const s = freeSpot(40, false); if (s) S.honey.push({ x: s.x, y: s.y, r: rand(24, 34), life: 10 }); } } },
  { name: 'Lasergitter', min: 0, run() {
      const n = 3 + Math.min(4, S.level);
      for (let i = 0; i < n; i++) {
        if (rng() < 0.5) S.lasers.push({ x: -10, y: rand(25, H - 25), a: 0, len: W + 20, warn: 1.1 + i * 0.18, life: 0.7, spin: 0 });
        else S.lasers.push({ x: rand(25, W - 25), y: -10, a: Math.PI / 2, len: H + 20, warn: 1.1 + i * 0.18, life: 0.7, spin: 0 });
      }
    } },
  { name: 'Laserturm', min: 1, run() {
      const s = freeSpot(110, false) || { x: W / 2, y: 40 };
      S.lasers.push({ x: s.x, y: s.y, a: rand(0, TAU), len: 280, warn: 1, life: 6, spin: (rng() < 0.5 ? 1 : -1) * 1.3, turret: true });
    } },
  { name: 'Sägeblätter', min: 0, run() {
      for (let i = 0; i < 2; i++) { const e = edgePoint(), a = Math.atan2(H / 2 - e.y, W / 2 - e.x) + rand(-0.5, 0.5), v = 150 + lv() * 8;
        S.saws.push({ x: Math.max(14, Math.min(W - 14, e.x)), y: Math.max(14, Math.min(H - 14, e.y)), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 8 }); }
    } },
  { name: 'Suchraketen', min: 1, run() {
      for (let i = 0; i < 2 + Math.min(3, Math.floor(S.level / 3)); i++) { const e = edgePoint(); S.missiles.push({ x: e.x, y: e.y, a: Math.atan2(S.p.y - e.y, S.p.x - e.x), life: 7 }); }
    } },
  { name: 'Lichtwirbel', min: 0, run() { const s = freeSpot(120, false) || { x: W / 2, y: H / 2 }; S.vortex = { x: s.x, y: s.y, life: 5 }; } },
  { name: 'Glassäulen', min: 1, run() { for (const r of S.pillars) if (rng() < 0.5) r.glass = 5; } },
  { name: 'Beuteregen', good: true, min: 0, run() {
      for (let i = 0; i < 3; i++) { const s = freeSpot(50, false); if (s) S.items.push({ x: s.x, y: s.y, kind: pick(['umbrella', 'crystal', 'bubble', 'star', 'magnet', 'boots', 'spikes', 'decoy', 'frost']), life: 9 }); }
    } },
  { name: 'Mondfinsternis', good: true, min: 0, run() { S.E.eclipse = 4; } },
  { name: 'Tauregen', good: true, min: 0, run() { for (let i = 0; i < 8; i++) { const s = freeSpot(40, true); if (s) S.dews.push({ x: s.x, y: s.y, life: 7 }); } } },
];
function spinWheel() {
  const wantGood = S.lucky > 0 || rng() < 0.25 + 0.12 * up('lucky');
  if (S.lucky > 0) S.lucky--;
  const pool = EVENTS.filter(e => e.min <= S.level && (wantGood ? e.good : !e.good) && !(e.skip && e.skip()));
  const ev = pick(pool.length ? pool : EVENTS);
  ev.run();
  S.banner = { text: evLabel(ev.name), good: !!ev.good, t: 2.2 };
  Sound.sfx('wheel', !!ev.good);
}
function receiveAttack(name) {
  const ev = EVENTS.find(e => e.name === name);
  if (!ev) return;
  ev.run();
  S.banner = { text: evLabel(name), good: false, t: 2.4, head: tr('ANGRIFF VON ', 'ATTACK FROM ') + (Net.opp ? Net.opp.name : tr('GEGNER', 'OPPONENT')).toUpperCase() };
  Sound.sfx('alarm');
}

// ---------- Hilfsmittel ----------
const ITEM_WEIGHTS = { umbrella: 8, crystal: 8, hourglass: 5, gold: 4, magnet: 6, boots: 6, bomb: 6, seed: 5, heart: 2,
                       star: 5, frost: 5, shrink: 5, thunder: 5, portal: 3, bubble: 6, dashy: 4, decoy: 4, spear: 4, spikes: 4, clover: 3, shroom: 9, acid: 9 };
function rollItem() {
  if (ruleOn('traps')) return rng() < 0.5 ? 'shroom' : 'acid';
  const w = { ...ITEM_WEIGHTS };
  if (S.hearts >= maxHearts()) delete w.heart;
  if (S.portals) delete w.portal;
  if (ruleOn('tiny')) delete w.shrink;
  let total = 0; for (const k in w) total += w[k];
  let r = rng() * total;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'crystal';
}
function collect(it) {
  const trap = it.kind === 'shroom' || it.kind === 'acid';
  if (trap) { stat('traps'); Sound.sfx('trap'); }
  else { stat('items'); Sound.sfx(it.kind === 'gold' ? 'gold' : 'pickup'); }
  switch (it.kind) {
    case 'umbrella': S.E.shield = S.shieldMax = 5 * lingerF(); flash(tr('Schirm! ' + Math.round(S.shieldMax) + ' s geschützt', 'Umbrella! Protected for ' + Math.round(S.shieldMax) + ' s'), COL.umbrella); break;
    case 'crystal': S.energy = Math.min(maxEnergy(), S.energy + 35); flash(tr('Mondstein +35 Kraft', 'Moonstone +35 energy'), COL.crystal); break;
    case 'hourglass': S.E.slow = 5; flash(tr('Sanduhr! Zeitlupe', 'Hourglass! Slow motion'), '#5FBE90'); break;
    case 'gold': { const p = pts(200); S.score += p; flash(tr('Goldtau +', 'Golden dew +') + p, COL.gold); break; }
    case 'magnet': S.E.magnet = 6; flash('Magnet!', COL.magnet); break;
    case 'boots': S.E.boots = 5; flash('Turbo!', COL.boots); break;
    case 'bomb': { const life = 8 * lingerF(); S.puddles.push({ x: S.p.x, y: S.p.y, r: 58, life, max: life }); flash(tr('Schattenbombe!', 'Shadow bomb!'), '#8E9CC2'); break; }
    case 'seed': {
      const d = dirOf(S.az), cx = S.p.x - d.x * 40, cy = S.p.y - d.y * 40;
      S.pillars.push({ x: Math.max(4, Math.min(W - 32, cx - 14)), y: Math.max(4, Math.min(H - 32, cy - 14)), w: 28, h: 28, crumble: 0, grow: 0.4 });
      resolve(); flash(tr('Säule wächst!', 'A pillar grows!'), '#8BC34A'); break;
    }
    case 'heart':
      if (maxHearts() > 0) { S.hearts = Math.min(maxHearts(), S.hearts + 1); flash(tr('Extraleben!', 'Extra life!'), COL.heart); }
      else { S.energy = Math.min(maxEnergy(), S.energy + 35); flash(tr('+35 Kraft', '+35 energy'), COL.heart); }
      break;
    case 'star': S.E.star = 8; flash(tr('Doppelte Punkte!', 'Double points!'), COL.gold); break;
    case 'frost': S.E.frost = 4; flash(tr('Alles eingefroren!', 'Everything frozen!'), COL.frost); break;
    case 'shrink': S.E.shrink = 6; flash(tr('Winzig!', 'Tiny!'), COL.shrink); break;
    case 'thunder': {
      const n = S.bugs.length + S.magpies.length;
      for (const b of S.bugs) sparks(b.x, b.y, COL.bug, 6);
      for (const b of S.magpies) sparks(b.x, b.y, COL.white, 6);
      S.bugs = []; S.magpies = []; S.score += pts(15 * n); S.shake = 0.5; S.E.zap = 0.25;
      stat('bugs', n); Sound.sfx('thunder');
      flash(tr('Donnerschlag! ' + n + ' weg', 'Thunderclap! ' + n + ' gone'), COL.thunder); break;
    }
    case 'shroom': S.E.invert = 5; S.hurt = 0.3; flash(tr('Umkehrpilz! Alles verdreht', 'Reversal mushroom! Everything is inverted'), COL.shroom); break;
    case 'bubble': S.bubble = 3; flash(tr('Blasenschild ×3', 'Bubble shield ×3'), '#6FC3FF'); break;
    case 'dashy': S.E.dashy = 6; S.charges = maxCharges(); S.dashCd = 0; flash(tr('Dauerdash!', 'Dash frenzy!'), '#3FC7C4'); break;
    case 'decoy': S.decoy = { x: S.p.x, y: S.p.y, life: 6 }; flash(tr('Schattenklon!', 'Shadow clone!'), '#C9B8FF'); break;
    case 'spear':
      if (S.boss && S.boss.enter <= 0) {
        S.boss.hp -= 2; S.boss.inv = 0.4; S.boss.spearHit = S.boss.hp <= 0;
        sparks(S.boss.x, S.boss.y, '#6D5BD0', 18); S.shake = 0.4; flash(tr('Speer trifft den Boss!', 'Spear hits the boss!'), '#C9B8FF'); Sound.sfx('bossHit');
      } else { const p = pts(100); S.score += p; flash(tr('Schattenspeer +', 'Shadow spear +') + p, '#C9B8FF'); }
      break;
    case 'spikes': S.E.spikes = 6; flash(tr('Stachelpanzer!', 'Spike armor!'), '#B8C0CF'); break;
    case 'clover': S.lucky = 3; flash(tr('Glücksklee! 3× Glück', 'Lucky clover! 3× luck'), '#5FBE90'); break;
    case 'acid': hit(25, tr('Säure!', 'Acid!'), tr(' · −100 P', ' · −100 pts')); S.score = Math.max(0, S.score - 100); sparks(it.x, it.y, COL.acid, 10); break;
  }
}

// ---------- Upgrades ----------
function rollCards() {
  const pool = UPGRADES.filter(u => up(u.id) < u.max && !(u.id === 'heart' && ruleOn('glass')) && !(u.id === 'phoenix' && maxHearts() === 0));
  const out = [];
  while (out.length < 3 && pool.length) {
    let tot = 0; for (const u of pool) tot += RARITY[u.rar][1];
    let r = Math.random() * tot, i = 0;
    for (; i < pool.length - 1; i++) { r -= RARITY[pool[i].rar][1]; if (r <= 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
function applyUpgrade(id) {
  S.up[id] = up(id) + 1; S.upList.push(id);
  if (id === 'heart') S.hearts = Math.min(maxHearts(), S.hearts + 1);
  if (id === 'twin') S.charges = maxCharges();
  if (id === 'architect') {
    for (let i = 0; i < 2; i++) { const r = makePillar(S.pillars, S.p); if (r) { r.grow = 0.4; S.pillars.push(r); } }
    for (const r of S.pillars) { r.doomed = false; r.crumble = 0; }
    resolve();
  }
  stat('upgrades'); statMax('maxUpgradesRun', S.upList.length);
}

function shiftDay(key, n) { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); }
function dailyDone() {
  if (S.run.dailyDone) return;
  S.run.dailyDone = true;
  const key = S.cfg.dailyKey, d = P.daily[key] || (P.daily[key] = { best: 0 });
  if (d.done) return;
  d.done = true; P.wallet += DAILY_REWARD; stat('dailyDone');
  if (P.streak.last !== key) {
    P.streak.n = P.streak.last === shiftDay(key, -1) ? P.streak.n + 1 : 1;
    P.streak.last = key; P.streak.best = Math.max(P.streak.best, P.streak.n);
  }
  toast(tr('Tagesziel geschafft', 'Daily goal reached'), tr('+' + fmt(DAILY_REWARD) + ' Punkte aufs Konto', '+' + fmt(DAILY_REWARD) + ' points added to your balance'), 'calendar');
  save();
}

const keys = new Set();

function update(dt) {
  S.t += dt;
  const lowF = S.mode === 'play' && S.energy < 20 ? 0.7 : 1;
  const sunF = (on('slow') ? 0.35 : 1) * lowF;
  const ef = sunF * (on('frost') ? 0 : 1) * (ruleOn('tiny') ? 1.2 : 1);
  const sunDt = dt * sunF;
  S.sunT += sunDt;
  S.az += omega() * sunDt;
  for (const k in S.E) if (S.E[k] > 0) S.E[k] -= dt;
  if (S.E.noonWarn !== undefined && S.E.noonWarn <= 0 && S.E.noonWarn > -1) { S.E.noonWarn = -9; S.E.noon = 4; }
  S.noonF += ((on('noon') ? 0.28 : 1) - S.noonF) * Math.min(1, dt * 4);
  for (const q of S.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
  S.parts = S.parts.filter(q => q.life > 0);
  if (S.msg) { S.msg.t -= dt; if (S.msg.t <= 0) S.msg = null; }
  if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }
  if (S.shake > 0) S.shake -= dt;
  for (const c of S.clouds) c.x += c.vx * sunDt;
  S.clouds = S.clouds.filter(c => c.x > -120 && c.x < W + 120);
  for (const r of S.pillars) { if (r.grow > 0) r.grow -= dt; if (r.glass > 0) r.glass -= dt; }
  if (S.mode === 'count') {
    S.countT -= dt;
    const n = Math.max(0, Math.ceil(S.countT));
    if (n !== S.countShown) { S.countShown = n; Sound.sfx(n > 0 ? 'count' : 'go'); }
    if (S.countT <= 0) S.mode = 'play';
    return;
  }
  if (S.mode !== 'play') return;

  // Bewegung
  let mx = 0, my = 0;
  if (keys.has('left')) mx -= 1; if (keys.has('right')) mx += 1;
  if (keys.has('up')) my -= 1; if (keys.has('down')) my += 1;
  if (!mx && !my && S.target) {
    const dx = S.target.x - S.p.x, dy = S.target.y - S.p.y, dd = Math.hypot(dx, dy);
    if (dd > 3) { mx = dx / dd; my = dy / dd; }
  }
  if (inverted()) { mx = -mx; my = -my; }
  const ml = Math.hypot(mx, my);
  if (ml) S.face = { x: mx / ml, y: my / ml };
  const sticky = S.honey.some(h => Math.hypot(S.p.x - h.x, S.p.y - h.y) < h.r);
  const spd = 155 * (1 + 0.12 * up('feet')) * (on('boots') ? 1.7 : 1) * (S.hurt > 0 ? 0.6 : 1) * (sticky ? 0.45 : 1);
  if (S.dash) {
    S.p.x += S.dash.vx * dt; S.p.y += S.dash.vy * dt; S.dash.t -= dt;
    S.parts.push({ x: S.p.x, y: S.p.y, vx: 0, vy: 0, life: 0.22, ghost: true });
    if (up('trail')) {
      S.trailT -= dt;
      if (S.trailT <= 0) { S.trailT = 0.035; const life = 3 * lingerF(); S.puddles.push({ x: S.p.x, y: S.p.y, r: 17, life, max: life }); }
    }
    if (S.dash.t <= 0) S.dash = null;
  } else if (ml) { S.p.x += mx / ml * spd * dt; S.p.y += my / ml * spd * dt; }
  if (S.charges < maxCharges()) {
    S.dashCd -= dt;
    if (S.dashCd <= 0) { S.charges++; S.dashCd = S.charges < maxCharges() ? (S.dashMax = dashCdMax()) : 0; }
  }
  if (S.inv > 0) S.inv -= dt;
  if (on('wind')) {
    S.p.x += S.wind.x * dt; S.p.y += S.wind.y * dt;
    if (Math.random() < dt * 40) S.parts.push({ x: fx(0, W), y: fx(0, H), vx: S.wind.x * 4, vy: S.wind.y * 4, life: 0.35, streak: true });
  }
  resolve();

  if (S.grace > 0) S.grace -= dt;
  if (S.hurt > 0) S.hurt -= dt;
  if (S.portalCd > 0) S.portalCd -= dt;
  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  if (up('shieldgen') && S.bubble === 0) {
    S.shieldGen -= dt;
    if (S.shieldGen <= 0) { S.bubble = 1; S.shieldGen = 20; flash(tr('Blasenquelle: Schild!', 'Bubble spring: shield!'), '#6FC3FF'); Sound.sfx('block'); }
  }

  // Chaos-Rad und Angriffe aus dem Duell
  S.eventIn -= dt;
  if (S.eventIn <= 0) { spinWheel(); S.eventIn = ruleOn('chaos') ? 3 : Math.max(3.5, 8 - S.level * 0.5); }
  if (S.incoming.length && !S.banner) receiveAttack(S.incoming.shift());

  // Wolken
  S.cloudIn -= dt;
  if (S.cloudIn <= 0) {
    const dir = rng() < 0.5 ? 1 : -1, rx = rand(50, 72);
    S.clouds.push({ x: dir > 0 ? -rx - 10 : W + rx + 10, y: rand(60, H - 60), vx: dir * rand(22, 36), rx, ry: rx * 0.65 });
    S.cloudIn = ruleOn('clouds') ? rand(2.5, 4) : rand(9, 14);
  }

  // Pfützen
  for (const q of S.puddles) q.life -= dt;
  S.puddles = S.puddles.filter(q => q.life > 0);
  for (const h of S.honey) h.life -= dt;
  S.honey = S.honey.filter(h => h.life > 0);

  // Portale
  if (S.portals) {
    const Pp = S.portals; Pp.life -= dt;
    if (S.portalCd <= 0) {
      for (const [a, b] of [[Pp.a, Pp.b], [Pp.b, Pp.a]]) {
        if (dist(a, S.p) < 13) { S.p.x = b.x; S.p.y = b.y; S.portalCd = 1; sparks(b.x, b.y, COL.portal, 12); flash('Teleport!', COL.portal); Sound.sfx('portal'); break; }
      }
    }
    if (Pp.life <= 0) S.portals = null;
  }

  // Heiße Fliesen
  S.hotIn -= dt;
  if (S.hotIn <= 0) {
    if (S.hot.length < Math.min(12, 2 + S.level)) {
      for (let k = 0; k < 20; k++) {
        const gx = Math.floor(rand(0, W / CELL)), gy = Math.floor(rand(0, H / CELL));
        const cx = gx * CELL + CELL / 2, cy = gy * CELL + CELL / 2;
        if (inPillar(cx, cy, 0) || S.hot.some(h => h.gx === gx && h.gy === gy)) continue;
        S.hot.push({ gx, gy, warn: 1.5, life: 6 }); break;
      }
    }
    S.hotIn = Math.max(1.2, 3.5 - S.level * 0.35);
  }
  for (const h of S.hot) { if (h.warn > 0) h.warn -= dt; else h.life -= dt; }
  S.hot = S.hot.filter(h => h.life > 0);

  // Brennglas
  if (S.level >= 1 || ruleOn('night')) {
    if (!S.lens) {
      S.lensIn -= dt;
      if (S.lensIn <= 0) {
        const s = freeSpot(170, false) || { x: 40, y: 40 };
        S.lens = { x: s.x, y: s.y, r: 34, warn: 1.2, life: 7 + lv() * 0.5 };
      }
    } else {
      const L = S.lens;
      if (L.warn > 0) L.warn -= dt;
      else {
        L.life -= dt;
        const T = S.decoy || S.p;
        const dx = T.x - L.x, dy = T.y - L.y, d = Math.hypot(dx, dy) || 1;
        const v = (40 + lv() * 5) * ef * (ruleOn('night') ? 2 : 1);
        L.x += dx / d * v * dt; L.y += dy / d * v * dt;
      }
      if (L.life <= 0) { S.lens = null; S.lensIn = rand(7, 12) * (ruleOn('night') ? 0.5 : 1); }
    }
  }

  // Leuchtturm
  if (S.beam) {
    const B = S.beam;
    if (B.warn > 0) B.warn -= dt; else { B.life -= dt; B.a += B.dir * 0.75 * ef * dt; }
    if (B.life <= 0) S.beam = null;
  }

  // Sonnenfunken
  for (const m of S.meteors) {
    m.warn -= dt * (ef > 0 ? 1 : 0);
    if (m.warn <= 0) {
      m.done = true; S.shake = Math.max(S.shake, 0.3); sparks(m.x, m.y, COL.hot, 14); Sound.sfx('boom');
      if (dist(m, S.p) < m.r + pr() && !on('shield')) hit(22, tr('Funkentreffer!', 'Spark hit!'));
      const gx = Math.floor(m.x / CELL), gy = Math.floor(m.y / CELL);
      if (!S.hot.some(h => h.gx === gx && h.gy === gy)) S.hot.push({ gx, gy, warn: 0, life: 4 });
    }
  }
  S.meteors = S.meteors.filter(m => !m.done);

  // Boss
  if (S.boss) updateBoss(dt, ef);

  // Laser (Säulen halten sie auf)
  for (const L of S.lasers) {
    if (L.owner) { if (L.owner !== S.boss) { L.life = 0; continue; } L.x = L.owner.x; L.y = L.owner.y; }
    if (L.warn > 0) { L.warn -= dt * (on('frost') ? 0 : 1); if (L.warn <= 0) Sound.sfx('laser'); }
    else {
      L.life -= dt; L.a += L.spin * dt * ef;
      const len = rayLen(L.x, L.y, L.a, L.len);
      if (segDist(S.p.x, S.p.y, L.x, L.y, L.x + Math.cos(L.a) * len, L.y + Math.sin(L.a) * len) < pr() + 4) hit(15, 'Laser!');
    }
  }
  S.lasers = S.lasers.filter(L => L.life > 0);

  // Lichtkugeln
  for (const s of S.shots) {
    s.x += s.vx * dt * ef; s.y += s.vy * dt * ef; s.life -= dt;
    if (s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20 || inPillar(s.x, s.y, 0)) s.life = 0;
    else if (dist(s, S.p) < pr() + 5) {
      if (S.dash) { if (up('blade')) { s.life = 0; sparks(s.x, s.y, '#C9B8FF', 6); S.score += pts(10); } }
      else { s.life = 0; sparks(s.x, s.y, COL.bug, 6); if (!on('shield')) hit(12, tr('Lichtkugel!', 'Light orb!')); }
    }
  }
  S.shots = S.shots.filter(s => s.life > 0);

  // Schattenklon
  if (S.decoy) { S.decoy.life -= dt; if (S.decoy.life <= 0) S.decoy = null; }

  // Sägeblätter
  for (const s of S.saws) {
    s.life -= dt;
    s.x += s.vx * dt * ef;
    if (s.x < 12 || s.x > W - 12 || inPillar(s.x, s.y, 6)) { s.x -= s.vx * dt * ef; s.vx = -s.vx; }
    s.y += s.vy * dt * ef;
    if (s.y < 12 || s.y > H - 12 || inPillar(s.x, s.y, 6)) { s.y -= s.vy * dt * ef; s.vy = -s.vy; }
    if (dist(s, S.p) < pr() + 11) {
      if (on('spikes') || (S.dash && up('blade'))) { s.life = 0; sparks(s.x, s.y, '#DDE3EC', 14); const p = pts(30); flash(tr('Säge zerbrochen +', 'Saw destroyed +') + p, '#B8C0CF'); S.score += p; Sound.sfx('bossHit'); }
      else if (Math.random() < dt * 20) sparks(s.x, s.y, COL.sun, 3);
      if (s.life > 0 && !on('shield')) hit(15, tr('Säge!', 'Saw!'));
    }
  }
  S.saws = S.saws.filter(s => s.life > 0);

  // Suchraketen
  for (const m of S.missiles) {
    m.life -= dt;
    const T = S.decoy || S.p;
    const want = Math.atan2(T.y - m.y, T.x - m.x);
    const diff = ((want - m.a) % TAU + TAU + Math.PI) % TAU - Math.PI;
    m.a += Math.max(-2.3 * dt, Math.min(2.3 * dt, diff)) * ef;
    const v = (160 + lv() * 6) * ef;
    m.x += Math.cos(m.a) * v * dt; m.y += Math.sin(m.a) * v * dt;
    if (Math.random() < dt * 30) S.parts.push({ x: m.x - Math.cos(m.a) * 10, y: m.y - Math.sin(m.a) * 10, vx: fx(-15, 15), vy: fx(-15, 15), life: 0.35 });
    let boom = m.life <= 0 || inPillar(m.x, m.y, 2);
    if (S.decoy && dist(m, S.decoy) < 12) boom = true;
    if (!boom && dist(m, S.p) < pr() + 8) {
      boom = true;
      if (S.dash || on('spikes')) { const p = pts(25); S.score += p; flash(tr('Rakete zerstört +', 'Missile destroyed +') + p, '#5FBE90'); stat('missiles'); }
      else if (!on('shield')) hit(20, tr('Rakete!', 'Missile!'));
    }
    if (boom) { m.dead = true; sparks(m.x, m.y, COL.hot, 16); S.shake = Math.max(S.shake, 0.25); Sound.sfx('boom'); }
  }
  S.missiles = S.missiles.filter(m => !m.dead);

  // Lichtwirbel
  if (S.vortex) {
    const V = S.vortex; V.life -= dt;
    const dx = V.x - S.p.x, dy = V.y - S.p.y, d = Math.hypot(dx, dy) || 1;
    if (d > 6 && !S.dash) { const f = 95 * ef; S.p.x += dx / d * f * dt; S.p.y += dy / d * f * dt; resolve(); }
    if (V.life <= 0) S.vortex = null;
  }

  // Lichtkäfer
  S.bugIn -= dt;
  if (S.bugIn <= 0) {
    if (S.bugs.length < Math.min(10, 2 + S.level) * (ruleOn('bugs') ? 2 : 1)) { const e = edgePoint(); S.bugs.push({ x: e.x, y: e.y, life: 12, ph: rand(0, 6) }); }
    S.bugIn = Math.max(2.2, 5.5 - S.level * 0.5) / (ruleOn('bugs') ? 3 : 1);
  }
  for (const b of S.bugs) {
    b.life -= dt;
    const T = S.decoy || S.p;
    const tx = T.x - b.x, ty = T.y - b.y, td = Math.hypot(tx, ty) || 1;
    const v = (52 + lv() * 6) * ef, wob = Math.sin(S.t * 5 + b.ph) * 40 * ef;
    b.x += (tx / td * v - ty / td * wob) * dt;
    b.y += (ty / td * v + tx / td * wob) * dt;
    if (S.decoy && td < 12) { b.life = 0; sparks(b.x, b.y, COL.bug, 8); continue; }
    const dx = S.p.x - b.x, dy = S.p.y - b.y, d = Math.hypot(dx, dy) || 1;
    if (d < pr() + 6) {
      b.life = 0;
      if (on('shield') || S.dash || on('spikes')) {
        const p = pts(20 * (ruleOn('bugs') ? 3 : 1));
        S.score += p; sparks(b.x, b.y, COL.bug, 8);
        flash((S.dash ? tr('Weggedasht +', 'Dashed away +') : tr('Abgewehrt +', 'Fended off +')) + p, S.dash ? '#5FBE90' : COL.umbrella);
        stat('bugs'); if (S.dash) stat('bugsDashed');
        Sound.sfx('pop');
      } else { if (hit(18, tr('Autsch!', 'Ouch!'))) { S.p.x += dx / d * 26; S.p.y += dy / d * 26; resolve(); } sparks(b.x, b.y, COL.bug, 10); }
    }
  }
  S.bugs = S.bugs.filter(b => b.life > 0);

  // Tautropfen
  S.dewIn -= dt;
  if (S.dewIn <= 0 && S.dews.length < 3) {
    const s = freeSpot(60, true);
    if (s) S.dews.push({ x: s.x, y: s.y, life: 6 });
    S.dewIn = rand(2, 3.5);
  }
  // Hilfsmittel und Fallen
  S.itemIn -= dt;
  if (S.itemIn <= 0 && S.items.length < 4) {
    const kind = rollItem();
    if (kind === 'portal') {
      const a = freeSpot(60, false), b = freeSpot(60, false);
      if (a && b && dist(a, b) > 180) S.portals = { a, b, life: 12 };
    } else {
      const s = freeSpot(80, kind === 'acid');
      if (s) S.items.push({ x: s.x, y: s.y, kind, life: 8 });
    }
    S.itemIn = rand(2.2, 4);
  }
  // Magnet zieht alles an, auch Fallen
  if (on('magnet')) {
    for (const o of S.dews.concat(S.items)) {
      const dx = S.p.x - o.x, dy = S.p.y - o.y, d = Math.hypot(dx, dy);
      if (d < 210 && d > 1) { o.x += dx / d * 190 * dt; o.y += dy / d * 190 * dt; }
    }
  } else if (up('dewmag')) {
    for (const o of S.dews) {
      const dx = S.p.x - o.x, dy = S.p.y - o.y, d = Math.hypot(dx, dy);
      if (d < 95 && d > 1) { o.x += dx / d * 150 * dt; o.y += dy / d * 150 * dt; }
    }
  }
  for (const d of S.dews) {
    d.life -= dt;
    if (dist(d, S.p) < pr() + 7) {
      d.life = 0;
      const before = S.combo;
      S.combo = Math.min(comboMax(), S.combo + 1); S.comboT = 3.5 + 1.5 * up('combo');
      const p = pts(50 * S.combo * (ruleOn('traps') ? 3 : 1));
      S.score += p; S.energy = Math.min(maxEnergy(), S.energy + 8 * (ruleOn('summer') ? 2 : 1));
      flash('+' + p + (S.combo > 1 ? tr('  Kombo ×', '  Combo ×') + S.combo : ''), COL.dew);
      stat('dews'); statMax('maxCombo', S.combo); Sound.sfx('dew', S.combo);
      if (isDuel() && before < 5 && S.combo >= 5) Net.attack('combo');
    }
  }
  S.dews = S.dews.filter(d => d.life > 0);
  for (const it of S.items) {
    it.life -= dt;
    if (it.life > 0 && dist(it, S.p) < pr() + 11) { it.life = 0; collect(it); }
  }
  S.items = S.items.filter(i => i.life > 0);

  // Elstern
  for (const g of S.magpies) {
    g.life -= dt;
    if (!g.target || g.target.life <= 0) {
      const loot = S.dews.concat(S.items.filter(i => i.kind !== 'acid' && i.kind !== 'shroom'));
      g.target = loot.length ? loot.reduce((a, b) => dist(a, g) < dist(b, g) ? a : b) : null;
    }
    const goal = g.life < 2 || !g.target ? { x: g.x < W / 2 ? -40 : W + 40, y: g.y - 60 } : g.target;
    const dx = goal.x - g.x, dy = goal.y - g.y, d = Math.hypot(dx, dy) || 1;
    const v = 95 * ef;
    g.x += dx / d * v * dt; g.y += (dy / d * v + Math.sin(S.t * 6 + g.ph) * 20 * ef) * dt;
    g.face = dx < 0 ? -1 : 1;
    if (g.target && dist(g, g.target) < 10) { g.target.life = 0; g.carry++; flash(tr('Elster klaut!', 'Magpie steals!'), COL.warn); g.target = null; Sound.sfx('chirp'); }
    if (dist(g, S.p) < pr() + 11) { g.life = 0; const p = pts(30); S.score += p; sparks(g.x, g.y, COL.white, 8); flash(tr('Elster verscheucht +', 'Magpie scared off +') + p, '#5FBE90'); Sound.sfx('chirp'); }
  }
  S.magpies = S.magpies.filter(g => g.life > 0 && g.x > -60 && g.x < W + 60);

  // Licht, Hitze, Kraft
  const shielded = on('shield');
  const light = shielded ? 0 : lightAt(S.p.x, S.p.y);
  S.lit = light > 0;
  let burn = 0;
  if (S.lit) burn += (32 + lv() * 4) * light * Math.pow(0.85, up('cream')) * (ruleOn('dashfever') ? 1.3 : 1);
  const gx = Math.floor(S.p.x / CELL), gy = Math.floor(S.p.y / CELL);
  if (S.hot.some(h => h.warn <= 0 && h.gx === gx && h.gy === gy)) burn += 30;
  if (!shielded && S.lens && S.lens.warn <= 0 && dist(S.lens, S.p) < S.lens.r) burn += 60;
  if (!shielded && S.beam && S.beam.warn <= 0) {
    const a = Math.atan2(S.p.y - S.beam.y, S.p.x - S.beam.x);
    const da = Math.abs(((a - S.beam.a) % TAU + TAU + Math.PI) % TAU - Math.PI);
    if (da < 0.13) burn += 55;
  }
  burn *= S.diff.burn;
  if (S.grace > 0) burn = 0;
  S.burn = burn;
  S.energy += (burn > 0 ? -burn : 7 * (1 + 0.5 * up('regen'))) * dt;
  S.energy = Math.max(0, Math.min(maxEnergy(), S.energy));
  if (burn > 0 && Math.random() < dt * (20 + burn * 0.4))
    S.parts.push({ x: S.p.x + fx(-6, 6), y: S.p.y - 4, vx: fx(-8, 8), vy: fx(-45, -20), life: fx(0.4, 0.8) });
  if (S.lit && !S.litWas) Sound.sfx('sizzle');
  S.litWas = S.lit;
  if (S.energy < 20) { S.beatT -= dt; if (S.beatT <= 0) { Sound.sfx('beat'); S.beatT = 0.8; } } else S.beatT = 0;
  if (S.energy < 3 && S.energy > 0) S.closeArmed = true;
  if (S.closeArmed && S.energy > 50) { S.closeArmed = false; stat('close'); }
  S.score += dt * 10 * mult();

  // Stufe und Einsturz
  if (!S.boss && S.pickT <= 0 && S.winT <= 0) S.levelIn -= dt;
  if (S.levelIn <= 2.5 && !up('architect') && !S.pillars.some(r => r.doomed)) {
    const r = pick(S.pillars);
    if (r) { r.doomed = true; r.crumble = 2.5; }
  }
  for (const r of S.pillars) if (r.crumble > 0) r.crumble -= dt;
  if (S.levelIn <= 0) {
    S.pillars = S.pillars.filter(r => !r.doomed);
    const n = makePillar(S.pillars, S.p); if (n) S.pillars.push(n);
    S.level++; S.levelIn = ruleOn('rush') ? 6 : 12;
    flash(tr('Stufe ', 'Level ') + (S.level + 1), COL.warn);
    statMax('maxLevel', S.level + 1);
    if (S.cfg.mode === 'endless') statMax('endlessLevel', S.level + 1);
    Sound.sfx('level'); Sound.setLevel(S.level);
    if (S.cfg.mode === 'daily' && S.level + 1 >= DAILY_GOAL) dailyDone();
    spawnBoss();
  }

  if (S.energy <= 0) {
    if (S.hearts > 0) {
      const ph = up('phoenix') > 0;
      S.hearts--; S.energy = ph ? maxEnergy() : Math.min(55, maxEnergy()); S.E.shield = S.shieldMax = ph ? 3 : 2; S.shake = 0.6;
      if (ph) S.E.frost = 2;
      S.closeArmed = false; stat('revives');
      sparks(S.p.x, S.p.y, COL.heart, 16); flash(ph ? tr('Phönix! Volle Kraft', 'Phoenix! Full energy') : tr('Zweites Leben!', 'Second life!'), COL.heart); Sound.sfx('revive');
    } else { finish(false); return; }
  }
  if (S.pickT > 0) { S.pickT -= dt; if (S.pickT <= 0) openPick(); }
  if (S.winT > 0) { S.winT -= dt; if (S.winT <= 0) { finish(true); return; } }
  if (S.duelWinT > 0) { S.duelWinT -= dt; if (S.duelWinT <= 0) { finish(true); return; } }
  hud();
}
