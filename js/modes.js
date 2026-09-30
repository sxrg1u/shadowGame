'use strict';
// Extra-Modi: Schattenrennen, Eine Säule, Bossrausch, Sammler, Umgekehrt, Ein Leben, Rätselstufen,
// Koop und Fangen (zu zweit an einer Tastatur) und Battle Royale light (online, bis zu 8 Spieler).
//
// Jeder Modus ist ein Objekt in EXTRA. game.js fragt ihn über XM() und xf() ab:
//   Schalter  noWheel, noClouds, noHot, noLens, noBugs, noDew, noItems, noLevels, noHearts, noUpgrades,
//             noTimeScore, noBurn, noMove, noAbilityHud, invert, coreFinal
//   Werte     omega(), shadowLen(), shadowF(), burnF(), bossFor(level), dewCap, dewF, tint, walletF
//   Abläufe   init(), update(dt), onDeath(), bossDown(B), dash(tx, ty), onKey(e), onClick(p)
//   Anzeige   label(), drawWorld(), drawHud(), bestLabel(), meta(), result(), record(won, sc), again(), againLabel(), backTo()

const xmName = X => tr(X.name[0], X.name[1]);
const xmData = id => { P.xm = P.xm || {}; return (P.xm[id] = P.xm[id] || {}); };
const secs = t => (Math.round(t * 100) / 100).toFixed(2) + ' s';
// Welche Karte ein Modus nimmt: 'yard' immer den Innenhof, 'sun' die gewählte Karte, wenn sie eine Sonne hat, 'any' die gewählte Karte
function xmMap(X) {
  if (X.maps === 'yard') return 'yard';
  const m = MAP_BY[P.settings.map];
  if (!m || !mapUnlocked(m) || (X.maps === 'sun' && m.dark)) return 'yard';
  return m.id;
}
function startExtra(id, extra) {
  const X = EXTRA[id], cfg = Object.assign({ mode: id, diff: 'normal' }, extra || {});
  if (!cfg.map) cfg.map = xmMap(X);
  if (cfg.seed == null && X.seed) cfg.seed = X.seed(cfg.map, cfg);
  startRun(cfg);
}
// Zweiter Spieler an derselben Tastatur: Pfeiltasten
const keys2 = new Set();
const KEY2 = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
document.addEventListener('keyup', e => { if (KEY2[e.key]) keys2.delete(KEY2[e.key]); });
const axis = k => ({ x: (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0), y: (k.has('down') ? 1 : 0) - (k.has('up') ? 1 : 0) });
const OFF_ALL = { noWheel: true, noClouds: true, noHot: true, noLens: true, noBugs: true, noDew: true, noItems: true, noLevels: true, noHearts: true, noUpgrades: true };

// Kleine Zeichenhilfen
function ring(x, y, r, col, w, dash) {
  ctx.strokeStyle = col; ctx.lineWidth = w || 2; if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
}
function flag(x, y, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,24,33,.3)'; ctx.beginPath(); ctx.ellipse(0, 12, 10, 3, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = COL.body; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(-5, -16); ctx.stroke();
  const wav = Math.sin(t * 6) * 2;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    ctx.fillStyle = (i + j) % 2 ? COL.body : '#FFFFFF';
    ctx.fillRect(-4 + i * 5, -16 + j * 5 + (i === 2 ? wav * 0.5 : 0), 5, 5);
  }
  ctx.restore();
}
function ghostOf(x, y, o) {
  drawCreature(ctx, x, y, PR, Object.assign({ t: S.t + 1.3, alpha: 0.4, eyeAlpha: 0.6, skin: P.equip.skin, hat: P.equip.hat }, o));
}
function hudLines(lines, x, y, align) {
  lines.forEach((l, i) => { if (l) textOut(l[0], x, y + i * 18, l[1] || COL.white, MONO, align || 'right'); });
}

// ---------- Rätselstufen ----------
// Zugweise auf dem Fliesenraster (12 × 12 Felder à 40 px): Ein Schritt geht 1 Feld, ein Dash 2 Felder, Warten bleibt stehen.
// Alles zählt als ein Zug, danach dreht sich die Sonne um „step“ Grad. Wer einen Zug im Licht beendet, verliert ein Leben.
// Angaben in Feldern: Säulen [Spalte, Zeile, Breite, Höhe] oder [Spalte, Zeile, Größe, Größe, 1] für rund, start und goal [Spalte, Zeile].
// az: Richtung, in die die Schatten zeigen (0 = nach rechts, 90 = nach unten). par ist der kürzeste Weg laut pzSolve().
const PZ_T = 40, PZ_N = 12;
const PUZZLES = [
  { name: ['Allee', 'Avenue'], az: 90, step: 0, L: 110, start: [1, 4], goal: [10, 3], par: 5, pillars: [[1, 1, 1, 1], [3, 1, 1, 1], [5, 1, 1, 1], [6, 1, 1, 1], [8, 1, 1, 1], [10, 1, 1, 1]] },
  { name: ['Karussell', 'Carousel'], az: 47, step: 45, L: 93, start: [7, 7], goal: [1, 8], par: 4, pillars: [[4, 4, 4, 4, 1]] },
  { name: ['Sonnenuhr', 'Sundial'], az: 76, step: 20, L: 130, start: [2, 2], goal: [10, 11], par: 6, pillars: [[6, 10, 2, 2], [6, 4, 2, 2], [10, 9, 1, 1], [3, 1, 2, 2], [1, 0, 2, 2], [6, 7, 2, 2]] },
  { name: ['Gegenwind', 'Headwind'], az: 213, step: -30, L: 106, start: [9, 10], goal: [2, 1], par: 6, pillars: [[0, 2, 2, 2], [8, 1, 2, 2], [5, 6, 2, 2], [8, 11, 1, 1], [6, 10, 1, 1], [4, 5, 2, 2], [10, 10, 2, 2]] },
  { name: ['Schachbrett', 'Checkerboard'], az: 59, step: 90, L: 94, start: [1, 5], goal: [11, 6], par: 6, pillars: [[2, 1, 1, 1], [5, 1, 1, 1], [1, 4, 1, 1], [4, 4, 1, 1], [7, 4, 1, 1], [10, 4, 1, 1], [2, 7, 1, 1], [5, 7, 1, 1], [11, 7, 1, 1], [1, 10, 1, 1], [4, 10, 1, 1], [7, 10, 1, 1], [10, 10, 1, 1]] },
  { name: ['Doppelschritt', 'Double step'], az: 183, step: 60, L: 107, start: [8, 10], goal: [4, 0], par: 6, pillars: [[10, 10, 1, 1], [7, 2, 1, 1], [6, 4, 1, 1], [6, 0, 1, 1], [7, 5, 1, 1], [9, 1, 1, 1], [8, 8, 1, 1]] },
  { name: ['Korridor', 'Corridor'], az: 90, step: 15, L: 117, start: [4, 10], goal: [6, 0], par: 7, pillars: [[0, 8, 7, 1], [8, 8, 4, 1], [0, 5, 5, 1], [6, 5, 6, 1], [0, 2, 4, 1], [5, 2, 7, 1]] },
  { name: ['Lichtung', 'Clearing'], az: 126, step: 30, L: 139, start: [1, 10], goal: [10, 8], par: 7, pillars: [[5, 5, 2, 2, 1], [5, 7, 2, 2, 1], [1, 8, 2, 2, 1], [1, 4, 2, 2, 1], [7, 7, 2, 2, 1]] },
  { name: ['Sonnenfinale', 'Sun finale'], az: 41, step: -40, L: 125, start: [2, 2], goal: [10, 10], par: 9, pillars: [[8, 10, 2, 2], [10, 6, 1, 1], [1, 0, 2, 2], [4, 5, 4, 1], [6, 1, 1, 4], [7, 6, 2, 2, 1]] },
  { name: ['Engpass', 'Bottleneck'], az: 153, step: 25, L: 121, start: [0, 3], goal: [8, 8], par: 10, pillars: [[0, 6, 3, 1], [4, 6, 8, 1], [11, 1, 1, 1], [9, 9, 1, 1], [1, 3, 1, 1], [8, 7, 1, 1]] },
];
const pzX = c => c * PZ_T + PZ_T / 2;
function pzPillar([c, r, w, h, round]) {
  if (round) { const d = w * PZ_T - 8; return { x: c * PZ_T + (w * PZ_T - d) / 2, y: r * PZ_T + (h * PZ_T - d) / 2, w: d, h: d, round: true, crumble: 0, fixed: true }; }
  return { x: c * PZ_T + 3, y: r * PZ_T + 3, w: w * PZ_T - 6, h: h * PZ_T - 6, crumble: 0, fixed: true };
}
function puzzleStars() { const d = (P.xm && P.xm.puzzle) || {}; let n = 0; for (const k in d) n += d[k].stars || 0; return n; }
const pzUnlocked = i => i === 0 || !!((P.xm && P.xm.puzzle || {})[i - 1]);
const pzFree = (c, r) => c >= 0 && r >= 0 && c < PZ_N && r < PZ_N && !inPillar(pzX(c), pzX(r), 4);
// Ein Zug: Feld für Feld, bis zur Wand oder Säule. Gibt das Zielfeld zurück.
function pzStep(c, r, dx, dy, n) {
  for (let i = 0; i < n; i++) { if (!pzFree(c + dx, r + dy)) break; c += dx; r += dy; }
  return [c, r];
}
const PZ_DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const PZ_KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1], A: [-1, 0], D: [1, 0], W: [0, -1], S: [0, 1] };
const pzDirTo = (x, y) => PZ_DIRS[((Math.round(Math.atan2(y, x) / (Math.PI / 4)) % 8) + 8) % 8];
// Kürzester Weg (Breitensuche über Feld, Sonnenstand und Leben). Zum Prüfen der Level: pzSolve() in der Konsole, während ein Rätsel läuft.
function pzSolve(maxDepth = 20, noDamage = false) {
  const L = S.xr.lv, az0 = L.az * Math.PI / 180, st = L.step * Math.PI / 180, saveAz = S.az;
  const acts = [[0, 0, 0]].concat(PZ_DIRS.map(d => [d[0], d[1], 1]), PZ_DIRS.map(d => [d[0], d[1], 2]));
  let layer = [[L.start[0], L.start[1], 3]];
  const seen = new Set();
  for (let depth = 1; depth <= maxDepth && layer.length; depth++) {
    const next = [], phase = st ? (((depth * L.step) % 360) + 360) % 360 : 0;
    S.az = az0 + depth * st;
    for (const [c, r, lives] of layer) for (const [dx, dy, n] of acts) {
      const [c2, r2] = pzStep(c, r, dx, dy, n);
      if (c2 === L.goal[0] && r2 === L.goal[1]) { S.az = saveAz; return { moves: depth, lives }; }
      const l2 = lives - (inShadow(pzX(c2), pzX(r2)) ? 0 : 1);
      if (l2 <= 0 || (noDamage && l2 < 3)) continue;
      const key = c2 + ',' + r2 + ',' + phase + ',' + l2;
      if (seen.has(key)) continue;
      seen.add(key); next.push([c2, r2, l2]);
    }
    layer = next;
  }
  S.az = saveAz;
  return null;
}

