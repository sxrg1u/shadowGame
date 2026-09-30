'use strict';

// ---------- Zeichnen ----------
function fit() {
  const d = dpr();
  cv.width = W * d; cv.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
}
fit(); window.addEventListener('resize', fit);

function tiles(color) {
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = CELL; i < W; i += CELL) { ctx.moveTo(i + .5, 0); ctx.lineTo(i + .5, H); ctx.moveTo(0, i + .5); ctx.lineTo(W, i + .5); }
  ctx.stroke();
}
function shadeRegion(build, alpha, id) {
  ctx.save(); ctx.globalAlpha = alpha ?? 1; ctx.beginPath(); build(); ctx.clip();
  CC.el('shade', id); ctx.fillStyle = COL.shade; ctx.fillRect(0, 0, W, H);
  CC.el('shadeTile', id); tiles(COL.shadeTile);
  ctx.restore();
}
function pillarShadows(az) {
  const d = dirOf(az), L = shadowLen(), vx = d.x * L, vy = d.y * L;
  const one = (r, k) => {
    const c = pillarOutline(r);
    const h = hull(c.concat(c.map(q => [q[0] + vx * k, q[1] + vy * k])));
    ctx.moveTo(h[0][0], h[0][1]);
    for (let i = 1; i < h.length; i++) ctx.lineTo(h[i][0], h[i][1]);
    ctx.closePath();
  };
  return () => {
    for (const r of S.pillars) if (!(r.glass > 0)) one(r, 1);
    for (const r of S.casters) one(r, r.tall || 1);   // Züge, Segel, Gondeln, Dünen
  };
}
const shadowPaths = pillarShadows;
function textOut(txt, x, y, color, font, align) {
  ctx.font = font; ctx.textAlign = align || 'left';
  ctx.lineWidth = 4; ctx.strokeStyle = COL.body; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y);
  ctx.fillStyle = color; ctx.fillText(txt, x, y);
}
function drawSun(az, scale) {
  const d = dirOf(az);
  const k = Math.min((W / 2 - 16) / Math.max(Math.abs(d.x), 1e-6), (H / 2 - 16) / Math.max(Math.abs(d.y), 1e-6));
  const sx = W / 2 - d.x * k, sy = H / 2 - d.y * k;
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(S.t); sunShape(ctx, 0, 0, 9 * scale); ctx.restore();
}
const MONO = '700 13px "JetBrains Mono", monospace';
const KEY_HINTS = !(window.matchMedia && matchMedia('(pointer:coarse)').matches);

// ---------- Farbchaos (Chaos-Rad) ----------
// Stärke je Stufe. [a, b]: Wert auf Stufe 1–2 und ab Stufe „full“, dazwischen linear.
// Die Stufe zählt wie im HUD (Stufe 1 = S.level 0) plus DIFF.cc (Leicht −1, Schwer +1).
const CC_TUNE = {
  full: 8,               // ab dieser Stufe volle Stärke: alle Elemente, 12 Wechsel pro Sekunde (schon Stufe 1 ist fast voll)
  rate: [9, 12],         // harte Farbwechsel pro Sekunde
  share: [0.85, 1],      // Anteil der Elemente, die bei einem Wechsel eine Chaos-Farbe bekommen
  spread: [150, 180],    // so weit (Grad) springen die Farbtöne der Elemente auseinander
  jitter: [40, 50],      // zusätzlicher Versatz pro Farbe innerhalb eines Elements (Grad)
  chroma: [0.18, 0.22],  // Mindestsättigung, damit auch Grau, Schwarz und Weiß bunt werden (YIQ)
  sat: [1.7, 1.9],       // Sättigungsverstärkung (steigt bis Stufe 10 weiter)
  extra: [0.25, 0.35],   // Chance pro Wechsel auf einen Extra-Effekt
  extras: { shift: 1, swap: 1, invert: 1, flip: 1 },   // ab welcher Stufe welcher Extra-Effekt vorkommt
  lumaGap: 0.8,          // Sekunden Pause nach Invertierung oder Hell-Dunkel-Umkehr (Blitzschutz)
  calmRate: 2.5,         // „Grelle Blitze“ aus: höchstens so viele Wechsel pro Sekunde, weich überblendet, ohne Extras
  dur: [5, 8],           // Dauer in Sekunden (Stufe 1 bis Stufe 11)
  weight: [2, 3],        // Gewicht beim Auslosen (andere Ereignisse haben 1)
};