// ---------- Mehrspieler-Räume für Battle Royale, Koop und Fangen (PeerJS, Gastgeber in der Mitte) ----------
// Battle Royale: Jeder spielt in seiner eigenen Welt, der Gastgeber verteilt Positionen, Ausscheiden und Sieg.
// Koop und Fangen: Nur der Gastgeber rechnet das Spiel. Der Gast schickt seine Eingaben und bekommt ~20-mal pro Sekunde ein Abbild (snap).
const BR_PREFIX = 'schattenfaenger-br-';
const BR_MAX = 8;
// Was der Gast vom Spielstand zum Zeichnen braucht
const SNAP_KEYS = ['t', 'sunT', 'az', 'noonF', 'mode', 'countT', 'pillars', 'casters', 'fx', 'torches', 'deco', 'clouds', 'puddles', 'honey', 'hot', 'portals', 'lens', 'beam', 'meteors',
  'dews', 'items', 'spots', 'vortex', 'lasers', 'bugs', 'magpies', 'decoy', 'saws', 'missiles', 'shots', 'boss', 'p', 'p2', 'E', 'energy', 'score', 'level', 'hearts', 'up', 'wind',
  'roofA', 'gust', 'anchor', 'anchorCd', 'parry', 'parryCd', 'parryFx', 'bubble', 'dash', 'charges', 'dashCd', 'dashMax', 'msg', 'banner', 'combo', 'hurt', 'burn', 'inv', 'xr', 'lucky', 'face', 'shieldMax', 'shake'];
const RNet = {
  peer: null, role: null, game: 'royale', code: '', conns: [], host: null, me: 0, players: [], status: '', err: false, busy: false,
  ready: false, inMatch: false, sendT: 0, nextId: 1, joinTimer: 0, started: false, snap: null, tp: null, tp2: null, lastIn: '', inT: 0,
  max() { return this.game === 'royale' ? BR_MAX : 2; },
  self() { return { id: this.me, name: P.settings.name, skin: P.equip.skin, hat: P.equip.hat, alive: true }; },
  pl(id) { return this.players.find(p => p.id === id); },
  alive() { return this.players.filter(p => p.alive && !p.left).length; },
  setStatus(t, err, busy) { this.status = t || ''; this.err = !!err; this.busy = !!busy; mpNet = this; if (topScr() === 'scrMulti') RENDER.scrMulti(); },
  teardown() {
    clearTimeout(this.joinTimer);
    const cs = this.conns.concat(this.host ? [this.host] : []), p = this.peer;
    this.peer = this.host = null; this.conns = []; this.role = null; this.code = ''; this.players = []; this.ready = false; this.inMatch = false; this.started = false; this.me = 0; this.snap = null;
    keys2.clear();
    for (const c of cs) try { c.close(); } catch (e) {}
    try { p && p.destroy(); } catch (e) {}
  },
  fail(t) { this.teardown(); this.setStatus(t, true); },
  leave() { this.send({ t: 'bye' }); this.teardown(); this.setStatus(''); },
  send(m) {
    if (this.role === 'host') { for (const c of this.conns) if (c.open) try { c.send(m); } catch (e) {} }
    else if (this.host && this.host.open) try { this.host.send(m); } catch (e) {}
  },
  roomText() { return tr(this.players.length + ' von ' + this.max() + ' im Raum', this.players.length + ' of ' + this.max() + ' in the room'); },
  async create(game) {
    Net.teardown();
    this.teardown(); this.role = 'host'; this.game = game || 'royale'; this.me = 0; this.players = [this.self()];
    this.setStatus(tr('Raum wird erstellt …', 'Creating room …'), false, true);
    try { await Net.lib(); } catch (e) { return this.fail(tr('Die Mehrspieler-Bibliothek ließ sich nicht laden. Bist du online?', 'The multiplayer library could not be loaded. Are you online?')); }
    const tryOpen = n => {
      const code = makeCode(), peer = new window.Peer(BR_PREFIX + code.toLowerCase(), { debug: 0 });
      this.peer = peer; this.code = code;
      peer.on('open', () => { if (this.peer !== peer) return; this.ready = true; this.setStatus(this.max() > 2 ? tr('Schick den Code an bis zu 7 Mitspieler.', 'Send the code to up to 7 players.') : tr('Schick den Code an deinen Mitspieler.', 'Send the code to the other player.')); });
      peer.on('connection', c => {
        if (this.peer !== peer) return;
        if (this.players.length >= this.max() || this.inMatch) { c.on('open', () => { try { c.send({ t: 'full', inMatch: this.inMatch }); } catch (e) {} setTimeout(() => c.close(), 400); }); return; }
        c.on('data', m => { if (this.peer === peer && m && typeof m === 'object') this.onHost(c, m); });
        c.on('close', () => { if (this.peer === peer) this.drop(c); });
        c.on('error', () => { if (this.peer === peer) this.drop(c); });
      });
      peer.on('error', e => {
        if (this.peer !== peer) return;
        if (e.type === 'unavailable-id' && n < 4) { try { peer.destroy(); } catch (x) {} tryOpen(n + 1); }
        else if (e.type !== 'peer-unavailable') this.fail(errText(e));
      });
      peer.on('disconnected', () => { if (this.peer === peer && !peer.destroyed) try { peer.reconnect(); } catch (e) {} });
    };
    tryOpen(0);
  },
  // fallback: Gibt es keinen solchen Raum, ist der Code vielleicht ein Duell-Raum (Net, eigenes Präfix)
  async join(code, fallback) {
    this.teardown(); this.role = 'guest'; this.code = code; this.game = '';   // welches Spiel es ist, sagt erst der Gastgeber
    this.setStatus(tr('Verbinde mit Raum ' + code + ' …', 'Connecting to room ' + code + ' …'), false, true);
    try { await Net.lib(); } catch (e) { return this.fail(tr('Die Mehrspieler-Bibliothek ließ sich nicht laden. Bist du online?', 'The multiplayer library could not be loaded. Are you online?')); }
    const peer = new window.Peer({ debug: 0 });
    this.peer = peer;
    peer.on('open', () => {
      if (this.peer !== peer) return;
      const c = peer.connect(BR_PREFIX + code.toLowerCase(), { reliable: true });
      this.host = c;
      c.on('open', () => c.send({ t: 'hello', name: P.settings.name, skin: P.equip.skin, hat: P.equip.hat }));
      c.on('data', m => { if (this.host === c && m && typeof m === 'object') this.onGuest(m); });
      c.on('close', () => { if (this.host === c) this.hostGone(); });
      c.on('error', () => { if (this.host === c) this.hostGone(); });
      this.joinTimer = setTimeout(() => { if (this.peer === peer && !this.me) this.fail(tr('Keine Antwort vom Raum ' + code + '. Stimmt der Code?', 'No answer from room ' + code + '. Is the code right?')); }, 15000);
    });
    peer.on('error', e => {
      if (this.peer !== peer) return;
      if (fallback && e.type === 'peer-unavailable') { this.teardown(); this.status = ''; Net.join(code); return; }
      this.fail(errText(e));
    });
  },
  lobbyMsg() { return { t: 'lobby', game: this.game, players: this.players.map(p => ({ id: p.id, name: p.name, skin: p.skin, hat: p.hat })) }; },
  onHost(c, m) {
    switch (m.t) {
      case 'hello': {
        if (c.pid) return;
        c.pid = this.nextId++;
        this.conns.push(c);
        const p = { id: c.pid, name: cleanName(m.name) || tr('Spieler', 'Player') + ' ' + c.pid, skin: SKIN_BY[m.skin] ? m.skin : 'schatten', hat: HAT_BY[m.hat] ? m.hat : 'none', alive: true };
        this.players.push(p);
        try { c.send({ t: 'welcome', id: c.pid, game: this.game }); } catch (e) {}
        this.send(this.lobbyMsg());
        Sound.sfx('join'); toast(tr('Mitspieler da', 'Player joined'), p.name, null, creatureCanvas(p.skin, p.hat, 38));
        this.setStatus(this.max() > 2 ? this.roomText() : tr(p.name + ' ist da. Startklar!', p.name + ' is here. Ready to go!'));
        break;
      }
      case 'st': { const p = this.pl(c.pid); if (p && this.inMatch) this.pos(p, m); break; }
      case 'dead': if (this.inMatch) this.dead(c.pid); break;
      // Koop und Fangen: Eingaben des Gasts
      case 'in':
        if (this.inMatch && S && S.cfg.online) {
          keys2.clear();
          const x = +m.x || 0, y = +m.y || 0;
          if (x < -0.38) keys2.add('left'); if (x > 0.38) keys2.add('right'); if (y < -0.38) keys2.add('up'); if (y > 0.38) keys2.add('down');
        }
        break;
      case 'act': { const X = XM(); if (this.inMatch && X && X.remoteAct && S.mode === 'play') X.remoteAct(); break; }
      case 'bye': this.drop(c); break;
    }
  },
  onGuest(m) {
    switch (m.t) {
      case 'welcome': clearTimeout(this.joinTimer); this.me = m.id; this.game = m.game || 'royale'; Sound.sfx('join'); this.setStatus(tr('Verbunden. Warte, bis der Gastgeber startet …', 'Connected. Waiting for the host to start …'), false, true); break;
      case 'lobby': {
        const old = this.players;
        if (m.game) this.game = m.game;
        this.players = m.players.map(q => Object.assign(old.find(o => o.id === q.id) || {}, { id: q.id, name: cleanName(q.name) || '?', skin: SKIN_BY[q.skin] ? q.skin : 'schatten', hat: HAT_BY[q.hat] ? q.hat : 'none' }));
        if (topScr() === 'scrMulti') RENDER.scrMulti();
        break;
      }
      case 'full': this.fail(m.inMatch ? tr('Dort läuft gerade eine Runde. Versuch es gleich nochmal.', 'A round is running there. Try again in a moment.') : tr('Der Raum ist schon voll.', 'The room is already full.')); break;
      case 'start': if (Number.isFinite(m.seed)) this.begin(m.seed >>> 0, String(m.map || 'yard'), m.ids, m.game); break;
      case 'all': if (this.inMatch && Array.isArray(m.p)) for (const q of m.p) { const p = this.pl(q[0]); if (p && p.id !== this.me) this.pos(p, { x: q[1], y: q[2], e: q[3] }); } break;
      case 'dead': if (this.inMatch) this.dead(m.id, m.place); break;
      case 'end': if (this.inMatch) this.end(m.winner); break;
      case 'snap': if (this.inMatch && typeof m.d === 'string') this.snap = m.d; break;
      case 'over': this.over(m); break;
      case 'bye': this.hostGone(); break;
    }
  },
  pos(p, m) {
    p.x = Math.max(0, Math.min(W, +m.x || 0)); p.y = Math.max(0, Math.min(H, +m.y || 0)); p.e = +m.e || 0;
    if (p.dx == null) { p.dx = p.x; p.dy = p.y; }
  },
  drop(c) {
    const i = this.conns.indexOf(c); if (i < 0) return;
    this.conns.splice(i, 1);
    const p = this.pl(c.pid); if (!p) return;
    if (this.inMatch && this.game === 'royale') { p.left = true; if (p.alive) this.dead(p.id); }
    else {
      this.players = this.players.filter(q => q !== p);
      if (this.inMatch) { this.inMatch = false; keys2.clear(); if (S && S.mode === 'play') flash(tr(p.name + ' hat das Spiel verlassen', p.name + ' left the game'), COL.warn); }
    }
    this.send(this.lobbyMsg());
    toast(tr('Verbindung getrennt', 'Disconnected'), tr(p.name + ' ist weg', p.name + ' left'), 'decoy');
    this.setStatus(this.roomText());
  },
  hostGone() {
    const was = this.inMatch, game = this.game;
    this.teardown();
    this.setStatus(tr('Der Gastgeber hat den Raum geschlossen.', 'The host closed the room.'), true);
    if (!was || !S) return;
    if (game === 'royale' && S.cfg.mode === 'royale' && S.mode === 'play') { flash(tr('Gastgeber weg: Du spielst allein weiter', 'Host gone: you play on alone'), COL.warn); S.xr.alone = true; }
    else if (S.cfg.remote) { toMenu(); open('scrMulti'); toast(tr('Verbindung getrennt', 'Disconnected'), tr('Der Gastgeber hat das Spiel verlassen', 'The host left the game'), 'decoy'); }
  },
  start() {
    if (this.role !== 'host' || this.players.length < 2 || this.inMatch) return;
    const seed = (Math.random() * 4294967296) >>> 0, X = EXTRA[this.game], map = xmMap(X);
    this.send({ t: 'start', seed, map, ids: this.players.map(p => p.id), game: this.game });
    this.begin(seed, map, null, this.game);
  },
  begin(seed, map, ids, game) {
    if (game) this.game = game;
    this.inMatch = true; this.started = true; this.snap = null; this.tp = this.tp2 = null; this.lastIn = ''; keys2.clear();
    if (Array.isArray(ids)) this.players = this.players.filter(p => ids.includes(p.id));
    for (const p of this.players) Object.assign(p, { alive: true, place: 0, x: null, y: null, dx: null, dy: null, e: 100 });
    const names = this.players.map(p => p.name);
    startExtra(this.game, { seed, map, online: true, remote: this.game !== 'royale' && this.role === 'guest', names });
  },
  // Battle Royale: Gastgeber entscheidet Platzierung und Sieg
  dead(id, place) {
    const p = this.pl(id); if (!p || !p.alive) return;
    p.alive = false; p.place = place || this.alive() + 1;
    if (this.role === 'host') {
      this.send({ t: 'dead', id, place: p.place });
      if (this.alive() <= 1) { const w = this.players.find(q => q.alive && !q.left); this.send({ t: 'end', winner: w ? w.id : -1 }); this.end(w ? w.id : -1); }
    }
    if (id !== this.me && S && S.cfg.mode === 'royale' && S.mode === 'play') flash(tr(p.name + ' ist verdampft · noch ' + this.alive(), p.name + ' evaporated · ' + this.alive() + ' left'), '#C9B8FF');
  },
  localDied() {
    const place = this.alive();
    if (this.role === 'host') this.dead(this.me, place);
    else { const p = this.pl(this.me); if (p) { p.alive = false; p.place = place; } this.send({ t: 'dead', time: S.t }); }
    return place;
  },
  end(winner) {
    this.inMatch = false;
    if (!S || S.cfg.mode !== 'royale') return;
    if (winner === this.me && S.mode === 'play') {
      S.xr.won = true; S.grace = 99; S.winT = 1.6;
      S.banner = { text: tr('Letzter Schatten!', 'Last shadow standing!'), good: true, t: 2.2, head: tr('SIEG', 'VICTORY') };
      Sound.sfx('ach');
    } else if (topScr() === 'scrOver') showResults();
  },
  // Koop und Fangen: Gastgeber meldet das Ende samt fertigem Ergebnis
  sendOver() {
    // Nur Daten, keine fertigen Texte: Der Gast baut das Ergebnis in seiner eigenen Sprache
    this.send({ t: 'over', won: !!S.won, sc: S.result.sc, quit: !!S.quit, xr: S.xr, bk: S.bossKills, time: S.t, level: S.level, score: S.score });
    this.inMatch = false;
  },
  over(m) {
    this.inMatch = false; this.snap = null;
    if (!S || !S.cfg.remote || S.mode === 'over') return;
    const X = XM(), sc = Math.max(0, Math.floor(+m.sc || 0)), earned = Math.round(sc * (X && X.walletF != null ? X.walletF : 1));
    S.mode = 'over'; S.won = !!m.won; S.quit = !!m.quit;
    if (m.xr && typeof m.xr === 'object') S.xr = m.xr;
    S.bossKills = +m.bk || 0; S.t = +m.time || S.t; S.level = +m.level || 0; S.score = +m.score || 0;
    stat('runs'); P.stats.time += S.t; P.wallet += earned; P.stats.points += sc;
    if (X && X.record) X.record(S.won, sc);
    checkAch(); save();
    S.result = { sc, earned, rec: false };
    keys.clear(); S.target = null;
    Sound.music(null); Sound.sfx(S.won ? 'victory' : 'over');
    setTimeout(() => { if (S.mode === 'over') showResults(); }, 600);
  },
  // Gast: Abbild übernehmen, Figuren weich nachziehen
  guestFrame(dt) {
    if (this.snap && S.mode !== 'over') {
      let d = null; try { d = JSON.parse(this.snap); } catch (e) {}
      this.snap = null;
      if (d) {
        for (const k of SNAP_KEYS) if (k !== 'p' && k !== 'p2' && k !== 't' && d[k] !== undefined) S[k] = d[k];
        const jump = (a, b) => !a || !b || Math.hypot(a.x - b.x, a.y - b.y) > 90;
        if (d.p) { if (jump(S.p, d.p)) S.p = { x: d.p.x, y: d.p.y }; this.tp = d.p; }
        if (d.p2) { if (!S.p2 || jump(S.p2, d.p2)) S.p2 = Object.assign({}, d.p2); this.tp2 = d.p2; }
        if (Math.abs(S.t - d.t) > 0.25) S.t = d.t;
      }
    }
    if (S.mode === 'over') return;
    S.t += dt;
    const k = Math.min(1, dt * 14);
    if (this.tp) { S.p.x += (this.tp.x - S.p.x) * k; S.p.y += (this.tp.y - S.p.y) * k; }
    if (this.tp2 && S.p2) { S.p2.x += (this.tp2.x - S.p2.x) * k; S.p2.y += (this.tp2.y - S.p2.y) * k; S.p2.carry = this.tp2.carry; }
    for (const q of S.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    S.parts = S.parts.filter(q => q.life > 0);
    hud();
  },
  // Gast: Richtung aus Tasten oder Finger
  guestAxis() {
    let x = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0), y = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    if (!x && !y && S.target) {
      const me = S.cfg.mode === 'coop' && S.p2 ? S.p2 : S.p, dx = S.target.x - me.x, dy = S.target.y - me.y, d = Math.hypot(dx, dy);
      if (d > 6) { x = dx / d; y = dy / d; }
    }
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  },
  remoteKey(e) {
    if (e.key === ' ' || e.key === 'Shift' || e.key === 'Enter') { if (!e.repeat) this.send({ t: 'act' }); return true; }
    return !!'eEqQ'.includes(e.key) && e.key.length === 1;
  },
  tick(dt) {
    if (!this.inMatch || !S) return;
    if (this.game === 'royale') { if (S.cfg.mode === 'royale') this.tickRoyale(dt); return; }
    if (S.cfg.mode !== this.game) return;
    this.sendT -= dt;
    if (this.role === 'host') {
      if (this.sendT <= 0 && (S.mode === 'play' || S.mode === 'pick' || S.mode === 'count')) {
        this.sendT = 0.05;
        const o = {}; for (const k of SNAP_KEYS) o[k] = S[k];
        this.send({ t: 'snap', d: JSON.stringify(o, (k, v) => k === 'owner' ? (v ? true : undefined) : v) });
      }
    } else {
      const a = this.guestAxis(), key = a.x + ',' + a.y;
      this.inT -= dt;
      if (key !== this.lastIn || this.inT <= 0) { this.lastIn = key; this.inT = 0.25; this.send({ t: 'in', x: a.x, y: a.y }); }
    }
  },
  tickRoyale(dt) {
    const k = Math.min(1, dt * 12);
    for (const p of this.players) if (p.x != null) { p.dx += (p.x - p.dx) * k; p.dy += (p.y - p.dy) * k; }
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 0.1;
    const alive = S.mode === 'play' || S.mode === 'count';
    if (this.role === 'guest') { if (alive) this.send({ t: 'st', x: Math.round(S.p.x), y: Math.round(S.p.y), e: Math.round(S.energy) }); }
    else {
      const me = this.pl(this.me);
      if (me && alive) this.pos(me, { x: S.p.x, y: S.p.y, e: S.energy });
      this.send({ t: 'all', p: this.players.filter(p => p.alive && p.x != null).map(p => [p.id, Math.round(p.x), Math.round(p.y), Math.round(p.e || 0)]) });
    }
  },
};
window.addEventListener('pagehide', () => { if (RNet.role) RNet.send({ t: 'bye' }); });