// Während Farbchaos läuft jede Farbe des Spielfelds durch CC.color(): fillStyle, strokeStyle, shadowColor und Verlaufsfarben
// werden direkt am Kontext des Spielfelds abgefangen, HUD, Herzen, Kraftleiste, Hinweise und Karten bekommen Inline-Farben.
// draw() meldet mit CC.el(name, i), welches Element gerade gezeichnet wird. Jedes Element würfelt pro Wechsel seinen eigenen Farbton.
// Gedreht wird im YIQ-Farbraum: Die Helligkeit Y bleibt exakt gleich, nur Farbton und Sättigung springen. Das wirkt wild, flackert aber
// nicht hell-dunkel. Nur Invertierung und Hell-Dunkel-Umkehr ändern Y, und die sind selten, dauern mindestens 0,4 s und haben eine Pause danach.
// Ohne Farbchaos hängt nichts am Kontext, Optik und Tempo bleiben wie vorher. Hitboxen, Schaden und Regeln berührt das Ereignis nicht.
const CC = (() => {
  const proto = CanvasRenderingContext2D.prototype, PROPS = ['fillStyle', 'strokeStyle', 'shadowColor'];
  const desc = Object.fromEntries(PROPS.map(k => [k, Object.getOwnPropertyDescriptor(proto, k)]));
  const norm = document.createElement('canvas').getContext('2d');   // übersetzt jede CSS-Farbe in #rrggbb oder rgba()
  const DOM_SEL = 'body, .hud > *, .hud span, .hud b, #hearts svg, #energy, .opp, .opp .tag, .opp b, .opp .bar i, .dashbtn, .toast, .toast span, .toast b, ' +
                  '#scrPick, #scrPick .panel, #scrPick h2, #scrPick .eyebrow, #pickTimer, #cards .card, #cards h3, #cards p, #cards span, #cards kbd';
  const DOM_CSS = [['background-color', 'background-color'], ['color', 'color'], ['border-top-color', 'border-color'], ['--rar', '--rar']];
  const DOM_ICONS = '#cards canvas, .toast canvas';
  const DEG = Math.PI / 180;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = ([a, b], t) => a + (b - a) * t;
  const lerpAng = (a, b, f) => a + ((((b - a) % 360) + 540) % 360 - 180) * f;
  const mix = (a, b) => { let h = Math.imul(a ^ (b + 0x9E3779B9 | 0), 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); return (h ^ h >>> 16) >>> 0; };
  const u = h => h / 4294967296;

  let hooked = false, seed = 0, prng = Math.random, lastKey = null, lastK = null, extraEnd = 0, lumaFree = 0;
  let name = '', idx = 0;
  const st = { stage: 1, rate: 3, share: 1, spread: 0, jitter: 0, chroma: 0, sat: 1, calm: false, k: 0, f: 0, extra: null, shift: 0, perm: 0 };
  const nameHash = new Map(), parsed = new Map(), cache = new Map(), elCache = new Map(), orig = new Map();
  const reduced = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  const stage = () => S.level + 1 + (S.diff.cc || 0);
  const ramp = s => clamp01((s - 2) / (CC_TUNE.full - 2));

  function parse(v) {
    let c = parsed.get(v);
    if (c !== undefined) return c;
    norm.fillStyle = '#000'; norm.fillStyle = v;
    const s = norm.fillStyle;
    if (s[0] === '#') c = [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
    else { const m = s.match(/[\d.]+/g); c = m && m.length >= 4 ? [+m[0], +m[1], +m[2], +m[3]] : null; }
    if (parsed.size > 4000) parsed.clear();
    parsed.set(v, c);
    return c;
  }
  // Zufallswerte eines Elements für Wechsel k: betroffen ja/nein, Farbtonversatz, Richtung für graue Farben
  function roll(eh, k) {
    const h = mix(mix(eh, k), seed);
    return { on: u(h) < st.share ? 1 : 0, off: (u(mix(h, 1)) * 2 - 1) * st.spread, dir: u(mix(h, 2)) * 360 };
  }
  const baseHue = k => u(mix(k, seed ^ 0x5BD1E995)) * 360;
  function elState(eh) {
    let e = elCache.get(eh);
    if (e) return e;
    const a = roll(eh, st.k);
    if (st.f) {   // weich: zum nächsten Wechsel hin überblenden
      const b = roll(eh, st.k + 1), f = st.f;
      e = { amt: a.on + (b.on - a.on) * f, hue: lerpAng(baseHue(st.k), baseHue(st.k + 1), f) + a.off + (b.off - a.off) * f, dir: lerpAng(a.dir, b.dir, f) };
    } else e = { amt: a.on, hue: baseHue(st.k) + a.off, dir: a.dir };
    elCache.set(eh, e);
    return e;
  }
  // Die zentrale Chaos-Farbe: v ist eine beliebige CSS-Farbe, eh die Kennung des Elements
  function recolor(v, eh) {
    const c = parse(v);
    if (!c || !c[3]) return v;
    const E = elState(eh), ex = st.extra;
    if (!E.amt && !ex) return v;
    let r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    if (ex === 'swap') { const t = r; if (st.perm) { r = b; b = g; g = t; } else { r = g; g = b; b = t; } }   // Kanäle tauschen, Helligkeit bleibt unten trotzdem y
    let i = 0.596 * r - 0.274 * g - 0.322 * b, q = 0.211 * r - 0.523 * g + 0.312 * b;
    let C = Math.hypot(i, q), th = Math.atan2(q, i);
    const cmin = st.chroma * E.amt;
    if (C < cmin) { if (C < 0.03) th = E.dir * DEG; C = cmin; }
    const hc = mix(eh, hashStr(v));
    let jit = u(mix(hc, st.k)) * 2 - 1;
    if (st.f) jit += (u(mix(hc, st.k + 1)) * 2 - 1 - jit) * st.f;
    jit *= st.jitter;
    th += (E.amt * (E.hue + jit) + (ex === 'shift' ? st.shift : 0)) * DEG;
    C *= 1 + (st.sat - 1) * E.amt;
    let Y = y;
    if (ex === 'invert') { Y = 1 - y; th += Math.PI; }
    else if (ex === 'flip') Y = 1 - y;
    i = C * Math.cos(th); q = C * Math.sin(th);
    // Zurück nach RGB. Ragt die Farbe aus dem Farbraum, wird nur die Sättigung gekürzt, damit Y exakt bleibt.
    const dr = 0.956 * i + 0.621 * q, dg = -0.272 * i - 0.647 * q, db = -1.106 * i + 1.703 * q;
    let k = 1;
    for (const d of [dr, dg, db]) { if (d > 1e-6) k = Math.min(k, (1 - Y) / d); else if (d < -1e-6) k = Math.min(k, Y / -d); }
    k = Math.max(0, k);
    const R = Math.round((Y + k * dr) * 255), G = Math.round((Y + k * dg) * 255), B = Math.round((Y + k * db) * 255);
    return c[3] >= 1 ? `rgb(${R},${G},${B})` : `rgba(${R},${G},${B},${c[3]})`;
  }
  function elHash() {
    let h = nameHash.get(name);
    if (h === undefined) { h = hashStr(name); nameHash.set(name, h); }
    return (h ^ Math.imul(idx + 1, 0x9E3779B1)) >>> 0;
  }
  function color(v) {
    const eh = elHash();
    let m = cache.get(eh);
    if (!m) { m = new Map(); cache.set(eh, m); }
    let out = m.get(v);
    if (out === undefined) { out = recolor(v, eh); m.set(v, out); }
    return out;
  }
  function wrapGrad(g) { const add = g.addColorStop; g.addColorStop = (o, col) => add.call(g, o, color(col)); return g; }

  function start() {
    hooked = true; seed = (Math.random() * 4294967296) >>> 0; prng = mulberry32(seed);
    lastKey = lastK = null; st.extra = null; extraEnd = lumaFree = 0;
    for (const k of PROPS) Object.defineProperty(ctx, k, { configurable: true, get() { return desc[k].get.call(this); },
      set(v) { desc[k].set.call(this, typeof v === 'string' ? color(v) : v); } });
    ctx.createLinearGradient = function () { return wrapGrad(proto.createLinearGradient.apply(this, arguments)); };
    ctx.createRadialGradient = function () { return wrapGrad(proto.createRadialGradient.apply(this, arguments)); };
  }
  function stop() {
    hooked = false;
    for (const k of PROPS) delete ctx[k];
    delete ctx.createLinearGradient; delete ctx.createRadialGradient;
    restoreDom(); cache.clear(); elCache.clear();
  }
  // Inline-Werte, die das Spiel selbst gesetzt hat (z. B. Herzfarben), merken und am Ende zurückschreiben
  function setDom(el, prop, val) {
    let o = orig.get(el);
    if (!o) { o = {}; orig.set(el, o); }
    if (!(prop in o)) o[prop] = el.style.getPropertyValue(prop);
    el.style.setProperty(prop, val);
  }
  function restoreDom() {
    for (const [el, o] of orig) for (const p in o) { if (o[p]) el.style.setProperty(p, o[p]); else el.style.removeProperty(p); }
    orig.clear();
  }
  function domTick() {
    restoreDom();   // erst die echten Farben lesen (Design, Warnfarben, Seltenheit), dann umfärben
    const els = [...document.querySelectorAll(DOM_SEL)], icons = [...document.querySelectorAll(DOM_ICONS)];
    const vals = els.map(el => { const cs = getComputedStyle(el); return DOM_CSS.map(([read]) => cs.getPropertyValue(read).trim()); });
    els.forEach((el, n) => {
      name = 'dom'; idx = n;
      DOM_CSS.forEach(([, write], j) => { const v = vals[n][j]; if (v && v !== 'none') { const c = color(v); if (c !== v) setDom(el, write, c); } });
    });
    const ex = st.extra;
    icons.forEach((el, n) => {
      const E = elState(mix(0xC0FFEE, n));
      const deg = Math.round(E.amt * E.hue + (ex === 'shift' ? st.shift : 0));
      setDom(el, 'filter', `hue-rotate(${deg}deg) saturate(${st.sat.toFixed(2)})` + (ex === 'invert' ? ' invert(1)' : ex === 'flip' ? ' invert(1) hue-rotate(180deg)' : ''));
    });
  }
  // Extra-Effekte würfeln (nur bei hartem Wechsel). Invertierung und Hell-Dunkel-Umkehr: mindestens 0,4 s, danach lumaGap Pause.
  function newTick(t) {
    if (st.extra && t >= extraEnd) {
      if (st.extra === 'invert' || st.extra === 'flip') lumaFree = t + CC_TUNE.lumaGap;
      st.extra = null;
    }
    if (st.calm || st.extra || prng() >= st.extraChance) return;
    const X = CC_TUNE.extras, opts = [];
    for (const e of ['shift', 'swap']) if (st.stage >= X[e]) opts.push(e);
    if (t >= lumaFree) for (const e of ['invert', 'flip']) if (st.stage >= X[e]) opts.push(e);
    if (!opts.length) return;
    const e = opts[Math.floor(prng() * opts.length)], luma = e === 'invert' || e === 'flip';
    st.extra = e; extraEnd = t + (luma ? 0.4 + prng() * 0.3 : 0.15 + prng() * 0.3);
    st.shift = 90 + prng() * 180; st.perm = prng() < 0.5 ? 1 : 0;
  }
  // Einmal pro Bild vor draw(): an- und abschalten, Stärke aus der Stufe, Wechsel weiterzählen
  function frame() {
    const want = !!(S && S.E.colorchaos > 0);
    if (!want) { if (hooked) stop(); return; }
    if (!hooked) start();
    const s = stage(), t = ramp(s);
    st.stage = s; st.calm = !P.settings.flashes || !!(reduced && reduced.matches);
    if (st.calm) st.extra = null;
    st.rate = st.calm ? Math.min(CC_TUNE.calmRate, lerp(CC_TUNE.rate, t)) : lerp(CC_TUNE.rate, t);
    st.share = lerp(CC_TUNE.share, t); st.spread = lerp(CC_TUNE.spread, t); st.jitter = lerp(CC_TUNE.jitter, t);
    st.chroma = lerp(CC_TUNE.chroma, t); st.extraChance = lerp(CC_TUNE.extra, t);
    st.sat = lerp(CC_TUNE.sat, clamp01((s - 1) / 9)) * (st.calm ? 0.85 : 1);
    const pos = S.t * st.rate, k = Math.floor(pos);
    st.k = k; st.f = st.calm ? pos - k : 0;
    const key = st.calm ? pos : k;
    if (key === lastKey) return;
    lastKey = key; cache.clear(); elCache.clear();
    if (k !== lastK) { lastK = k; newTick(S.t); }
    domTick();
  }
  return {
    frame, color,
    el(n, i) { name = n; idx = i || 0; },   // welches Element zeichnet draw() gerade?
    duration: () => lerp(CC_TUNE.dur, clamp01((stage() - 1) / 10)),
    weight: () => lerp(CC_TUNE.weight, ramp(stage())),
  };
})();

function draw() {
  const flashes = P.settings.flashes;
  ctx.save();
  if (S.shake > 0 && P.settings.shake) ctx.translate(fx(-1, 1) * S.shake * 9, fx(-1, 1) * S.shake * 9);
  if (S.map.dark) {
    CC.el('yard'); ctx.fillStyle = COL.shade; ctx.fillRect(-10, -10, W + 20, H + 20);
    CC.el('tile'); tiles(COL.shadeTile);
    drawTorchLight();
    CC.el('floor'); drawMapFloor();
  } else {
    CC.el('yard'); ctx.fillStyle = COL.lit; ctx.fillRect(-10, -10, W + 20, H + 20);
    CC.el('tile'); tiles(COL.tile);
    CC.el('floor'); drawMapFloor();
    if (sun2On()) {
      // Einzelschatten nur angedeutet, wo sich beide überlappen, ist voller Schatten
      const half = ruleOn('twosun') ? 0.5 : 0.3;
      shadeRegion(pillarShadows(S.az), half, 0); shadeRegion(pillarShadows(az2()), half, 1);
      ctx.save(); ctx.beginPath(); pillarShadows(az2())(); ctx.clip(); shadeRegion(pillarShadows(S.az), 1, 4); ctx.restore();
    }
    else if (extraLights().length) drawMultiShadow();
    else shadeRegion(pillarShadows(S.az), 1, 0);
    if (S.clouds.length) shadeRegion(() => { for (const c of S.clouds) { ctx.moveTo(c.x + c.rx, c.y); ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, TAU); } }, 1, 2);
  }
  CC.el('deco'); drawDeco();
  if (S.puddles.length) shadeRegion(() => {
    for (const q of S.puddles) {
      const max = q.max || 8, r = q.r * Math.min(1, (max - q.life) * 4) * Math.min(1, q.life);
      if (r > 0.5) { ctx.moveTo(q.x + r, q.y); ctx.arc(q.x, q.y, r, 0, TAU); }
    }
  }, 1, 3);

  // Honig
  for (const [n, h] of S.honey.entries()) {
    CC.el('honey', n);
    ctx.globalAlpha = Math.min(1, h.life) * 0.85;
    ctx.fillStyle = COL.honey;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU, rr = h.r * (0.85 + 0.15 * Math.sin(i * 2.3 + h.x)); ctx.lineTo(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr * 0.8); }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(h.x - h.r * 0.3, h.y - h.r * 0.25, h.r * 0.25, h.r * 0.12, -0.4, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Heiße Fliesen
  for (const [n, h] of S.hot.entries()) {
    const x = h.gx * CELL, y = h.gy * CELL;
    CC.el('hot', n);
    if (h.warn > 0) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(S.t * 18);
      ctx.strokeStyle = COL.hot; ctx.lineWidth = 3; ctx.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5);
    } else {
      ctx.globalAlpha = Math.min(1, h.life) * (0.75 + 0.15 * Math.sin(S.t * 10 + h.gx));
      ctx.fillStyle = COL.hot; ctx.fillRect(x + 1, y + 1, CELL - 1, CELL - 1);
      ctx.strokeStyle = COL.sun; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { const lx = x + 10 + i * 10, o = Math.sin(S.t * 6 + i) * 2; ctx.moveTo(lx, y + 30); ctx.quadraticCurveTo(lx + 4 + o, y + 20, lx, y + 10); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Portale
  if (S.portals) {
    const Pp = S.portals;
    for (const q of [Pp.a, Pp.b]) {
      CC.el('portal', q === Pp.a ? 0 : 1);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(S.t * 3);
      ctx.globalAlpha = Pp.life < 2 && Math.floor(Pp.life * 8) % 2 === 0 ? 0.3 : 1;
      ctx.scale(1.3, 1.3); icon(ctx, 'portal'); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Brennglas
  if (S.lens) {
    const Ln = S.lens, a = Ln.warn > 0 ? 0.35 + 0.3 * Math.sin(S.t * 20) : Math.min(1, Ln.life);
    ctx.globalAlpha = a; CC.el('lens');
    const g = ctx.createRadialGradient(Ln.x, Ln.y, 2, Ln.x, Ln.y, Ln.r);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#FFF6D0'); g.addColorStop(1, 'rgba(255,176,32,0.25)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(Ln.x, Ln.y, Ln.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.sun; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -S.t * 30;
    ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Leuchtturmstrahl
  if (S.beam) {
    const B = S.beam, R = 800;
    CC.el('beam');
    if (B.warn > 0) {
      ctx.strokeStyle = COL.warn; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(B.x + Math.cos(B.a) * R, B.y + Math.sin(B.a) * R); ctx.stroke(); ctx.setLineDash([]);
    } else {
      ctx.globalAlpha = Math.min(1, B.life) * 0.7;
      ctx.fillStyle = '#FFF6D0';
      ctx.beginPath(); ctx.moveTo(B.x, B.y);
      ctx.lineTo(B.x + Math.cos(B.a - 0.13) * R, B.y + Math.sin(B.a - 0.13) * R);
      ctx.lineTo(B.x + Math.cos(B.a + 0.13) * R, B.y + Math.sin(B.a + 0.13) * R);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Einschlagswarnungen
  for (const [n, m] of S.meteors.entries()) {
    const k = Math.max(0, Math.min(1, m.warn / 1.3));
    CC.el('meteor', n);
    ctx.strokeStyle = COL.warn; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(232,102,79,.25)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * (1 - k), 0, TAU); ctx.fill();
  }

  // Tau und Hilfsmittel
  for (const [n, w] of S.dews.entries()) { CC.el('dew', n); ctx.globalAlpha = Math.min(1, w.life); dropShape(ctx, w.x, w.y, 1 + Math.sin(S.t * 6 + w.x) * 0.12, COL.dew); }
  ctx.globalAlpha = 1;
  for (const [n, it] of S.items.entries()) {
    if (it.life < 2 && Math.floor(it.life * 8) % 2 === 0) continue;
    const bob = Math.sin(S.t * 4 + it.x) * 2;
    CC.el('item', n);
    ctx.fillStyle = 'rgba(20,24,33,.25)'; ctx.beginPath(); ctx.ellipse(it.x, it.y + 12, 9, 3, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(it.x, it.y + bob); icon(ctx, it.kind); ctx.restore();
  }

  // Säulen
  S.pillars.forEach((r, n) => { CC.el('pillar', n); drawPillar(r); });
  CC.el('torch'); drawTorches();
  CC.el('mapTop'); drawMapTop();

  // Aura des Schattenfressers und Lichtflecken des Nachtmahrs
  const E = eaterAura();
  CC.el('eaterAura');
  if (E) {
    const g = ctx.createRadialGradient(E.x, E.y, 10, E.x, E.y, E.aura);
    g.addColorStop(0, 'rgba(255,246,208,.55)'); g.addColorStop(1, 'rgba(255,246,208,.12)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(E.x, E.y, E.aura, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(201,184,255,.85)'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.lineDashOffset = S.t * 25;
    ctx.stroke(); ctx.setLineDash([]);
    if (E.state === 'gulp' && E.prey) {
      const r = E.prey;
      ctx.strokeStyle = 'rgba(201,184,255,' + (0.5 + 0.4 * Math.sin(S.t * 30)) + ')'; ctx.lineWidth = 3; ctx.setLineDash([9, 6]);
      ctx.beginPath(); ctx.moveTo(E.x, E.y); ctx.lineTo(pcx(r), pcy(r)); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 3; ctx.beginPath();
      if (r.round) ctx.arc(pcx(r), pcy(r), r.w / 2 + 4, 0, TAU); else ctx.rect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
      ctx.stroke();
    }
  }
  for (const [n, sp] of S.spots.entries()) {
    CC.el('spot', n);
    ctx.globalAlpha = sp.warn > 0 ? 0.35 + 0.3 * Math.sin(S.t * 20) : Math.min(1, sp.life);
    const g = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, sp.r);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.55, 'rgba(221,230,255,.85)'); g.addColorStop(1, 'rgba(160,170,255,.2)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#B8C4FF'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -S.t * 30; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Lichtwirbel
  if (S.vortex) {
    const V = S.vortex;
    CC.el('vortex');
    ctx.save(); ctx.translate(V.x, V.y); ctx.rotate(-S.t * 4);
    ctx.globalAlpha = Math.min(1, V.life) * 0.85;
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 46);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,176,32,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 46, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.sun; ctx.lineWidth = 2.5;
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (let i = 0; i < 30; i++) { const a = i * 0.25 + arm * TAU / 3, r = i * 1.5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // Laser
  for (const [n, L] of S.lasers.entries()) {
    const len = L.warn > 0 ? L.len : rayLen(L.x, L.y, L.a, L.len);
    CC.el('laser', n);
    const ex = L.x + Math.cos(L.a) * len, ey = L.y + Math.sin(L.a) * len;
    if (L.warn > 0) {
      ctx.strokeStyle = 'rgba(232,64,64,' + (0.35 + 0.3 * Math.sin(S.t * 30)) + ')'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
    } else {
      ctx.globalAlpha = Math.min(1, L.life * 4);
      ctx.lineCap = 'round';
      for (const [w, c] of [[11, 'rgba(255,60,60,.3)'], [4.5, '#FF4B4B'], [1.6, '#FFFFFF']]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(ex, ey); ctx.stroke();
      }
      ctx.fillStyle = '#FFD2C8'; ctx.beginPath(); ctx.arc(ex, ey, 4 + Math.sin(S.t * 40) * 1.5, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    }
    if (L.turret) {
      ctx.fillStyle = COL.top; ctx.beginPath(); ctx.arc(L.x, L.y, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = COL.edge; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#FF4B4B'; ctx.beginPath(); ctx.arc(L.x, L.y, 4, 0, TAU); ctx.fill();
    }
  }

  // Partikel
  const skinCol = (SKIN_BY[P.equip.skin] || SKINS[0]).body;
  for (const [n, q] of S.parts.entries()) {
    CC.el('part', n);
    ctx.globalAlpha = Math.max(0, q.life) * 0.8;
    if (q.ghost) {
      ctx.globalAlpha = q.life * 2.2; ctx.fillStyle = skinCol === 'rainbow' ? `hsl(${(S.t * 70) % 360} 62% 36%)` : skinCol;
      ctx.beginPath(); ctx.arc(q.x, q.y, pr() * 0.9, 0, TAU); ctx.fill();
    } else if (q.trail) {
      ctx.globalAlpha = 1; drawTrailPart(ctx, q, S.t);
    } else if (q.smoke) {
      ctx.globalAlpha = Math.min(0.4, q.life * 0.35); ctx.fillStyle = '#6B6470';
      ctx.beginPath(); ctx.arc(q.x, q.y, 3 + (1.4 - q.life) * 6, 0, TAU); ctx.fill();
    } else if (q.streak) {
      ctx.strokeStyle = COL.white; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.06, q.y - q.vy * 0.06); ctx.stroke();
    } else {
      ctx.fillStyle = q.spark || COL.white;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.spark ? 2 : 3 + (0.8 - q.life) * 4, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Gegner im Duell als Geist
  const O = Net.opp;
  if (Net.inMatch && O && O.alive && O.dx != null && S.mode !== 'ready') {
    CC.el('ghost');
    drawCreature(ctx, O.dx, O.dy, PR, { skin: O.skin, hat: O.hat, t: S.t + 1.3, alpha: 0.42, eyeAlpha: 0.6, ccHat: 'ghostHat' });
    // Gestrichelter Ring: Der Gegner-Geist ist auch ohne Farbunterschied von Ankern und Spiegel-Effekten zu trennen
    ctx.strokeStyle = 'rgba(233,227,255,.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(O.dx, O.dy, PR + 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.85;
    textOut(O.name, O.dx, O.dy - 24, '#E9E3FF', '700 10px "JetBrains Mono", monospace', 'center');
    ctx.globalAlpha = 1;
  }

  // Schattenanker
  if (S.anchor && S.mode !== 'ready') {
    const A = S.anchor, pulse = 0.5 + 0.5 * Math.sin(S.t * 6), blink = A.life < 2 && Math.floor(A.life * 8) % 2;
    CC.el('anchor');
    ctx.strokeStyle = 'rgba(109,91,208,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.lineDashOffset = -S.t * 30;
    ctx.beginPath(); ctx.moveTo(S.p.x, S.p.y); ctx.lineTo(A.x, A.y); ctx.stroke(); ctx.setLineDash([]);
    if (!blink) {
      ctx.fillStyle = 'rgba(20,24,33,.55)'; ctx.beginPath(); ctx.arc(A.x, A.y, 9 + pulse * 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#C9B8FF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(A.x, A.y, 14, -Math.PI / 2, -Math.PI / 2 + TAU * A.life / ANCHOR_LIFE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(A.x, A.y - 6); ctx.lineTo(A.x, A.y + 5); ctx.moveTo(A.x - 5, A.y + 1); ctx.quadraticCurveTo(A.x, A.y + 8, A.x + 5, A.y + 1); ctx.moveTo(A.x - 3, A.y - 3); ctx.lineTo(A.x + 3, A.y - 3); ctx.stroke();
    }
  }

  // Extra-Modi: Ziele, Geister, zweite Figur (js/modes.js)
  const XX = XM();
  if (XX && XX.drawWorld && S.mode !== 'ready') { CC.el('extra'); XX.drawWorld(); }

  // Spielfigur
  if (S.mode !== 'ready') {
    const p = S.p, R = pr();
    if (S.parry > 0 || S.parryFx > 0) {
      CC.el('parry');
      const k = S.parryFx > 0 ? 1 - S.parryFx / 0.35 : 0;
      ctx.strokeStyle = S.parryFx > 0 ? 'rgba(255,194,26,' + (1 - k) + ')' : 'rgba(255,246,208,.95)';
      ctx.lineWidth = S.parryFx > 0 ? 4 : 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, R + 9 + k * 22, 0, TAU); ctx.stroke();
      if (S.parry > 0) { ctx.fillStyle = 'rgba(255,227,107,.22)'; ctx.beginPath(); ctx.arc(p.x, p.y, R + 9, 0, TAU); ctx.fill(); }
    }
    CC.el('aura');
    if (on('shield')) {
      const blink = S.E.shield < 1.5 && Math.floor(S.E.shield * 8) % 2 === 0;
      if (!blink) {
        ctx.fillStyle = 'rgba(63,76,107,.55)'; ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, TAU); ctx.fill();
        ctx.strokeStyle = COL.umbrella; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, S.E.shield / S.shieldMax)); ctx.stroke();
      }
    }
    if (S.bubble > 0) {
      ctx.fillStyle = 'rgba(111,195,255,.18)'; ctx.strokeStyle = S.inv > 0 ? '#FFFFFF' : '#6FC3FF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 19 + Math.sin(S.t * 5) * 1.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6FC3FF';
      for (let i = 0; i < S.bubble; i++) { const a = S.t * 2 + i * TAU / 3; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 19, p.y + Math.sin(a) * 19, 3, 0, TAU); ctx.fill(); }
    }
    if (on('spikes')) {
      ctx.fillStyle = '#8A93A6';
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + S.t * 3; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 17, p.y + Math.sin(a) * 17); ctx.lineTo(p.x + Math.cos(a + 0.25) * 11, p.y + Math.sin(a + 0.25) * 11); ctx.lineTo(p.x + Math.cos(a - 0.25) * 11, p.y + Math.sin(a - 0.25) * 11); ctx.fill(); }
    }
    if (S.charges < maxCharges() && S.dashMax > 0) {
      ctx.strokeStyle = 'rgba(20,24,33,.55)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y + R + 5, 5, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, 1 - S.dashCd / S.dashMax)); ctx.stroke();
    }
    if (maxCharges() > 1) {
      for (let i = 0; i < maxCharges(); i++) {
        ctx.fillStyle = i < S.charges ? '#3FC7C4' : 'rgba(20,24,33,.35)';
        ctx.beginPath(); ctx.arc(p.x - 4 + i * 8, p.y - R - 17, 2.4, 0, TAU); ctx.fill();
      }
    }
    if (on('boots')) { ctx.fillStyle = 'rgba(43,143,214,.35)'; ctx.beginPath(); ctx.arc(p.x, p.y + R, R * 1.2, 0, TAU); ctx.fill(); }
    if (on('magnet')) { ctx.strokeStyle = 'rgba(217,70,59,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.lineDashOffset = S.t * 40; ctx.beginPath(); ctx.arc(p.x, p.y, 40 + (S.t * 40 % 30), 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    const alpha = (0.35 + 0.65 * S.energy / 100) * (S.hurt > 0 && Math.floor(S.hurt * 20) % 2 ? 0.3 : 1);
    CC.el('player');
    drawCreature(ctx, p.x, p.y, R, { skin: P.equip.skin, hat: P.equip.hat, t: S.t, alpha, eyeAlpha: 1, ccHat: 'hat',
      tint: on('invert') ? COL.shroom : (XX && ((S.xr && S.xr.tint) || XX.tint)) || null, eyes: S.burn > 0 ? 'burn' : on('invert') ? 'dizzy' : S.mode === 'over' && S.won ? 'happy' : 'open' });
  }

  // Käfer
  for (const [n, b] of S.bugs.entries()) {
    CC.el('bug', n);
    ctx.globalAlpha = Math.min(1, b.life);
    const g = 0.5 + 0.5 * Math.sin(S.t * 12 + b.ph);
    ctx.fillStyle = on('frost') ? 'rgba(143,211,255,.5)' : 'rgba(255,227,107,' + (0.25 + 0.2 * g) + ')';
    ctx.beginPath(); ctx.arc(b.x, b.y, 11 + g * 3, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.bug; ctx.strokeStyle = '#8A5A00'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    const f = on('frost') ? 0 : Math.sin(S.t * 40 + b.ph) * 3;
    ctx.beginPath(); ctx.moveTo(b.x - 3, b.y - 3); ctx.lineTo(b.x - 8, b.y - 6 + f); ctx.moveTo(b.x + 3, b.y - 3); ctx.lineTo(b.x + 8, b.y - 6 + f); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Elstern
  for (const [n, g] of S.magpies.entries()) {
    CC.el('magpie', n);
    ctx.save(); ctx.translate(g.x, g.y); ctx.scale(-(g.face || 1) * 1.2, 1.2);
    icon(ctx, 'magpie');
    const flap = on('frost') ? 0 : Math.sin(S.t * 18 + g.ph) * 6;
    ctx.strokeStyle = COL.body; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, -6 - flap); ctx.stroke();
    ctx.restore();
    if (g.carry) textOut('×' + g.carry, g.x + 10, g.y - 10, COL.dew, '700 11px "JetBrains Mono", monospace');
  }

  // Schattenklon
  if (S.decoy) {
    const D = S.decoy;
    CC.el('decoy');
    ctx.save(); ctx.translate(D.x, D.y + Math.sin(S.t * 6) * 1.5);
    if (D.life < 1.5 && Math.floor(D.life * 10) % 2) ctx.globalAlpha = 0.3;
    ctx.scale(0.95, 0.95); icon(ctx, 'decoy'); ctx.restore(); ctx.globalAlpha = 1;
  }

  // Sägeblätter
  for (const [n, s] of S.saws.entries()) {
    CC.el('saw', n);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(S.t * 14);
    if (s.life < 1) ctx.globalAlpha = s.life;
    ctx.scale(1.1, 1.1); icon(ctx, 'saw'); ctx.restore(); ctx.globalAlpha = 1;
  }

  // Suchraketen
  for (const [n, m] of S.missiles.entries()) {
    CC.el('missile', n);
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a + 0.6);
    icon(ctx, 'missile'); ctx.restore();
  }

  // Lichtkugeln
  for (const [n, s] of S.shots.entries()) {
    CC.el('shot', n);
    if (s.hard) {   // Glutkugel: lässt sich nicht parieren
      const g = 0.5 + 0.5 * Math.sin(S.t * 18 + n);
      ctx.fillStyle = 'rgba(214,40,40,' + (0.3 + 0.25 * g) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, 10 + g * 2, 0, TAU); ctx.fill();
      // Kein Kreis, sondern ein drehender Stachelstern: Die Glutkugel faellt auch ohne Farbe als Gefahr auf
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(S.t * 4 + n);
      ctx.fillStyle = '#3A0A12'; ctx.strokeStyle = '#FF3B3B'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 4.5 : 9; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      continue;
    }
    ctx.fillStyle = s.ref ? 'rgba(201,184,255,.5)' : 'rgba(255,227,107,.45)'; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = s.ref ? '#FFFFFF' : '#FFF6D0'; ctx.strokeStyle = s.ref ? '#6D5BD0' : COL.sun; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, TAU); ctx.fill(); ctx.stroke();
    if (s.ref) { ctx.setLineDash([3, 3]); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  }

  // Boss
  if (S.boss) {
    const B = S.boss;
    CC.el('boss');
    if (B.state === 'aim' && B.enter <= 0) {
      ctx.strokeStyle = 'rgba(232,64,64,' + (0.4 + 0.4 * Math.sin(S.t * 25)) + ')'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
      ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(B.tx, B.ty); ctx.stroke(); ctx.setLineDash([]);
    }
    if (B.rage) {
      const g = 0.5 + 0.5 * Math.sin(S.t * 10);
      ctx.fillStyle = 'rgba(232,64,64,' + (0.18 + 0.17 * g) + ')'; ctx.beginPath(); ctx.arc(B.x, B.y, B.r + 12 + g * 5, 0, TAU); ctx.fill();
    }
    ctx.save(); ctx.translate(B.x, B.y);
    const sc = B.enter > 0 ? Math.max(0.05, 1 - B.enter) : 1; ctx.scale(sc, sc);
    if (B.inv > 0 && Math.floor(B.inv * 20) % 2) ctx.globalAlpha = 0.35;
    bossBody(ctx, B.type, S.t, B);
    ctx.restore(); ctx.globalAlpha = 1;
    if (B.state === 'stun') for (let i = 0; i < 3; i++) {
      const a = S.t * 5 + i * TAU / 3;
      ctx.save(); ctx.translate(B.x + Math.cos(a) * 22, B.y - 34 + Math.sin(a) * 6); ctx.scale(0.45, 0.45); icon(ctx, 'star'); ctx.restore();
    }
  }

  // Einschläge im Anflug
  for (const [n, m] of S.meteors.entries()) {
    if (m.warn > 0.8) continue;
    const k = m.warn / 0.8, mx = m.x + 160 * k, my = m.y - 220 * k;
    CC.el('spark', n);
    ctx.strokeStyle = 'rgba(255,176,32,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 24, my - 32); ctx.stroke();
    ctx.fillStyle = COL.hot; ctx.beginPath(); ctx.arc(mx, my, 7, 0, TAU); ctx.fill();
  }

  // Wolken
  const d = dirOf(S.az);
  for (const [n, c] of S.clouds.entries()) {
    const cx = c.x - d.x * 26, cy = c.y - d.y * 26;
    CC.el('cloud', n);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, c.rx * 0.75, c.ry * 0.7, 0, 0, TAU);
    ctx.ellipse(cx - c.rx * 0.45, cy + 4, c.rx * 0.45, c.ry * 0.5, 0, 0, TAU);
    ctx.ellipse(cx + c.rx * 0.45, cy + 2, c.rx * 0.5, c.ry * 0.55, 0, 0, TAU);
    ctx.fill();
  }

  // Sonne(n)
  if (!on('eclipse') && !S.map.dark && !duskDark()) { CC.el('sun', 0); drawSun(S.az, on('noon') ? 1.6 : 1); CC.el('sun', 1); if (sun2On()) drawSun(az2(), 1); CC.el('sky'); drawMapSky(); }
  if (duskDark()) drawDarkness();
  drawMapOverlay();

  // Überblendungen
  CC.el('overlay');
  if (on('eclipse')) { ctx.fillStyle = 'rgba(12,15,26,.45)'; ctx.fillRect(-10, -10, W + 20, H + 20); }
  if (on('noonWarn')) { ctx.fillStyle = 'rgba(255,255,255,' + (flashes ? 0.18 + 0.12 * Math.sin(S.t * 25) : 0.15) + ')'; ctx.fillRect(-10, -10, W + 20, H + 20); }
  if (on('noon')) { ctx.fillStyle = 'rgba(255,240,200,.12)'; ctx.fillRect(-10, -10, W + 20, H + 20); }
  if (on('slow')) { ctx.fillStyle = 'rgba(47,158,110,.1)'; ctx.fillRect(-10, -10, W + 20, H + 20); }
  if (on('frost')) { ctx.fillStyle = 'rgba(143,211,255,.14)'; ctx.fillRect(-10, -10, W + 20, H + 20); }
  if (on('zap')) { ctx.fillStyle = 'rgba(108,92,231,' + S.E.zap * (flashes ? 2 : 0.8) + ')'; ctx.fillRect(-10, -10, W + 20, H + 20); }
  if (S.mode === 'play' && S.energy < 20) {
    const pulse = 0.25 + 0.15 * Math.sin(S.t * 8);
    const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.75);
    g.addColorStop(0, 'rgba(195,64,44,0)'); g.addColorStop(1, 'rgba(195,64,44,' + pulse + ')');
    ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20);
  }
  if (S.hurt > 0) { ctx.strokeStyle = 'rgba(232,102,79,' + S.hurt * 1.5 + ')'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, W - 10, H - 10); }
  if (on('flash')) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(flashes ? 0.93 : 0.55, S.E.flash) + ')'; ctx.fillRect(-10, -10, W + 20, H + 20); }
  ctx.restore();

  // Anzeigen
  if (S.mode === 'play' || S.mode === 'pick' || S.mode === 'pause') {
    const tag = S.rules.size ? ' · ' + [...S.rules].map(id => RULE_BY[id].name).join(' + ') : S.cfg.mode === 'campaign' ? tr(' von 10', ' of 10') : '';
    CC.el('text');
    textOut(XX && XX.label ? XX.label() : tr('Stufe ', 'Level ') + (S.level + 1) + tag, 12, 22, COL.white, MONO);
    if (S.energy < 20) textOut(tr('Letzte Kraft: Zeitlupe', 'Last stand: slow motion'), W - 12, H - 68, COL.warn, MONO, 'right');
    if (!(XX && XX.noAbilityHud) && !S.cfg.remote) {   // der Gast im Koop hat keine eigenen Fähigkeiten
      // Mit Tastatur steht die Taste vor jeder Faehigkeit, auf dem Handy gibt es Knoepfe darunter
      const kE = KEY_HINTS ? 'E · ' : '', kQ = KEY_HINTS ? 'Q · ' : '', kD = KEY_HINTS ? 'Shift · ' : '';
      const aTxt = S.anchor ? kE + tr('Anker ', 'Anchor ') + S.anchor.life.toFixed(1) + tr(' s · springt', ' s · jump') : S.anchorCd > 0 ? kE + tr('Anker ', 'Anchor ') + S.anchorCd.toFixed(1) + ' s' : kE + tr('Anker bereit', 'Anchor ready');
      textOut(aTxt, W - 12, H - 50, S.anchor ? '#C9B8FF' : S.anchorCd > 0 ? '#98A1B4' : '#FFFFFF', MONO, 'right');
      textOut(S.parryCd > 0 ? kQ + tr('Spiegel ', 'Mirror ') + S.parryCd.toFixed(1) + ' s' : kQ + tr('Spiegel bereit', 'Mirror ready'), W - 12, H - 32, S.parryCd > 0 ? '#98A1B4' : '#FFFFFF', MONO, 'right');
      const ready = S.charges > 0;
      textOut(ready ? (maxCharges() > 1 ? kD + 'Dash ×' + S.charges : kD + tr('Dash bereit', 'Dash ready')) : kD + 'Dash ' + S.dashCd.toFixed(1) + ' s', W - 12, H - 14, ready ? '#FFFFFF' : '#98A1B4', MONO, 'right');
    }
    if (S.boss) {
      const B = S.boss, bw = 220, bx = (W - bw) / 2, by = 30;
      CC.el('bossBar');
      textOut(bossLabel(B.type) + (B.state === 'stun' ? tr(' · benommen', ' · dazed') : B.rage ? tr(' · wütend', ' · enraged') : ''), W / 2, 24, '#F4CF63', '800 12px "Unbounded", "Arial Black", sans-serif', 'center');
      ctx.fillStyle = 'rgba(20,24,33,.85)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 14);
      ctx.fillStyle = COL.warn; ctx.fillRect(bx, by, bw * Math.max(0, B.hp) / B.maxHp, 8);
      if (isFinite(B.maxTime)) {
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(bx, by + 9, bw * Math.max(0, B.time) / B.maxTime, 2);
        textOut(Math.ceil(Math.max(0, B.time)) + ' s', bx + bw + 8, by + 9, '#FFFFFF', '700 11px "JetBrains Mono", monospace');
      }
    }
    drawWindVane();
    const list = [];
    const lab = { shield: [tr('Schirm', 'Umbrella'), COL.umbrella], slow: [tr('Sanduhr', 'Hourglass'), '#5FBE90'], magnet: ['Magnet', COL.magnet], boots: ['Turbo', '#6FB8F0'],
                  star: [tr('Punkte ×2', 'Points ×2'), COL.gold], frost: ['Frost', COL.frost], shrink: [tr('Winzig', 'Tiny'), COL.shrink], invert: [tr('Verdreht', 'Inverted'), '#C98AE6'],
                  eclipse: [tr('Finsternis', 'Eclipse'), '#8E9CC2'], sun2: [tr('Zwei Sonnen', 'Two suns'), COL.sun], wind: [tr('Sturm', 'Gale'), COL.white], noon: [tr('Mittag', 'Noon'), COL.sun],
                  dashy: [tr('Dauerdash', 'Dash frenzy'), '#3FC7C4'], spikes: [tr('Stacheln', 'Spikes'), '#B8C0CF'], colorchaos: [tr('Farbchaos', 'Color chaos'), '#E0457B'] };
    for (const k in lab) if (on(k)) list.push([lab[k][0] + ' ' + S.E[k].toFixed(1) + ' s', lab[k][1]]);
    if (S.bubble > 0) list.push([tr('Schild ×', 'Shield ×') + S.bubble, '#6FC3FF']);
    if (S.decoy) list.push([tr('Klon ', 'Clone ') + S.decoy.life.toFixed(1) + ' s', '#C9B8FF']);
    if (S.lucky > 0) list.push([tr('Glück ×', 'Luck ×') + S.lucky, '#5FBE90']);
    if (S.combo > 1) list.push([tr('Kombo ×', 'Combo ×') + S.combo, COL.dew]);
    list.forEach((f, i) => { CC.el('status', i); textOut(f[0], 12, H - 14 - i * 18, f[1], MONO); });
    if (XX && XX.drawHud) { CC.el('extraHud'); XX.drawHud(); }
  }
  if (S.mode === 'count') {
    const n = Math.ceil(S.countT), k = S.countT - Math.floor(S.countT);
    ctx.globalAlpha = 0.35 + 0.65 * k;
    textOut(n > 0 ? String(n) : tr('LOS!', 'GO!'), W / 2, H / 2 + 26, '#F4CF63', '800 ' + Math.round(56 + (1 - k) * 18) + 'px "Unbounded", "Arial Black", sans-serif', 'center');
    ctx.globalAlpha = 1;
    textOut(XX ? xmName(XX) : tr('Duell gegen ', 'Duel against ') + (Net.opp ? Net.opp.name : '…'), W / 2, H / 2 - 50, '#FFFFFF', '800 15px "Unbounded", "Arial Black", sans-serif', 'center');
  }
  if (S.msg) {
    CC.el('msg');
    ctx.globalAlpha = Math.min(1, S.msg.t * 2);
    textOut(S.msg.text, W / 2, S.boss && S.mode === 'play' ? 72 : 56, S.msg.color, '800 18px "Unbounded", "Arial Black", sans-serif', 'center');
    ctx.globalAlpha = 1;
  }
  if (S.banner) {
    const b = S.banner, k = Math.min(1, b.t * 2, (2.2 - b.t) * 6);
    ctx.globalAlpha = Math.max(0, k); CC.el('banner');
    ctx.fillStyle = 'rgba(20,24,33,.85)'; ctx.fillRect(0, H / 2 - 38, W, 64);
    ctx.fillStyle = b.good ? '#5FBE90' : COL.warn; ctx.fillRect(0, H / 2 - 38, W, 3); ctx.fillRect(0, H / 2 + 23, W, 3);
    textOut(b.head || tr('CHAOS-RAD', 'CHAOS WHEEL'), W / 2, H / 2 - 16, '#98A1B4', '700 11px "JetBrains Mono", monospace', 'center');
    textOut(b.text, W / 2, H / 2 + 12, b.good ? '#5FBE90' : '#F4CF63', '800 24px "Unbounded", "Arial Black", sans-serif', 'center');
    ctx.globalAlpha = 1;
  }
  if (S.cfg.mode === 'tutorial') { CC.el('tutorial'); tutDraw(); }
}