// ---------- Die Modi ----------
// Koop und Fangen: Namen der beiden Spieler (online die echten, lokal P1/P2), Revanche und Rückweg zum Mehrspieler-Bildschirm
const mpNames = () => S.cfg.names && S.cfg.names.length >= 2 ? S.cfg.names.slice(0, 2) : ['P1', 'P2'];
const MP_COMMON = {
  againLabel() { return !S.cfg.online ? [tr('Nochmal', 'Again')] : RNet.role === 'host' ? [tr('Revanche', 'Rematch'), RNet.inMatch || RNet.players.length < 2] : [tr('Warte auf Gastgeber', 'Waiting for host'), true]; },
  again() { if (S.cfg.online) RNet.start(); else startRun(lastCfg); },
  backTo() { open('scrMulti'); },
};
const EXTRA = {
  // Von Schatten zu Schatten durch Checkpoints ins Ziel, auf Zeit. Der Geist zeigt deine Bestzeit auf dieser Karte.
  race: Object.assign({}, OFF_ALL, {
    icon: 'boots', maps: 'sun', name: ['Schattenrennen', 'Shadow race'],
    desc: ['Von Schatten zu Schatten durch sieben Tore ins Ziel, auf Zeit. Ein Geist läuft deine Bestzeit mit.', 'From shadow to shadow through seven gates to the finish, against the clock. A ghost runs your best time.'],
    noTimeScore: true, walletF: 1,
    seed: map => hashStr('rennen-' + map),
    omega: () => 0.42,
    burnF: () => 1.35,
    init() {
      const R = S.xr = { cps: [], i: 0, t: 0, path: [], rt: 0, splits: [], ghost: xmData('race')[S.map.id] || null };
      let prev = { x: S.p.x, y: S.p.y };
      for (let n = 0; n < 7; n++) {
        let spot = null;
        for (let k = 0; k < 600 && !spot; k++) {
          const x = rand(34, W - 34), y = rand(40, H - 34), d = Math.hypot(x - prev.x, y - prev.y), lo = k < 300 ? 150 : 90;
          if (inPillar(x, y, 18) || offLimits(x, y) || d < lo || d > 320) continue;
          if (R.cps.some(c => Math.hypot(c.x - x, c.y - y) < 70)) continue;
          spot = { x, y };
        }
        if (spot) { R.cps.push(spot); prev = spot; }
      }
      S.mode = 'count'; S.countT = 3.2;
    },
    update(dt) {
      const R = S.xr;
      R.t += dt; R.rt -= dt;
      if (R.rt <= 0 && R.path.length < 6000) { R.rt += 0.05; R.path.push(Math.round(S.p.x), Math.round(S.p.y)); }
      const c = R.cps[R.i];
      if (c && dist(c, S.p) < 18 + pr()) {
        R.i++; R.splits.push(+R.t.toFixed(2)); S.score += 100;
        sparks(c.x, c.y, COL.dew, 16); Sound.sfx('dew', Math.min(5, R.i));
        const g = R.ghost && R.ghost.splits && R.ghost.splits[R.i - 1], dd = g != null ? R.t - g : null;
        const delta = dd == null ? '' : ' · ' + (dd <= 0 ? '−' : '+') + Math.abs(dd).toFixed(2);
        if (R.i >= R.cps.length) {
          S.score += Math.max(0, Math.round(3000 - R.t * 40));
          S.grace = 99; flash(tr('Ziel! ', 'Finish! ') + secs(R.t) + delta, COL.gold);
          finish(true); return;
        }
        flash(tr('Tor ', 'Gate ') + R.i + '/' + R.cps.length + ' · ' + secs(R.t) + delta, dd != null && dd > 0 ? COL.warn : COL.dew);
      }
    },
    drawWorld() {
      const R = S.xr; if (!R) return;
      if (R.ghost && R.ghost.path && R.ghost.path.length > 1) {
        const n = R.ghost.path.length / 2, k = Math.min(Math.floor(R.t / 0.05), n - 1);
        const gx = R.ghost.path[k * 2], gy = R.ghost.path[k * 2 + 1];
        ghostOf(gx, gy, {});
        ctx.globalAlpha = 0.8; textOut(tr('Bestzeit', 'Best'), gx, gy - 22, '#E9E3FF', '700 10px "JetBrains Mono", monospace', 'center'); ctx.globalAlpha = 1;
      }
      for (let n = R.cps.length - 1; n >= R.i; n--) {
        const c = R.cps[n], cur = n === R.i, last = n === R.cps.length - 1, pulse = 0.5 + 0.5 * Math.sin(S.t * 6);
        if (last) flag(c.x, c.y, S.t);
        ctx.fillStyle = cur ? 'rgba(127,214,232,' + (0.18 + 0.12 * pulse) + ')' : 'rgba(255,255,255,.08)';
        ctx.beginPath(); ctx.arc(c.x, c.y, 20, 0, TAU); ctx.fill();
        ring(c.x, c.y, 20 + (cur ? pulse * 3 : 0), cur ? COL.dew : 'rgba(255,255,255,.55)', cur ? 3 : 1.5, cur ? null : [4, 4]);
        if (!last) textOut(String(n + 1), c.x, c.y + 5, cur ? '#FFFFFF' : 'rgba(255,255,255,.7)', '800 13px "Unbounded", "Arial Black", sans-serif', 'center');
      }
      const c = R.cps[R.i];
      if (c && S.mode === 'play') {
        ctx.strokeStyle = 'rgba(127,214,232,.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -S.t * 30;
        ctx.beginPath(); ctx.moveTo(S.p.x, S.p.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]);
      }
    },
    label() { const R = S.xr; return tr('Rennen · Tor ', 'Race · gate ') + Math.min(R.i + 1, R.cps.length) + '/' + R.cps.length; },
    drawHud() {
      const R = S.xr, b = R.ghost;
      hudLines([[secs(R.t), COL.white], [b ? tr('Bestzeit ', 'Best ') + secs(b.t) : tr('Noch keine Bestzeit', 'No best time yet'), '#C9B8FF']], W - 12, 22);
    },
    bestLabel() { const b = xmData('race')[S.map.id]; return b ? secs(b.t) : '–'; },
    meta() { const d = xmData('race'), n = Object.keys(d).length; if (!n) return tr('Noch nicht gefahren', 'Not raced yet'); const m = MAP_BY[xmMap(this)], b = d[m.id]; return b ? tr('Bestzeit ', 'Best ') + secs(b.t) : tr('Bestzeiten auf ' + n + (n === 1 ? ' Karte' : ' Karten'), 'Best times on ' + n + (n === 1 ? ' map' : ' maps')); },
    record(won) {
      const R = S.xr;
      if (!won) return false;
      stat('raceDone');
      const d = xmData('race'), b = d[S.map.id];
      if (b && b.t <= R.t) return false;
      d[S.map.id] = { t: +R.t.toFixed(3), path: R.path, splits: R.splits };
      return true;
    },
    result() {
      const R = S.xr, b = xmData('race')[S.map.id];
      if (!S.won) return { title: tr('Verdampft', 'Evaporated'), text: tr('Du hast ' + R.i + ' von ' + R.cps.length + ' Toren geschafft. Bleib zwischen den Toren im Schatten.', 'You made it through ' + R.i + ' of ' + R.cps.length + ' gates. Stay in the shade between the gates.'),
        tiles: [[tr('Tore', 'Gates'), R.i + '/' + R.cps.length, true], [tr('Zeit', 'Time'), secs(R.t)]] };
      return { title: tr('Im Ziel!', 'Finished!'), text: tr('Alle ' + R.cps.length + ' Tore in ' + secs(R.t) + '. Dein Geist läuft ab jetzt die Bestzeit mit.', 'All ' + R.cps.length + ' gates in ' + secs(R.t) + '. From now on your ghost runs the best time.'),
        tiles: [[tr('Zeit', 'Time'), secs(R.t), true], [tr('Bestzeit', 'Best'), b ? secs(b.t) : '–'], [tr('Punkte', 'Score'), fmt(S.result.sc)]] };
    },
  }),

  // Nur eine Säule, und die Sonne wird immer schneller
  pillar: Object.assign({}, OFF_ALL, {
    icon: 'noon', maps: 'yard', name: ['Eine Säule', 'One pillar'],
    desc: ['Nur eine einzige Säule im Hof, und die Sonne dreht sich immer schneller. Wie lange hältst du durch?', 'A single pillar in the yard, and the sun spins faster and faster. How long can you last?'],
    noDew: false, dewCap: 2,
    omega: () => 0.35 + S.t * 0.017,
    shadowLen: () => 118,
    init() {
      S.pillars = [{ x: W / 2 - 28, y: H / 2 - 28, w: 56, h: 56, crumble: 0, fixed: true }];
      const d = dirOf(S.az); S.p.x = W / 2 + d.x * 62; S.p.y = H / 2 + d.y * 62;
      S.xr = {};
    },
    label() { return tr('Eine Säule · ', 'One pillar · ') + fmtTime(S.t) + tr(' · Sonne ×', ' · sun ×') + (omega() / 0.35).toFixed(1); },
    bestLabel() { const b = xmData('pillar').best; return b ? secs(b) : '–'; },
    meta() { const b = xmData('pillar').best; return b ? tr('Rekord ', 'Best ') + secs(b) : tr('Noch nicht gespielt', 'Not played yet'); },
    record() { const d = xmData('pillar'); statMax('pillarBest', Math.floor(S.t)); if (S.t > (d.best || 0)) { d.best = +S.t.toFixed(2); return true; } return false; },
    result() {
      const b = xmData('pillar').best;
      return { title: tr('Verbrannt', 'Burned'), text: tr('Du hast ' + secs(S.t) + ' an der einen Säule durchgehalten. Am Ende war die Sonne ' + (omega() / 0.35).toFixed(1) + '-mal so schnell.', 'You lasted ' + secs(S.t) + ' at the single pillar. By the end the sun was ' + (omega() / 0.35).toFixed(1) + ' times as fast.'),
        tiles: [[tr('Zeit', 'Time'), secs(S.t), true], [tr('Rekord', 'Best'), b ? secs(b) : '–'], [tr('Punkte', 'Score'), fmt(S.result.sc)]] };
    },
  }),

  // Alle Bosse direkt nacheinander
  bossrush: {
    icon: 'core', maps: 'any', name: ['Bossrausch', 'Boss rush'],
    desc: ['Alle sechs Bosse direkt hintereinander, ohne Stufen dazwischen. Zum Schluss wartet der Sonnenkern.', 'All six bosses back to back, no levels in between. The Sun Core waits at the end.'],
    noLevels: true, coreFinal: true,
    order: ['prisma', 'queen', 'bull', 'eater', 'dusk', 'core'],
    init() { S.xr = { i: 0, next: 1.2 }; },
    update(dt) {
      const R = S.xr;
      if (S.boss || S.pickT > 0 || S.winT > 0 || R.i >= this.order.length) return;
      R.next -= dt;
      if (R.next > 0) return;
      const type = this.order[R.i], b = type === 'core' ? CORE : BOSSES.find(x => x.type === type);
      S.level = R.i * 2 + 1; Sound.setLevel(S.level);
      spawnBoss(b); S.boss.time = S.boss.maxTime = Infinity;
      R.i++; R.next = 1.6;
    },
    label() { return tr('Bossrausch · Boss ', 'Boss rush · boss ') + Math.max(1, S.xr.i) + '/' + this.order.length; },
    bestLabel() { const b = xmData('bossrush').bestT; return b ? fmtTime(b) : '–'; },
    meta() { const d = xmData('bossrush'); return d.bestT ? tr('Bestzeit ', 'Best time ') + fmtTime(d.bestT) : d.best ? tr('Rekord ', 'Best ') + fmt(d.best) + tr(' Punkte', ' points') : tr('Noch nicht geschafft', 'Not beaten yet'); },
    record(won, sc) {
      const d = xmData('bossrush'); let rec = false;
      if (sc > (d.best || 0)) { d.best = sc; rec = true; }
      if (won) { stat('rushWins'); if (!d.bestT || S.t < d.bestT) { d.bestT = Math.round(S.t); rec = true; } }
      return rec;
    },
    result() {
      const n = S.bossKills;
      return { title: S.won ? tr('Alle Bosse besiegt!', 'All bosses defeated!') : S.quit ? tr('Aufgegeben', 'Gave up') : tr('Verdampft', 'Evaporated'),
        text: S.won ? tr('Sechs Bosse in ' + fmtTime(S.t) + ' Minuten.', 'Six bosses in ' + fmtTime(S.t) + ' minutes.') : tr(n + ' von 6 Bossen besiegt.', n + ' of 6 bosses defeated.'),
        tiles: [[tr('Punkte', 'Score'), fmt(S.result.sc), true], [tr('Bosse', 'Bosses'), n + '/6'], [tr('Zeit', 'Time'), fmtTime(S.t)], ['Upgrades', String(S.upList.length)]] };
    },
  },

  // Eine Minute Tau im Licht sammeln. Wer verdampft, verliert die Hälfte.
  collect: {
    icon: 'rain', maps: 'sun', name: ['Sammler', 'Collector'],
    desc: ['60 Sekunden: Sammle so viel Tau wie möglich. Er liegt immer im Licht, und die Sonne brennt immer stärker. Verdampfst du, ist die halbe Beute weg.', '60 seconds: collect as much dew as you can. It always lies in the light, and the sun burns harder and harder. Evaporate and half the loot is gone.'],
    noWheel: true, noLevels: true, noItems: true, noHearts: true, noUpgrades: true, noTimeScore: true, noLens: true,
    dewCap: 7, dewF: 2.4, LEN: 60,
    burnF: () => 1 + Math.min(1, S.t / 60) * 0.8,
    init() { S.xr = { d0: P.stats.dews || 0, goldIn: 6, mc: 0 }; S.dewIn = 0.3; },
    update(dt) {
      const R = S.xr;
      R.mc = Math.max(R.mc, S.combo);
      R.goldIn -= dt;
      if (R.goldIn <= 0) { const s = freeSpot(90, true); if (s) S.items.push({ x: s.x, y: s.y, kind: 'gold', life: 6 }); R.goldIn = rand(6, 10); }
      if (S.t >= this.LEN) { S.grace = 99; finish(true); }
    },
    onDeath() { S.score = Math.floor(S.score / 2); S.xr.dead = true; finish(false); return true; },
    dews: () => (P.stats.dews || 0) - S.xr.d0,
    label() { return tr('Sammler · noch ', 'Collector · ') + Math.max(0, Math.ceil(this.LEN - S.t)) + tr(' s · Tau ', ' s left · dew ') + this.dews(); },
    bestLabel() { const b = xmData('collect').best; return b ? fmt(b) : '–'; },
    meta() { const b = xmData('collect').best; return b ? tr('Rekord ', 'Best ') + fmt(b) + tr(' Punkte', ' points') : tr('Noch nicht gespielt', 'Not played yet'); },
    record(won, sc) { const d = xmData('collect'); if (sc > (d.best || 0)) { d.best = sc; return true; } return false; },
    result() {
      const dead = S.xr.dead;
      return { title: dead ? tr('Verdampft: halbe Beute', 'Evaporated: half the loot') : tr('Zeit um!', 'Time is up!'),
        text: dead ? tr('Zu gierig! Nach ' + Math.floor(S.t) + ' Sekunden war die Kraft weg, die Hälfte der Punkte auch.', 'Too greedy! After ' + Math.floor(S.t) + ' seconds your energy was gone, and half your points with it.') : tr('Eine Minute voller Risiko. ' + this.dews() + ' Tautropfen eingesammelt.', 'One minute of risk. ' + this.dews() + ' dew drops collected.'),
        tiles: [[tr('Punkte', 'Score'), fmt(S.result.sc), true], [tr('Tau', 'Dew'), String(this.dews())], [tr('Größte Kombo', 'Best combo'), '×' + S.xr.mc]] };
    },
  },

  // Lichtwesen: der Schatten brennt, das Licht lädt auf
  invert: {
    icon: 'sun2', maps: 'sun', name: ['Umgekehrt', 'Reversed'],
    desc: ['Du bist ein Lichtwesen. Der Schatten brennt, im Licht lädst du dich auf. Tau liegt jetzt im Schatten, Wolken sind gefährlich.', 'You are a light creature. Shadow burns, light recharges you. Dew now lies in the shade, and clouds are dangerous.'],
    invert: true, tint: '#F2C94C',
    bossFor(level) { return (level + 1) % 10 === 0 ? CORE : BOSSES.filter(b => b.type !== 'dusk')[(level - 1) % 4]; },
    init() { S.xr = {}; },
    drawWorld() {
      const g = ctx.createRadialGradient(S.p.x, S.p.y, 2, S.p.x, S.p.y, 30);
      g.addColorStop(0, 'rgba(255,246,208,.75)'); g.addColorStop(1, 'rgba(255,246,208,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(S.p.x, S.p.y, 30, 0, TAU); ctx.fill();
    },
    bestLabel() { const b = xmData('invert').best; return b ? fmt(b) : '–'; },
    meta() { const d = xmData('invert'); return d.best ? tr('Rekord ', 'Best ') + fmt(d.best) + tr(' · Stufe ', ' · level ') + d.level : tr('Noch nicht gespielt', 'Not played yet'); },
    record(won, sc) { const d = xmData('invert'); d.level = Math.max(d.level || 0, S.level + 1); if (sc > (d.best || 0)) { d.best = sc; return true; } return false; },
  },

  // Keine Herzen, keine Upgrades, keine Extras. Eigene Bestenliste.
  onelife: {
    icon: 'heart', maps: 'any', name: ['Ein Leben', 'One life'],
    desc: ['Kein Herz, keine Upgrades, keine Extras. Nur du und dein Können. Mit eigener Bestenliste.', 'No hearts, no upgrades, no extras. Just you and your skill. With its own leaderboard.'],
    noHearts: true, noUpgrades: true, noItems: true,
    init() { S.xr = {}; },
    bestLabel() { const l = P.top.onelife || []; return l.length ? fmt(l[0].s) : '–'; },
    meta() { const l = P.top.onelife || []; return l.length ? tr('Rekord ', 'Best ') + fmt(l[0].s) + tr(' · Stufe ', ' · level ') + l[0].l : tr('Noch keine Runde', 'No run yet'); },
    record(won, sc) {
      const list = P.top.onelife = P.top.onelife || [], best = list.length ? list[0].s : 0;
      list.push({ s: sc, l: S.level + 1, d: dayKey(), w: 0, df: 'normal' });
      list.sort((a, b) => b.s - a.s); list.length = Math.min(list.length, 10);
      statMax('onelifeLevel', S.level + 1);
      return sc > best;
    },
  },

  // Handgebaute Rätsel, Zug um Zug
  puzzle: Object.assign({}, OFF_ALL, {
    icon: 'target', maps: 'yard', name: ['Rätselstufen', 'Puzzle levels'],
    desc: ['Zehn Level mit festen Säulen und fester Sonnenbahn. Jeder Schritt und jeder Dash ist ein Zug, danach wandert die Sonne. Wenige Züge bringen bis zu 3 Sterne.', 'Ten levels with fixed pillars and a fixed sun path. Every step and every dash is a move, then the sun moves on. Few moves earn up to 3 stars.'],
    noTimeScore: true, noBurn: true, noMove: true, noAbilityHud: true, walletF: 1,
    seed: (map, cfg) => 777 + (cfg.level || 0),
    omega: () => 0,
    shadowLen: () => S.xr ? S.xr.lv.L : 120,
    init() {
      const i = Math.max(0, Math.min(PUZZLES.length - 1, S.cfg.level || 0)), lv = PUZZLES[i];
      S.pillars = lv.pillars.map(pzPillar);
      S.p.x = pzX(lv.start[0]); S.p.y = pzX(lv.start[1]);
      S.az = lv.az * Math.PI / 180; S.grace = 0;
      S.xr = { i, lv, c: lv.start[0], r: lv.start[1], moves: 0, lives: 3, anim: null, hist: [], pend: null, prev: null, done: false };
      S.energy = 100;
    },
    // Ein Zug: n = 0 warten, 1 Schritt, 2 Dash
    act(dx, dy, n) {
      const R = S.xr;
      if (R.anim || R.done || S.mode !== 'play') return;
      const [c2, r2] = n ? pzStep(R.c, R.r, dx, dy, n) : [R.c, R.r];
      if (n && c2 === R.c && r2 === R.r) { Sound.sfx('deny'); return; }   // Wand oder Säule: kein Zug
      R.hist.push({ c: R.c, r: R.r, az: S.az, lives: R.lives, moves: R.moves });
      R.moves++; R.prev = null;
      R.anim = { x0: S.p.x, y0: S.p.y, x1: pzX(c2), y1: pzX(r2), t: 0, dur: n === 2 ? 0.2 : n ? 0.16 : 0.3, az0: S.az, az1: S.az + R.lv.step * Math.PI / 180, n };
      R.c = c2; R.r = r2;
      Sound.sfx(n === 2 ? 'dash' : n ? 'click' : 'whoosh');
    },
    dash(tx, ty) {
      if (tx === undefined) { this.act(0, 0, 0); return; }
      const d = pzDirTo(tx - S.p.x, ty - S.p.y); this.act(d[0], d[1], 2);
    },
    onClick(p) {
      const dx = p.x - S.p.x, dy = p.y - S.p.y, d = Math.hypot(dx, dy);
      if (d < 18) { this.act(0, 0, 0); return; }
      const v = pzDirTo(dx, dy); this.act(v[0], v[1], d > 68 ? 2 : 1);
    },
    onKey(e) {
      const R = S.xr, d = PZ_KEYS[e.key];
      if (d) {
        if (!e.repeat) { R.pend = R.pend || { x: 0, y: 0, t: 0.07, n: 1 }; if (d[0]) R.pend.x = d[0]; if (d[1]) R.pend.y = d[1]; if (e.shiftKey) R.pend.n = 2; }
        return true;
      }
      if (e.key === ' ' || e.key === 'Enter') { if (!e.repeat) this.act(0, 0, 0); return true; }
      if (e.key === 'r' || e.key === 'R') { if (!e.repeat) startExtra('puzzle', { level: R.i }); return true; }
      if (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y' || e.key === 'Backspace') { if (!e.repeat) this.undo(); return true; }
      return e.key === 'Shift' || e.key === 'e' || e.key === 'E' || e.key === 'q' || e.key === 'Q';
    },
    undo() {
      const R = S.xr;
      if (R.anim || R.done || !R.hist.length) return;
      const h = R.hist.pop();
      R.c = h.c; R.r = h.r; S.p.x = pzX(h.c); S.p.y = pzX(h.r); S.az = h.az; R.lives = h.lives; R.moves = h.moves; R.prev = null;
      S.energy = R.lives / 3 * 100; Sound.sfx('portal');
    },
    update(dt) {
      const R = S.xr;
      if (R.pend) { R.pend.t -= dt; if (R.pend.t <= 0) { const p = R.pend; R.pend = null; this.act(p.x, p.y, p.n); } }
      const A = R.anim;
      if (!A) return;
      A.t += dt;
      const f = Math.min(1, A.t / A.dur), e = f * f * (3 - 2 * f);
      S.p.x = A.x0 + (A.x1 - A.x0) * e; S.p.y = A.y0 + (A.y1 - A.y0) * e; S.az = A.az0 + (A.az1 - A.az0) * e;
      if (f < 1) {
        if (!A.n) S.parts.push({ x: S.p.x + fx(-8, 8), y: S.p.y + fx(-8, 8), vx: 0, vy: -20, life: 0.3, spark: '#C9B8FF' });
        else if (A.n === 2) S.parts.push({ x: S.p.x, y: S.p.y, vx: 0, vy: 0, life: 0.22, ghost: true });
        return;
      }
      S.p.x = A.x1; S.p.y = A.y1; S.az = A.az1; R.anim = null;
      const L = R.lv;
      if (R.c === L.goal[0] && R.r === L.goal[1]) {
        R.done = true; R.stars = R.moves <= L.par ? 3 : R.moves <= L.par + 2 ? 2 : 1;
        const o = xmData('puzzle')[R.i];
        S.score = Math.max(0, R.stars - (o ? o.stars : 0)) * 150 + 20;   // neue Sterne bringen Punkte aufs Konto
        S.grace = 99; S.winT = 1.4;
        S.banner = { text: '★'.repeat(R.stars) + '☆'.repeat(3 - R.stars) + tr(' · ' + R.moves + ' Züge', ' · ' + R.moves + ' moves'), good: true, t: 2.2, head: tr('RÄTSEL GELÖST', 'PUZZLE SOLVED') };
        sparks(S.p.x, S.p.y, COL.gold, 30); Sound.sfx('victory');
        return;
      }
      if (!inShadow(S.p.x, S.p.y)) {
        R.lives--; S.energy = R.lives / 3 * 100; S.hurt = 0.4; S.shake = 0.3;
        sparks(S.p.x, S.p.y, COL.warn, 14); Sound.sfx('hurt');
        if (R.lives <= 0) { finish(false); return; }
        flash(tr('Verbrannt! Noch ', 'Burned! Lives left: ') + R.lives, COL.warn);
      }
    },
    // Wohin führen Schritt und Dash in jede Richtung, und liegt das Feld nach dem Zug im Schatten?
    preview() {
      const R = S.xr;
      if (R.prev) return R.prev;
      const az = S.az, out = [], seen = new Set();
      S.az = az + R.lv.step * Math.PI / 180;
      const add = (c, r, n) => {
        const k = c + ',' + r; if (seen.has(k)) return; seen.add(k);
        out.push({ x: pzX(c), y: pzX(r), n, shade: inShadow(pzX(c), pzX(r)), goal: c === R.lv.goal[0] && r === R.lv.goal[1] });
      };
      add(R.c, R.r, 0);
      for (const n of [1, 2]) for (const d of PZ_DIRS) { const [c, r] = pzStep(R.c, R.r, d[0], d[1], n); if (c !== R.c || r !== R.r) add(c, r, n); }
      S.az = az;
      return (R.prev = out);
    },
    drawWorld() {
      const R = S.xr, L = R.lv;
      // Schatten nach dem nächsten Zug, gestrichelt
      if (L.step && !R.done) {
        ctx.save(); ctx.beginPath(); pillarShadows(S.az + L.step * Math.PI / 180)();
        ctx.strokeStyle = 'rgba(20,24,33,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.restore(); ctx.setLineDash([]);
      }
      const gx = pzX(L.goal[0]), gy = pzX(L.goal[1]);
      ctx.fillStyle = 'rgba(255,194,26,.18)'; ctx.fillRect(gx - 19, gy - 19, 38, 38);
      ctx.strokeStyle = 'rgba(255,194,26,.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.strokeRect(gx - 18, gy - 18, 36, 36); ctx.setLineDash([]);
      flag(gx + 4, gy - 2, S.t);
      if (!R.anim && !R.done && S.mode === 'play') for (const q of this.preview()) {
        const col = q.goal ? COL.gold : q.shade ? '#5FBE90' : COL.warn;
        if (!q.n) { ring(q.x, q.y, 15, col, 1.8, [2, 3]); continue; }
        if (q.n === 1) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q.x, q.y, q.goal ? 7 : 5, 0, TAU); ctx.fill(); ctx.strokeStyle = COL.body; ctx.lineWidth = 1.5; ctx.stroke(); }
        else { ring(q.x, q.y, q.goal ? 8 : 6, COL.body, 4); ring(q.x, q.y, q.goal ? 8 : 6, col, 2); }
      }
    },
    label() { const R = S.xr; return tr('Rätsel ', 'Puzzle ') + (R.i + 1) + ' · ' + tr(R.lv.name[0], R.lv.name[1]); },
    drawHud() {
      const R = S.xr, L = R.lv;
      hudLines([[tr('Züge ', 'Moves ') + R.moves + ' · Par ' + L.par, R.moves <= L.par ? COL.white : COL.warn], ['♥'.repeat(R.lives) + '♡'.repeat(3 - R.lives), '#FF8FA3'],
        [tr('Sonne: ', 'Sun: ') + (L.step ? (L.step > 0 ? '+' : '') + L.step + '° ' + tr('pro Zug', 'per move') : tr('steht still', 'stands still')), '#F4CF63']], W - 12, 22);
      const kb = KEY_HINTS ? tr('Pfeile (2 = schräg): Schritt · +Shift: Dash · Leertaste: warten · Z · R', 'Arrows (2 = diagonal): step · +Shift: dash · Space: wait · Z undo · R')
        : tr('Tippen: nah = Schritt, weit = Dash · auf dich tippen: warten', 'Tap: near = step, far = dash · tap yourself: wait');
      ctx.globalAlpha = 0.9; textOut(kb, W / 2, H - 12, '#FFFFFF', '700 10px "JetBrains Mono", monospace', 'center'); ctx.globalAlpha = 1;
      if (L.goal[1] === 0) flag(pzX(L.goal[0]) + 4, pzX(L.goal[1]) - 2, S.t);   // Ziel in der obersten Reihe liegt sonst unter dem Titel
    },
    bestLabel() { const d = xmData('puzzle')[S.xr.i]; return d ? '★'.repeat(d.stars) : '–'; },
    meta() { const n = puzzleStars(), done = Object.keys(xmData('puzzle')).length; return n ? tr(done + ' von ' + PUZZLES.length + ' gelöst · ' + n + ' ★', done + ' of ' + PUZZLES.length + ' solved · ' + n + ' ★') : PUZZLES.length + tr(' Level', ' levels'); },
    record(won) {
      const R = S.xr; if (!won) return false;
      const d = xmData('puzzle'), o = d[R.i];
      d[R.i] = { stars: Math.max(R.stars, o ? o.stars : 0), moves: Math.min(R.moves, o ? o.moves : 99) };
      return !o || R.moves < o.moves;
    },
    result() {
      const R = S.xr, d = xmData('puzzle')[R.i];
      if (!S.won) return { title: tr('Verbrannt', 'Burned'), text: S.quit ? tr('Aufgegeben. Mit R startest du ein Rätsel jederzeit neu, mit Z nimmst du einen Zug zurück.', 'Gave up. R restarts a puzzle at any time, Z takes back a move.') : tr('Drei Züge im Licht, das war zu viel. Grüne Punkte zeigen, welche Felder nach dem Zug im Schatten liegen.', 'Three moves ended in the light, that was too much. Green dots show which tiles are in the shade after the move.'), tiles: [[tr('Züge', 'Moves'), String(R.moves), true], ['Par', String(R.lv.par)]] };
      return { title: tr('Gelöst! ', 'Solved! ') + '★'.repeat(R.stars) + '☆'.repeat(3 - R.stars),
        text: R.stars === 3 ? tr('Perfekt, mit ' + R.moves + ' Zügen.', 'Perfect, in ' + R.moves + ' moves.') : tr(R.moves + ' Züge. Für 3 Sterne brauchst du höchstens ' + R.lv.par + '.', R.moves + ' moves. For 3 stars you need at most ' + R.lv.par + '.'),
        tiles: [[tr('Züge', 'Moves'), String(R.moves), true], ['Par', String(R.lv.par)], [tr('Beste', 'Best'), d ? d.moves + ' · ' + '★'.repeat(d.stars) : '–']] };
    },
    againLabel() { const R = S.xr; return S.won && R.i + 1 < PUZZLES.length ? [tr('Nächstes Rätsel', 'Next puzzle')] : [tr('Nochmal', 'Again')]; },
    again() { const R = S.xr; startExtra('puzzle', { level: S.won && R.i + 1 < PUZZLES.length ? R.i + 1 : R.i }); },
    backTo() { open('scrExtra'); open('scrPuzzle'); },
  }),

  // Zu zweit: Spieler 1 läuft, Spieler 2 trägt eine Säule. Online ist der Gastgeber Spieler 1, sonst beide an einer Tastatur (WASD / Pfeile + Enter).
  coop: Object.assign({}, MP_COMMON, {
    icon: 'twin', maps: 'any', mp: true, name: ['Koop', 'Co-op'],
    desc: ['Zusammen auf einer Karte: Einer läuft, der andere trägt Säulen und spendet ihm Schatten.', 'Together on one map: one runs, the other carries pillars and provides shade.'],
    init() {
      S.p2 = { x: W / 2 + 40, y: H / 2 + 30, carry: null, ox: 0, oy: 0, face: 1 };
      S.xr = { hint: 7, names: mpNames() };
    },
    onKey(e) {
      if (S.cfg.remote) return RNet.remoteKey(e);
      if (S.cfg.online) return false;
      if (KEY2[e.key]) { keys2.add(KEY2[e.key]); return true; }
      if (e.key === 'Enter') { if (!e.repeat) this.lift(); return true; }
      return false;
    },
    remoteAct() { this.lift(); },
    lift() {
      const C = S.p2;
      if (C.carry) { C.carry.carried = false; C.carry = null; resolve(); Sound.sfx('boom'); return; }
      let best = null, bd = 1e9;
      for (const r of S.pillars) {
        if (r.fixed || r.books || r.glass > 0 || !pillarContains(r, C.x, C.y, PR + 12)) continue;
        const d = Math.hypot(pcx(r) - C.x, pcy(r) - C.y); if (d < bd) { bd = d; best = r; }
      }
      if (!best) { Sound.sfx('deny'); flash(tr('Keine Säule in der Nähe', 'No pillar nearby'), '#98A1B4'); return; }
      best.carried = true; best.doomed = false; best.crumble = 0; C.carry = best; C.ox = best.x - C.x; C.oy = best.y - C.y;
      Sound.sfx('anchor');
    },
    update(dt) {
      const C = S.p2, a = axis(keys2), l = Math.hypot(a.x, a.y), v = C.carry ? 120 : 170;
      if (l) { C.x += a.x / l * v * dt; C.y += a.y / l * v * dt; if (a.x) C.face = a.x; }
      C.x = Math.max(PR, Math.min(W - PR, C.x)); C.y = Math.max(PR, Math.min(H - PR, C.y));
      if (C.carry && !S.pillars.includes(C.carry)) C.carry = null;
      for (const r of S.pillars) if (r !== C.carry) pushOutObj(r, C, PR);
      if (C.carry) {
        const r = C.carry;
        r.x = Math.max(4, Math.min(W - r.w - 4, C.x + C.ox)); r.y = Math.max(4, Math.min(H - r.h - 4, C.y + C.oy));
        resolve();
      }
      if (S.xr.hint > 0) S.xr.hint -= dt;
    },
    drawWorld() {
      const C = S.p2, N = S.xr.names; if (!C) return;
      const liftKey = S.cfg.online ? tr('Leertaste', 'Space') : 'Enter';
      if (C.carry) { const r = C.carry; ctx.strokeStyle = 'rgba(95,190,144,.9)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); if (r.round) { ctx.beginPath(); ctx.arc(pcx(r), pcy(r), r.w / 2 + 4, 0, TAU); ctx.stroke(); } else ctx.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6); ctx.setLineDash([]); }
      else if (!S.cfg.online || S.cfg.remote) for (const r of S.pillars) if (!r.fixed && !r.books && pillarContains(r, C.x, C.y, PR + 12)) { textOut(liftKey + tr(': tragen', ': carry'), C.x, C.y - 26, '#5FBE90', '700 10px "JetBrains Mono", monospace', 'center'); break; }
      drawCreature(ctx, C.x, C.y, PR + 1, { skin: 'moos', hat: 'none', t: S.t + 0.5, eyes: 'open' });
      textOut(N[1], C.x, C.y + 24, '#5FBE90', '700 10px "JetBrains Mono", monospace', 'center');
      textOut(N[0], S.p.x, S.p.y + 24, '#FFFFFF', '700 10px "JetBrains Mono", monospace', 'center');
    },
    drawHud() {
      const N = S.xr.names, f = '700 10px "JetBrains Mono", monospace';
      if (S.mode === 'pick' && S.cfg.remote) { textOut(N[0] + tr(' wählt ein Upgrade …', ' is picking an upgrade …'), W / 2, H / 2 + 60, '#FFFFFF', '800 14px "Unbounded", "Arial Black", sans-serif', 'center'); return; }
      if (S.xr.hint <= 0) return;
      ctx.globalAlpha = Math.min(1, S.xr.hint);
      const txt = !S.cfg.online ? tr('P1: WASD, Shift/Leertaste Dash · P2: Pfeile, Enter hebt eine Säule', 'P1: WASD, Shift/Space dash · P2: arrows, Enter lifts a pillar')
        : S.cfg.remote ? tr('Du trägst Säulen: Pfeile/WASD laufen, Leertaste hebt und setzt ab', 'You carry pillars: arrows/WASD move, Space lifts and drops')
        : tr('Du läufst. ' + N[1] + ' trägt Säulen und spendet dir Schatten.', 'You run. ' + N[1] + ' carries pillars and gives you shade.');
      textOut(txt, W / 2, 44, '#FFFFFF', f, 'center');
      ctx.globalAlpha = 1;
    },
    bestLabel() { const b = xmData('coop').best; return b ? fmt(b) : '–'; },
    record(won, sc) { const d = xmData('coop'); d.level = Math.max(d.level || 0, S.level + 1); if (sc > (d.best || 0)) { d.best = sc; return true; } return false; },
    result() {
      const N = S.xr.names;
      return { title: S.quit ? tr('Aufgegeben', 'Gave up') : tr('Verdampft', 'Evaporated'),
        text: tr(N[0] + ' und ' + N[1] + ' haben ' + fmtTime(S.t) + ' Minuten zusammen durchgehalten.', N[0] + ' and ' + N[1] + ' lasted ' + fmtTime(S.t) + ' minutes together.'),
        tiles: [[tr('Punkte', 'Score'), fmt(Math.floor(S.score)), true], [tr('Zeit', 'Time'), fmtTime(S.t)], [tr('Stufe', 'Level'), String(S.level + 1)], [tr('Bosse', 'Bosses'), String(S.bossKills)]] };
    },
  }),

  // Zu zweit: einer ist die Sonne, der andere überlebt. Dann Tausch. Online überlebt zuerst der Gastgeber.
  tag: Object.assign({}, OFF_ALL, MP_COMMON, {
    icon: 'lens', maps: 'yard', mp: true, name: ['Fangen im Duell', 'Sun tag'],
    desc: ['Einer steuert die Sonne und wirft Funken, der andere überlebt 45 Sekunden. Dann wird getauscht.', 'One steers the sun and throws sparks, the other survives for 45 seconds. Then you swap.'],
    noTimeScore: true, noAbilityHud: true, walletF: 0.5, ROUND: 45,
    seed: () => (Math.random() * 4294967296) >>> 0,
    omega: () => 0,
    shadowLen: () => S.xr ? S.xr.L : 110,
    burnF: () => 1.35,
    init() { S.xr = { round: 1, t: 0, L: 110, fcd: 2, res: [], tint: null, names: mpNames() }; S.mode = 'count'; S.countT = 3.2; },
    moveKeys() { return S.xr.round === 1 ? keys : keys2; },
    onKey(e) {
      if (S.cfg.remote) return RNet.remoteKey(e);
      const R = S.xr, A = e.key === ' ' || e.key === 'Shift', B = e.key === 'Enter';
      if (S.cfg.online) {   // Gastgeber: alle Tasten gehören ihm, die Aktionstaste heißt je nach Runde Dash oder Funke
        if (!A && !B) return false;
        if (!e.repeat) { if (R.round === 1) dash(); else this.flare(); }
        return true;
      }
      if (KEY2[e.key]) { keys2.add(KEY2[e.key]); return true; }
      if (!A && !B) return false;
      if (!e.repeat) { if ((R.round === 1) === A) dash(); else this.flare(); }
      return true;
    },
    remoteAct() { if (S.xr.round === 1) this.flare(); else dash(); },
    flare() {
      const R = S.xr;
      if (R.fcd > 0) { Sound.sfx('deny'); return; }
      S.meteors.push({ x: S.p.x, y: S.p.y, r: 32, warn: 1.1 }); R.fcd = 3.2; Sound.sfx('alarm');
    },
    update(dt) {
      const R = S.xr, sk = R.round === 1 ? keys2 : keys, a = axis(sk);
      R.t += dt; if (R.fcd > 0) R.fcd -= dt;
      S.az += a.x * (1.1 + R.t * 0.025) * dt;
      R.L = Math.max(45, Math.min(150, R.L + a.y * 70 * dt));
      if (R.t >= this.ROUND) this.endRound(true);
    },
    onDeath() { this.endRound(false); return true; },
    endRound(survived) {
      const R = S.xr, N = R.names;
      R.res.push({ t: Math.min(R.t, this.ROUND), e: Math.max(0, S.energy), survived });
      S.score += Math.floor(Math.min(R.t, this.ROUND) * 10);   // 10 Punkte pro überlebter Sekunde, für beide zusammen
      if (R.round === 2) { S.grace = 99; S.energy = Math.max(S.energy, 1); finish(true); return; }
      R.round = 2; R.t = 0; R.L = 110; R.fcd = 2; R.tint = '#2F7D5B';
      S.energy = 100; S.p.x = W / 2; S.p.y = H / 2; S.dash = null; S.meteors = []; S.hot = []; S.hurt = 0; S.inv = 0; S.grace = 1.5;
      S.az = rand(0, TAU); resolve(); keys2.clear();
      S.mode = 'count'; S.countT = 3.2;
      S.banner = { text: tr('Tausch! ' + N[1] + ' überlebt', 'Swap! ' + N[1] + ' survives'), good: true, t: 2.4,
        head: (survived ? tr(N[0] + ' HAT ÜBERLEBT', N[0] + ' SURVIVED') : tr(N[0] + ' VERDAMPFT NACH ', N[0] + ' EVAPORATED AFTER ') + Math.floor(R.res[0].t) + ' s').toUpperCase() };
      Sound.sfx('level');
    },
    label() { const R = S.xr; return tr('Runde ', 'Round ') + R.round + '/2 · ' + R.names[R.round - 1] + tr(' überlebt · ', ' survives · ') + Math.max(0, Math.ceil(this.ROUND - R.t)) + ' s'; },
    drawHud() {
      const R = S.xr, N = R.names, surv = R.round - 1, spark = R.fcd > 0 ? tr('Funke in ', 'Spark in ') + R.fcd.toFixed(1) + ' s' : tr('Funke bereit', 'Spark ready');
      let lines;
      if (S.cfg.online) {
        const me = S.cfg.remote ? 1 : 0;
        lines = me === surv ? [[tr('Du überlebst: Pfeile/WASD laufen, Leertaste Dash', 'You survive: arrows/WASD move, Space dash'), '#FFFFFF'], [tr('Sonne ', 'Sun ') + N[1 - surv] + ': ' + spark, R.fcd > 0 ? '#98A1B4' : COL.warn]]
          : [[tr('Du bist die Sonne: ←→ drehen · ↑↓ Länge · Leertaste Funke', 'You are the sun: ←→ turn · ↑↓ length · Space spark'), '#F4CF63'], [spark, R.fcd > 0 ? '#98A1B4' : COL.warn]];
      } else {
        const sunP = R.round === 1 ? 2 : 1;
        const keysTxt = sunP === 2 ? tr('←→ drehen · ↑↓ Länge · Enter Funke', '←→ turn · ↑↓ length · Enter spark') : tr('A/D drehen · W/S Länge · Leertaste Funke', 'A/D turn · W/S length · Space spark');
        const dashTxt = R.round === 1 ? tr('P1 läuft: WASD, Leertaste Dash', 'P1 runs: WASD, Space dash') : tr('P2 läuft: Pfeile, Enter Dash', 'P2 runs: arrows, Enter dash');
        lines = [[tr('Sonne P' + sunP + ': ', 'Sun P' + sunP + ': ') + keysTxt, '#F4CF63'], [spark, R.fcd > 0 ? '#98A1B4' : COL.warn], [dashTxt, '#FFFFFF']];
      }
      hudLines(lines, W - 12, H - 14 - (lines.length - 1) * 18);
      if (R.res[0]) textOut(N[0] + ': ' + secs(R.res[0].t), W - 12, 22, '#C9B8FF', MONO, 'right');
    },
    record() { stat('tagGames'); return false; },
    result() {
      const R = S.xr, N = R.names, [a, b] = R.res;
      if (!a || !b) return { title: tr('Abgebrochen', 'Cancelled'), text: tr('Die Runde wurde vorzeitig beendet.', 'The round ended early.'), tiles: a ? [[N[0], secs(a.t), true]] : [] };
      const aw = a.t > b.t + 0.05 || (Math.abs(a.t - b.t) <= 0.05 && a.e > b.e + 0.5), bw = b.t > a.t + 0.05 || (Math.abs(a.t - b.t) <= 0.05 && b.e > a.e + 0.5);
      return { title: aw ? tr(N[0] + ' gewinnt!', N[0] + ' wins!') : bw ? tr(N[1] + ' gewinnt!', N[1] + ' wins!') : tr('Unentschieden', 'Draw'),
        text: tr('Wer länger überlebt, gewinnt. Bei Gleichstand zählt die übrige Kraft.', 'Whoever survives longer wins. On a tie the remaining energy counts.'),
        tiles: [[N[0], secs(a.t) + (a.survived ? ' ✓' : ''), aw], [N[1], secs(b.t) + (b.survived ? ' ✓' : ''), bw]] };
    },
  }),

  // Online, bis zu 8 Spieler als Geister, der Schatten schrumpft
  royale: {
    icon: 'decoy', maps: 'sun', mp: true, name: ['Battle Royale light', 'Battle royale light'],
    desc: ['Online mit bis zu 8 Spielern. Alle starten auf derselben Karte und sehen sich als Geister. Die Schatten werden immer kürzer. Der letzte Schatten gewinnt.', 'Online with up to 8 players. Everyone starts on the same map and sees the others as ghosts. Shadows keep shrinking. The last shadow standing wins.'],
    noLevels: true, noHearts: true, noUpgrades: true,
    shadowF: () => Math.max(0.3, 1 - Math.max(0, S.t - 5) / 140),
    init() { S.xr = { won: false, place: 0, n: RNet.players.length }; S.mode = 'count'; S.countT = 3.2; },
    update() { S.level = Math.min(14, Math.floor(S.t / 15)); },
    onDeath() { S.xr.place = RNet.localDied(); return false; },
    drawWorld() {
      for (const p of RNet.players) {
        if (p.id === RNet.me || !p.alive || p.dx == null) continue;
        drawCreature(ctx, p.dx, p.dy, PR, { skin: p.skin, hat: p.hat, t: S.t + p.id, alpha: 0.42, eyeAlpha: 0.6 });
        ring(p.dx, p.dy, PR + 6, 'rgba(233,227,255,.8)', 1.5, [3, 3]);
        ctx.globalAlpha = 0.85; textOut(p.name, p.dx, p.dy - 24, '#E9E3FF', '700 10px "JetBrains Mono", monospace', 'center'); ctx.globalAlpha = 1;
      }
    },
    label() { return 'Royale · ' + tr('noch ', '') + RNet.alive() + '/' + S.xr.n + tr(' · Schatten ', ' left · shadows ') + Math.round(this.shadowF() * 100) + ' %'; },
    meta() { return (P.stats.royaleWins ? tr(P.stats.royaleWins + '× gewonnen', 'won ' + P.stats.royaleWins + '×') : tr('Online, 2 bis 8 Spieler', 'Online, 2 to 8 players')); },
    record(won) { if (!won && !S.xr.place) S.xr.place = RNet.localDied(); stat('royaleGames'); if (won) stat('royaleWins'); return false; },
    result() {
      const R = S.xr, place = R.won ? 1 : R.place || RNet.alive() + 1;
      return { title: R.won ? tr('Letzter Schatten!', 'Last shadow standing!') : tr('Platz ', 'Place ') + place + tr(' von ', ' of ') + R.n,
        text: R.won ? tr('Alle anderen sind verdampft. Du hast gewonnen.', 'Everyone else evaporated. You won.') : R.alone ? tr('Der Gastgeber hat die Runde verlassen.', 'The host left the round.') : tr('Du bist nach ' + Math.floor(S.t) + ' Sekunden verdampft.', 'You evaporated after ' + Math.floor(S.t) + ' seconds.'),
        tiles: [[tr('Platz', 'Place'), place + '/' + R.n, true], [tr('Zeit', 'Time'), fmtTime(S.t)], [tr('Punkte', 'Score'), fmt(S.result.sc)]] };
    },
    againLabel() { return RNet.role === 'host' ? [tr('Neue Runde', 'New round'), RNet.inMatch || RNet.players.length < 2] : [tr('Warte auf Gastgeber', 'Waiting for host'), true]; },
    again() { RNet.start(); },
    backTo() { open('scrMulti'); },
  },
};
// Wie pushOut in maps.js, aber für ein beliebiges Objekt (die zweite Figur im Koop-Modus)
function pushOutObj(r, o, r0) {
  if (r.round) {
    const cx = pcx(r), cy = pcy(r), rr = r.w / 2 + r0, dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
    if (d < rr) { if (d > 0.001) { o.x = cx + dx / d * rr; o.y = cy + dy / d * rr; } else o.y = cy - rr; }
    return;
  }
  const nx = Math.max(r.x, Math.min(o.x, r.x + r.w)), ny = Math.max(r.y, Math.min(o.y, r.y + r.h));
  const dx = o.x - nx, dy = o.y - ny, d = Math.hypot(dx, dy);
  if (d < r0) { if (d > 0.001) { o.x = nx + dx / d * r0; o.y = ny + dy / d * r0; } else o.y = r.y - r0; }
}
