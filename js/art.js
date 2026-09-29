'use strict';
// Grundlagen, Zufall, Symbole, Bosse, Spielfigur, Skins und Hüte
const W = 480, H = 480, PR = 9, CELL = 40, TAU = Math.PI * 2;
const COL = { lit:'#F4CF63', tile:'#EABF4A', shade:'#3F4C6B', shadeTile:'#394562', top:'#1F2535', edge:'#323B55',
              body:'#141821', eye:'#F4F6FA', dew:'#7FD6E8', sun:'#FFB020', warn:'#E8664F', hot:'#E2572B',
              bug:'#FFE36B', gold:'#FFC21A', crystal:'#9B7CF0', umbrella:'#E0457B', hourglass:'#2F9E6E', white:'#FFFFFF',
              magnet:'#D9463B', boots:'#2B8FD6', seed:'#5E8C3A', heart:'#D6304F', frost:'#3AA5E0', shrink:'#F08A24',
              thunder:'#6C5CE7', shroom:'#9B3FC0', acid:'#B6E04A', honey:'#C98A1B', portal:'#9B7CF0', good:'#5FBE90' };
const $ = id => document.getElementById(id);
let LANG = 'en';
const tr = (de, en) => LANG === 'de' ? de : en;
const cv = $('game');
const ctx = cv.getContext('2d');

// ---------- Zufall ----------
// Die Welt würfelt mit rng(). In der täglichen Herausforderung und im Duell ist er geseedet,
// damit alle mit demselben Innenhof starten. Effekte würfeln mit fx(), das stört den Seed nicht.
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
let rng = Math.random;
const rand = (a, b) => a + rng() * (b - a);
const fx = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = arr => arr[Math.floor(rng() * arr.length)];
const fmt = n => Math.floor(n).toLocaleString(LANG === 'de' ? 'de-DE' : 'en-US');
const dpr = () => Math.min(window.devicePixelRatio || 1, 3);

// ---------- Lexikon ----------
const GOOD = [
  ['dew','Tautropfen','Liegt nur in der Sonne. 50 Punkte mal Kombo.'],
  ['gold','Goldtau','Selten. 200 Punkte.'],
  ['umbrella','Schirm','5 s eigener Schatten. Schützt auch vor Käfern, Glas, Funken und Leuchtturm.'],
  ['crystal','Mondstein','Sofort +35 Kraft.'],
  ['hourglass','Sanduhr','5 s lang läuft alles in Zeitlupe.'],
  ['cloud','Wolke','Zieht übers Feld, ihr Schatten wandert mit.'],
  ['magnet','Magnet','6 s lang fliegt alles in deiner Nähe zu dir. Leider auch Fallen.'],
  ['boots','Turboschuhe','5 s lang fast doppelt so schnell.'],
  ['bomb','Schattenbombe','Legt 8 s lang eine große Schattenpfütze an deine Stelle.'],
  ['seed','Säulensamen','Lässt sofort eine neue Säule wachsen, genau zwischen dir und der Sonne.'],
  ['heart','Herz','Ein Extraleben, normal höchstens 2.'],
  ['star','Doppelstern','8 s lang doppelte Punkte.'],
  ['frost','Frostkristall','Friert 4 s lang alle Gegner ein, auch den Boss.'],
  ['shrink','Schrumpftrank','6 s lang winzig. Schwerer zu treffen und passt in schmale Schatten.'],
  ['thunder','Donnerschlag','Vernichtet alle Käfer und Elstern, 15 Punkte pro Stück.'],
  ['portal','Portale','Zwei Tore. Lauf in eines und komm beim anderen raus.'],
  ['eclipse','Mondfinsternis','Chaos-Rad: 4 s lang ist das ganze Feld Schatten.'],
  ['rain','Tauregen','Chaos-Rad: Plötzlich liegen 8 Tautropfen herum.'],
  ['bubble','Blasenschild','Fängt die nächsten 3 Treffer ab: Laser, Käfer, Funken, Lichtkugeln und Bosse.'],
  ['dashy','Dauerdash','6 s lang Dash fast ohne Abklingzeit.'],
  ['loot','Boss-Beute','Jeder besiegte Boss lässt ein Herz oder einen Mondstein und ein zufälliges Extra fallen.'],
  ['decoy','Schattenklon','6 s lang ein Doppelgänger. Käfer, Raketen und das Brennglas jagen ihn statt dich.'],
  ['spear','Schattenspeer','Trifft den Boss sofort für 2 Schaden. Ohne Boss gibt es 100 Punkte.'],
  ['spikes','Stachelpanzer','6 s lang zerstört jede Berührung Käfer und Raketen und verletzt Bosse, auch ohne Dash.'],
  ['clover','Glücksklee','Die nächsten 3 Drehungen des Chaos-Rads sind gut.'],
  ['lootrain','Beuteregen','Chaos-Rad: 3 zufällige Extras fallen vom Himmel.'],
];
const BAD = [
  ['bug','Lichtkäfer','Jagt dich. Kostet 18 Kraft und stößt dich weg.'],
  ['hot','Heiße Fliese','Blinkt zuerst, brennt dann auch im Schatten.'],
  ['lens','Brennglas','Ab Stufe 2. Ein heller Fleck, der dir folgt.'],
  ['noon','Mittagssonne','Chaos-Rad: 4 s lang werden alle Schatten winzig.'],
  ['crumble','Einsturz','Bei jedem Stufenwechsel verschwindet eine Säule.'],
  ['shroom','Umkehrpilz','Falle. 5 s lang ist deine Steuerung verdreht, auch der Dash.'],
  ['acid','Säuretropfen','Falle, sieht aus wie Tau. −25 Kraft und −100 Punkte.'],
  ['honey','Honigpfütze','Chaos-Rad: Klebrig, du wirst halb so schnell.'],
  ['meteor','Sonnenfunken','Chaos-Rad: Rote Kreise warnen vor dem Einschlag, danach brennt der Boden.'],
  ['beam','Leuchtturm','Chaos-Rad: Ein Lichtstrahl dreht sich übers Feld und brennt sogar im Schatten.'],
  ['sun2','Zweite Sonne','Chaos-Rad: 7 s lang zwei Sonnen. Sicher bist du nur dort, wo sich beide Schatten überlappen.'],
  ['wind','Sturmböe','Chaos-Rad: 4 s lang drückt der Wind dich weg.'],
  ['swarm','Käferschwarm','Chaos-Rad: 5 Käfer auf einmal.'],
  ['quake','Erdbeben','Chaos-Rad: Alle Säulen springen an neue Plätze.'],
  ['flash','Blitzlicht','Chaos-Rad: Kurz ist alles weiß und du siehst fast nichts.'],
  ['magpie','Elster','Chaos-Rad: Klaut Tau und Hilfsmittel. Berühr sie, dann fliegt sie weg (+30).'],
  ['lasergrid','Lasergitter','Chaos-Rad: Gestrichelte Linien quer übers Feld, kurz danach feuern Laser. −15 pro Treffer.'],
  ['turret','Laserturm','Chaos-Rad: Ein Turm mit einem Laser, der sich im Kreis dreht.'],
  ['shots','Lichtkugeln','Bosse schießen Kugeln. −12 pro Treffer, Säulen fangen sie ab.'],
  ['saw','Sägeblätter','Chaos-Rad: Zwei Sägen prallen 8 s lang von Wänden und Säulen ab. −15.'],
  ['missile','Suchraketen','Chaos-Rad: Verfolgen dich in Kurven. −20. Lock sie gegen eine Säule oder dashe hindurch.'],
  ['vortex','Lichtwirbel','Chaos-Rad: Zieht dich 5 s lang zu sich, raus aus deinem Schatten.'],
  ['glass','Glassäulen','Chaos-Rad: Die Hälfte der Säulen wird 5 s lang durchsichtig und wirft keinen Schatten.'],
];
const BOSS_INFO = [
  ['prisma','Prisma','Stufe 2, 5, 8 … Schwebt übers Feld und schießt drehende Laser in alle Richtungen.'],
  ['queen','Käferkönigin','Stufe 3, 6, 9 … Kreist um die Mitte, schießt Ringe aus Lichtkugeln und ruft Käfer.'],
  ['bull','Sonnenstier','Stufe 4, 7, 10 … Zielt mit einem roten Strich und stürmt los. Er zerlegt Säulen. Nach dem Aufprall an der Wand ist er benommen, dann zählt ein Dash doppelt.'],
  ['core','Sonnenkern','Endboss der Kampagne, im Endlosmodus alle 10 Stufen. Kämpft in drei Phasen: erst Laser, dann Kugelringe, zum Schluss stürmt er los.'],
];

// ---------- Symbole (Spiel, Lexikon, Karten und Abzeichen teilen sie) ----------
function dropShape(c, x, y, s, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y - 9 * s);
  c.quadraticCurveTo(x + 7 * s, y + 1, x, y + 6 * s);
  c.quadraticCurveTo(x - 7 * s, y + 1, x, y - 9 * s);
  c.fill();
}
function disc(c, color) {
  c.fillStyle = color; c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = 1.8; c.lineCap = 'round'; c.lineJoin = 'round';
}
function bugShape(c, x, y) {
  c.fillStyle = 'rgba(255,227,107,.4)'; c.beginPath(); c.arc(x, y, 10, 0, TAU); c.fill();
  c.fillStyle = COL.bug; c.strokeStyle = '#8A5A00'; c.lineWidth = 1.2;
  c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); c.stroke();
}
function sunShape(c, x, y, r) {
  c.strokeStyle = COL.sun; c.lineWidth = 2; c.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35); c.lineTo(x + Math.cos(a) * r * 1.8, y + Math.sin(a) * r * 1.8); c.stroke(); }
  c.fillStyle = COL.sun; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function starPath(c, x, y, r1, r2, n) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = -Math.PI / 2 + i * Math.PI / n; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath();
}
function icon(c, k) {
  c.save();
  switch (k) {
    case 'dew': dropShape(c, 0, 2, 1.1, COL.dew); break;
    case 'gold': dropShape(c, 0, 2, 1.3, COL.gold); c.strokeStyle = '#8A5A00'; c.lineWidth = 1; c.stroke(); break;
    case 'acid': dropShape(c, 0, 2, 1.1, COL.acid); c.fillStyle = '#4F6B0A'; c.beginPath(); c.arc(-2, 2, 1.4, 0, TAU); c.arc(2, -1, 1, 0, TAU); c.fill(); break;
    case 'umbrella': disc(c, COL.umbrella); c.beginPath(); c.arc(0, 1, 7, Math.PI, 0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(0, 1); c.lineTo(0, 6); c.arc(-1.5, 6, 1.5, 0, Math.PI); c.stroke(); break;
    case 'crystal': c.fillStyle = COL.crystal; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -11); c.lineTo(8, -2); c.lineTo(0, 11); c.lineTo(-8, -2); c.closePath(); c.fill(); c.stroke(); break;
    case 'hourglass': disc(c, COL.hourglass); c.beginPath(); c.moveTo(-5, -6); c.lineTo(5, -6); c.lineTo(-5, 6); c.lineTo(5, 6); c.closePath(); c.fill(); break;
    case 'magnet': disc(c, COL.magnet); c.lineWidth = 3; c.beginPath(); c.moveTo(-5, -6); c.lineTo(-5, 0); c.arc(0, 0, 5, Math.PI, 0, true); c.lineTo(5, -6); c.stroke(); break;
    case 'boots': disc(c, COL.boots); c.lineWidth = 2.4; c.beginPath(); c.moveTo(-6, -5); c.lineTo(-1, 0); c.lineTo(-6, 5); c.moveTo(0, -5); c.lineTo(5, 0); c.lineTo(0, 5); c.stroke(); break;
    case 'bomb': c.fillStyle = COL.body; c.beginPath(); c.arc(-1, 2, 8, 0, TAU); c.fill(); c.strokeStyle = '#8A5A00'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(4, -4); c.quadraticCurveTo(6, -8, 8, -8); c.stroke(); c.fillStyle = COL.sun; c.beginPath(); c.arc(8.5, -8.5, 2.2, 0, TAU); c.fill(); break;
    case 'seed': disc(c, COL.seed); c.fillStyle = COL.top; c.fillRect(-4, -1, 8, 7); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -1); c.lineTo(0, -7); c.stroke(); c.beginPath(); c.ellipse(3, -6, 3, 1.6, -0.5, 0, TAU); c.fill(); break;
    case 'heart': c.fillStyle = COL.heart; c.beginPath(); c.moveTo(0, 9); c.bezierCurveTo(-13, 0, -7, -11, 0, -4); c.bezierCurveTo(7, -11, 13, 0, 0, 9); c.fill(); break;
    case 'star': c.fillStyle = COL.gold; c.strokeStyle = '#8A5A00'; c.lineWidth = 1.2; starPath(c, 0, 0, 11, 4.5, 5); c.fill(); c.stroke(); break;
    case 'frost': disc(c, COL.frost); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); c.lineTo(-Math.cos(a) * 7, -Math.sin(a) * 7); c.stroke(); } break;
    case 'shrink': disc(c, COL.shrink); c.beginPath(); c.moveTo(-7, -7); c.lineTo(-2.5, -2.5); c.moveTo(7, 7); c.lineTo(2.5, 2.5); c.moveTo(-2.5, -6); c.lineTo(-2.5, -2.5); c.lineTo(-6, -2.5); c.moveTo(2.5, 6); c.lineTo(2.5, 2.5); c.lineTo(6, 2.5); c.stroke(); break;
    case 'thunder': disc(c, COL.thunder); c.beginPath(); c.moveTo(2, -8); c.lineTo(-4, 1); c.lineTo(0, 1); c.lineTo(-2, 8); c.lineTo(4, -1); c.lineTo(0, -1); c.closePath(); c.fill(); break;
    case 'portal': c.fillStyle = 'rgba(155,124,240,.35)'; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill(); c.strokeStyle = COL.portal; c.lineWidth = 3; c.stroke(); c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 1.4); c.stroke(); break;
    case 'eclipse': c.fillStyle = COL.gold; c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill(); c.fillStyle = COL.body; c.beginPath(); c.arc(1.5, -1, 9.5, 0, TAU); c.fill(); break;
    case 'rain': dropShape(c, -6, -3, 0.6, COL.dew); dropShape(c, 5, -5, 0.6, COL.dew); dropShape(c, 0, 6, 0.6, COL.dew); break;
    case 'cloud': c.fillStyle = COL.shade; c.beginPath(); c.ellipse(0, 2, 12, 7, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-2, -3, 8, 5, 0, 0, TAU); c.ellipse(4, -2, 6, 4, 0, 0, TAU); c.fill(); break;
    case 'bug': bugShape(c, 0, 0); break;
    case 'swarm': bugShape(c, -6, -4); bugShape(c, 6, -2); bugShape(c, 0, 6); break;
    case 'hot': c.fillStyle = COL.hot; c.fillRect(-11, -11, 22, 22); c.strokeStyle = COL.sun; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-4, 7); c.quadraticCurveTo(0, 0, -4, -7); c.moveTo(4, 7); c.quadraticCurveTo(8, 0, 4, -7); c.stroke(); break;
    case 'lens': c.fillStyle = '#FFF6D0'; c.strokeStyle = COL.sun; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill(); c.stroke(); break;
    case 'noon': sunShape(c, 0, 0, 5.5); break;
    case 'sun2': sunShape(c, -5, -4, 3.5); sunShape(c, 5, 5, 3.5); break;
    case 'crumble': c.fillStyle = COL.warn; c.fillRect(-10, -10, 20, 20); c.strokeStyle = COL.top; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-10, -2); c.lineTo(-2, 1); c.lineTo(3, -6); c.moveTo(-2, 1); c.lineTo(1, 10); c.stroke(); break;
    case 'honey': c.fillStyle = COL.honey; c.beginPath(); c.ellipse(0, 3, 11, 6, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-3, 3); c.quadraticCurveTo(-4, -8, 0, -9); c.quadraticCurveTo(4, -8, 3, 3); c.fill(); break;
    case 'meteor': c.strokeStyle = COL.warn; c.lineWidth = 2; c.setLineDash([3, 3]); c.beginPath(); c.arc(0, 3, 8, 0, TAU); c.stroke(); c.setLineDash([]); c.fillStyle = COL.hot; c.beginPath(); c.arc(4, -6, 4, 0, TAU); c.fill(); c.strokeStyle = COL.sun; c.beginPath(); c.moveTo(7, -9); c.lineTo(11, -12); c.stroke(); break;
    case 'beam': c.fillStyle = 'rgba(255,176,32,.55)'; c.beginPath(); c.moveTo(-10, 10); c.lineTo(12, -6); c.lineTo(6, -12); c.closePath(); c.fill(); c.fillStyle = COL.body; c.fillRect(-12, 7, 5, 5); break;
    case 'wind': c.strokeStyle = '#5B6376'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-10, -5); c.lineTo(6, -5); c.quadraticCurveTo(11, -5, 9, -9); c.moveTo(-10, 1); c.lineTo(10, 1); c.moveTo(-10, 7); c.lineTo(3, 7); c.quadraticCurveTo(8, 7, 6, 11); c.stroke(); break;
    case 'quake': c.strokeStyle = COL.warn; c.lineWidth = 2.2; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-11, 0); c.lineTo(-6, -7); c.lineTo(-2, 7); c.lineTo(2, -8); c.lineTo(6, 6); c.lineTo(11, 0); c.stroke(); break;
    case 'flash': c.strokeStyle = COL.sun; c.lineWidth = 2; c.fillStyle = '#FFFFFF'; starPath(c, 0, 0, 11, 4, 8); c.fill(); c.stroke(); break;
    case 'magpie': c.fillStyle = COL.body; c.beginPath(); c.ellipse(-1, 1, 8, 5, -0.2, 0, TAU); c.fill(); c.beginPath(); c.moveTo(6, -1); c.lineTo(12, -4); c.lineTo(11, 1); c.fill(); c.beginPath(); c.arc(-8, -3, 3.5, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 3, 4, 2.2, 0, 0, TAU); c.fill(); c.fillStyle = COL.sun; c.beginPath(); c.moveTo(-11, -3); c.lineTo(-14, -2); c.lineTo(-11, -1.5); c.fill(); break;
    case 'shroom': c.fillStyle = '#F2E6D8'; c.fillRect(-3, 0, 6, 9); c.fillStyle = COL.shroom; c.beginPath(); c.arc(0, 1, 10, Math.PI, 0); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-4, -3, 1.6, 0, TAU); c.arc(3, -5, 1.4, 0, TAU); c.arc(5, -1, 1.1, 0, TAU); c.fill(); break;
    case 'bubble': c.fillStyle = 'rgba(111,195,255,.3)'; c.strokeStyle = '#2F8FD6'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#2F8FD6'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-4 + i * 4, 0, 1.6, 0, TAU); c.fill(); }
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-4, -5, 3, 1.5, -0.6, 0, TAU); c.fill(); break;
    case 'dashy': disc(c, '#16918F'); c.lineWidth = 2; c.beginPath(); c.moveTo(-7, -4); c.lineTo(-2, -4); c.moveTo(-8, 0); c.lineTo(-1, 0); c.moveTo(-7, 4); c.lineTo(-2, 4); c.stroke();
      c.beginPath(); c.moveTo(1, -6); c.lineTo(7, 0); c.lineTo(1, 6); c.closePath(); c.fill(); break;
    case 'twin': disc(c, '#16918F'); c.beginPath(); c.moveTo(-6, -6); c.lineTo(0, 0); c.lineTo(-6, 6); c.closePath(); c.fill(); c.beginPath(); c.moveTo(1, -6); c.lineTo(7, 0); c.lineTo(1, 6); c.closePath(); c.fill(); break;
    case 'loot': c.fillStyle = '#8A5A00'; c.fillRect(-10, -3, 20, 12); c.fillStyle = COL.gold; c.fillRect(-10, -9, 20, 7); c.fillStyle = '#8A5A00'; c.fillRect(-2, -5, 4, 5); break;
    case 'lasergrid': for (const y of [-6, 0, 6]) { c.strokeStyle = 'rgba(255,60,60,.35)'; c.lineWidth = 4; c.beginPath(); c.moveTo(-11, y); c.lineTo(11, y); c.stroke(); c.strokeStyle = '#FF4B4B'; c.lineWidth = 1.5; c.stroke(); } break;
    case 'turret': c.strokeStyle = '#FF4B4B'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(12, -9); c.stroke(); c.fillStyle = COL.top; c.beginPath(); c.arc(-2, 2, 8, 0, TAU); c.fill(); c.fillStyle = '#FF4B4B'; c.beginPath(); c.arc(-2, 2, 3, 0, TAU); c.fill(); break;
    case 'shots': for (const [x, y] of [[-5, -4], [5, -2], [0, 6]]) { c.fillStyle = 'rgba(255,227,107,.5)'; c.beginPath(); c.arc(x, y, 5.5, 0, TAU); c.fill(); c.fillStyle = '#FFF6D0'; c.strokeStyle = COL.sun; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); c.stroke(); } break;
    case 'decoy': c.globalAlpha *= 0.6; c.fillStyle = '#6D5BD0'; c.beginPath(); c.moveTo(-9, 7); c.quadraticCurveTo(-10, -12, 0, -11); c.quadraticCurveTo(10, -12, 9, 7); c.lineTo(3, 4); c.lineTo(0, 8); c.lineTo(-3, 4); c.closePath(); c.fill();
      c.globalAlpha /= 0.6; c.fillStyle = '#fff'; c.beginPath(); c.arc(-3.5, -3, 1.8, 0, TAU); c.arc(3.5, -3, 1.8, 0, TAU); c.fill(); break;
    case 'spear': c.rotate(-0.8); c.strokeStyle = COL.body; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 11); c.lineTo(0, -4); c.stroke();
      c.fillStyle = '#6D5BD0'; c.beginPath(); c.moveTo(0, -12); c.lineTo(4.5, -3); c.lineTo(-4.5, -3); c.closePath(); c.fill(); break;
    case 'spikes': c.fillStyle = '#8A93A6'; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); c.lineTo(Math.cos(a + 0.35) * 6, Math.sin(a + 0.35) * 6); c.lineTo(Math.cos(a - 0.35) * 6, Math.sin(a - 0.35) * 6); c.fill(); }
      c.fillStyle = COL.body; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill(); break;
    case 'clover': c.fillStyle = '#3E9A4E'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; c.beginPath(); c.arc(Math.cos(a) * 5, Math.sin(a) * 5, 4.8, 0, TAU); c.fill(); }
      c.strokeStyle = '#2B6E37'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(3, 7, 7, 11); c.stroke(); break;
    case 'lootrain': c.save(); c.translate(-5, -4); c.scale(0.55, 0.55); icon(c, 'bubble'); c.restore(); c.save(); c.translate(6, -2); c.scale(0.55, 0.55); icon(c, 'star'); c.restore(); c.save(); c.translate(0, 7); c.scale(0.55, 0.55); icon(c, 'heart'); c.restore(); break;
    case 'saw': c.fillStyle = '#9AA3B2'; starPath(c, 0, 0, 11.5, 8, 8); c.fill();
      c.fillStyle = '#5B6376'; c.beginPath(); c.arc(0, 0, 3.5, 0, TAU); c.fill(); break;
    case 'missile': c.rotate(-0.6); c.fillStyle = COL.sun; c.beginPath(); c.moveTo(-11, -3); c.lineTo(-15, 0); c.lineTo(-11, 3); c.fill();
      c.fillStyle = '#C3402C'; c.beginPath(); c.moveTo(11, 0); c.lineTo(4, -4); c.lineTo(-10, -4); c.lineTo(-10, 4); c.lineTo(4, 4); c.closePath(); c.fill();
      c.fillStyle = '#F2E6D8'; c.fillRect(-8, -6, 4, 12); break;
    case 'vortex': c.strokeStyle = COL.sun; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 40; i++) { const a = i * 0.45, r = i * 0.28; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.stroke(); break;
    case 'glass': c.fillStyle = 'rgba(190,225,255,.7)'; c.strokeStyle = '#6FA8D6'; c.lineWidth = 2; c.fillRect(-10, -10, 20, 20); c.strokeRect(-10, -10, 20, 20);
      c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(-6, 4); c.lineTo(4, -6); c.moveTo(-2, 7); c.lineTo(7, -2); c.stroke(); break;
    case 'flame': c.fillStyle = '#E2572B'; c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(10, -2, 7, 5); c.quadraticCurveTo(4, 11, 0, 11); c.quadraticCurveTo(-4, 11, -7, 5); c.quadraticCurveTo(-10, -2, 0, -12); c.fill();
      c.fillStyle = COL.gold; c.beginPath(); c.moveTo(0, -3); c.quadraticCurveTo(5, 3, 3, 7); c.quadraticCurveTo(0, 10, -3, 7); c.quadraticCurveTo(-5, 3, 0, -3); c.fill(); break;
    case 'trophy': c.fillStyle = COL.gold; c.strokeStyle = '#8A5A00'; c.lineWidth = 1.3; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-7, -10); c.lineTo(7, -10); c.quadraticCurveTo(7, 2, 0, 3); c.quadraticCurveTo(-7, 2, -7, -10); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(-7, -5, 3.5, Math.PI * 0.5, Math.PI * 1.5); c.moveTo(7, -8.5); c.arc(7, -5, 3.5, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
      c.fillRect(-1.5, 3, 3, 4); c.fillRect(-6, 7, 12, 3.5); c.strokeRect(-6, 7, 12, 3.5); break;
    case 'target': c.strokeStyle = COL.warn; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, 5.5, 0, TAU); c.stroke(); c.fillStyle = COL.warn; c.beginPath(); c.arc(0, 0, 2, 0, TAU); c.fill(); break;
    case 'hat': drawHat(c, 'zylinder', 0, 7, 1.15, 0); break;
    case 'calendar': c.fillStyle = '#F2F4F8'; c.strokeStyle = '#5B6376'; c.lineWidth = 1.4; c.fillRect(-9, -8, 18, 17); c.strokeRect(-9, -8, 18, 17); c.fillStyle = COL.warn; c.fillRect(-9, -8, 18, 5);
      c.fillStyle = '#5B6376'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) c.fillRect(-6 + i * 5, 0 + j * 4, 2.5, 2.5); break;
    case 'prisma': case 'queen': case 'bull': case 'core': c.scale(0.34, 0.34); bossBody(c, k, 0.4, null); break;
  }
  c.restore();
}

function bossBody(c, type, t, B) {
  if (type === 'prisma') {
    c.fillStyle = 'rgba(111,195,255,.28)'; c.beginPath(); c.arc(0, 0, 34, 0, TAU); c.fill();
    c.save(); c.rotate(t * 1.5);
    c.fillStyle = '#E8F4FF'; c.strokeStyle = '#2F7FBF'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, -27); c.lineTo(23, 0); c.lineTo(0, 27); c.lineTo(-23, 0); c.closePath(); c.fill(); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -27); c.lineTo(0, 27); c.moveTo(-23, 0); c.lineTo(23, 0); c.stroke();
    c.restore();
    c.fillStyle = '#C3402C'; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-1.5, -1.5, 2, 0, TAU); c.fill();
  } else if (type === 'queen') {
    c.fillStyle = 'rgba(255,227,107,.35)'; c.beginPath(); c.arc(0, 0, 36, 0, TAU); c.fill();
    const f = Math.sin(t * 30) * 0.25;
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.beginPath(); c.ellipse(-17, -4, 13, 7, -0.5 + f, 0, TAU); c.ellipse(17, -4, 13, 7, 0.5 - f, 0, TAU); c.fill();
    c.fillStyle = COL.bug; c.strokeStyle = '#8A5A00'; c.lineWidth = 2.5;
    c.beginPath(); c.ellipse(0, 6, 17, 21, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-15, 4); c.lineTo(15, 4); c.moveTo(-13, 14); c.lineTo(13, 14); c.stroke();
    c.fillStyle = '#8A5A00'; c.beginPath(); c.arc(0, -16, 9, 0, TAU); c.fill();
    c.fillStyle = COL.gold; c.strokeStyle = '#8A5A00'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-9, -23); c.lineTo(-9, -33); c.lineTo(-4, -28); c.lineTo(0, -36); c.lineTo(4, -28); c.lineTo(9, -33); c.lineTo(9, -23); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-3.5, -17, 2, 0, TAU); c.arc(3.5, -17, 2, 0, TAU); c.fill();
  } else if (type === 'core') {
    const ph = B ? (B.phase || 0) : 0;
    const body = ['#FFB020', '#F08A24', '#E2572B'][ph], hi = ['#FFE9A8', '#FFD08A', '#FFB59E'][ph];
    const g = c.createRadialGradient(0, 0, 8, 0, 0, 48);
    g.addColorStop(0, 'rgba(255,240,190,.95)'); g.addColorStop(1, 'rgba(255,176,32,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 48, 0, TAU); c.fill();
    c.save(); c.rotate(t * (0.8 + ph * 0.5)); c.fillStyle = body;
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12, L = 39 + Math.sin(t * 6 + i) * 3;
      c.beginPath(); c.moveTo(Math.cos(a - 0.13) * 27, Math.sin(a - 0.13) * 27); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.lineTo(Math.cos(a + 0.13) * 27, Math.sin(a + 0.13) * 27); c.fill();
    }
    c.restore();
    c.fillStyle = body; c.strokeStyle = '#7A2A00'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 29, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = hi; c.globalAlpha *= 0.6; c.beginPath(); c.ellipse(-9, -11, 10, 6, -0.5, 0, TAU); c.fill(); c.globalAlpha /= 0.6;
    const stun = B && B.state === 'stun';
    c.strokeStyle = '#3A1400'; c.fillStyle = '#3A1400'; c.lineWidth = 3; c.lineCap = 'round';
    for (const s of [-1, 1]) {
      if (stun) { c.beginPath(); c.moveTo(s * 10 - 4, -6); c.lineTo(s * 10 + 4, 2); c.moveTo(s * 10 + 4, -6); c.lineTo(s * 10 - 4, 2); c.stroke(); }
      else { c.beginPath(); c.ellipse(s * 10, -1, 4, 5, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(s * 16, -11 + ph); c.lineTo(s * 5, -8 - ph); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(s * 10 - 1, -2.5, 1.4, 0, TAU); c.fill(); c.fillStyle = '#3A1400'; }
    }
    c.beginPath(); c.arc(0, 17, 8, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  } else {
    c.strokeStyle = '#F2E6D8'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-15, -14); c.quadraticCurveTo(-30, -20, -26, -34); c.moveTo(15, -14); c.quadraticCurveTo(30, -20, 26, -34); c.stroke();
    c.fillStyle = B && B.state === 'charge' ? '#E2572B' : '#C3402C';
    c.beginPath(); c.arc(0, 0, 24, 0, TAU); c.fill();
    c.fillStyle = '#7A1F14'; c.beginPath(); c.ellipse(0, 11, 10, 6.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#F2E6D8'; c.beginPath(); c.arc(-4, 11, 1.8, 0, TAU); c.arc(4, 11, 1.8, 0, TAU); c.fill();
    const stun = B && B.state === 'stun';
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = 2;
    for (const s of [-1, 1]) {
      if (stun) { c.beginPath(); c.moveTo(s * 9 - 3, -8); c.lineTo(s * 9 + 3, -2); c.moveTo(s * 9 + 3, -8); c.lineTo(s * 9 - 3, -2); c.stroke(); }
      else { c.beginPath(); c.arc(s * 9, -5, 4, 0, TAU); c.fill(); c.fillStyle = COL.body; c.beginPath(); c.arc(s * 9, -4, 2, 0, TAU); c.fill(); c.fillStyle = '#fff'; }
    }
  }
}

// ---------- Spielfigur, Skins und Hüte ----------
const SKINS = [
  { id: 'schatten', name: 'Schatten', body: '#141821', eye: '#F4F6FA' },
  { id: 'mitternacht', name: 'Mitternacht', body: '#1C2E6E', eye: '#CFE0FF', cost: 1500 },
  { id: 'pflaume', name: 'Pflaume', body: '#4B1F63', eye: '#F7D6FF', cost: 2500 },
  { id: 'moos', name: 'Moos', body: '#1D4A33', eye: '#DDFFC2', cost: 3500 },
  { id: 'tinte', name: 'Tinte', body: '#0D3E4A', eye: '#A6F4FF', cost: 5000 },
  { id: 'glut', name: 'Glut', body: '#5A1414', eye: '#FFB020', rim: '#E2572B', cost: 8000 },
  { id: 'geist', name: 'Geist', body: '#E9EDF6', eye: '#141821', rim: '#8E9CC2', req: { stat: 'prisma', n: 3, text: 'Besiege Prisma 3×' } },
  { id: 'honig', name: 'Honig', body: '#C98A1B', eye: '#141821', rim: '#8A5A00', req: { stat: 'queen', n: 3, text: 'Besiege die Käferkönigin 3×' } },
  { id: 'stier', name: 'Stierblut', body: '#8E1F14', eye: '#F2E6D8', req: { stat: 'bull', n: 3, text: 'Besiege den Sonnenstier 3×' } },
  { id: 'sternen', name: 'Sternenstaub', body: '#1A1440', eye: '#FFFFFF', fx: 'stars', req: { stat: 'wins', n: 1, text: 'Gewinne die Kampagne' } },
  { id: 'regenbogen', name: 'Regenbogen', body: 'rainbow', eye: '#FFFFFF', cost: 25000 },
  { id: 'gold', name: 'Goldschatten', body: '#D9A21B', eye: '#141821', rim: '#8A5A00', fx: 'shine', req: { stat: 'bosses', n: 25, text: 'Besiege 25 Bosse' } },
];
const HATS = [
  { id: 'none', name: 'Ohne Hut' },
  { id: 'zylinder', name: 'Zylinder', cost: 1000 },
  { id: 'party', name: 'Partyhut', cost: 2000 },
  { id: 'bommel', name: 'Bommelmütze', cost: 3000 },
  { id: 'blume', name: 'Blümchen', cost: 4000 },
  { id: 'pirat', name: 'Piratenhut', cost: 7000 },
  { id: 'propeller', name: 'Propellermütze', cost: 10000 },
  { id: 'zauberer', name: 'Zauberhut', cost: 15000 },
  { id: 'diadem', name: 'Prisma-Diadem', req: { stat: 'prisma', n: 1, text: 'Besiege Prisma' } },
  { id: 'krone', name: 'Käferkrone', req: { stat: 'queen', n: 1, text: 'Besiege die Käferkönigin' } },
  { id: 'hoerner', name: 'Stierhörner', req: { stat: 'bull', n: 1, text: 'Besiege den Sonnenstier' } },
  { id: 'heiligenschein', name: 'Heiligenschein', req: { stat: 'cleanBoss', n: 1, text: 'Besiege einen Boss ohne Treffer' } },
  { id: 'schlafmuetze', name: 'Schlafmütze', req: { stat: 'dailyDone', n: 3, text: 'Schaffe 3 tägliche Herausforderungen' } },
  { id: 'sonnenkrone', name: 'Sonnenkrone', req: { stat: 'core', n: 1, text: 'Besiege den Sonnenkern' } },
];
const SKIN_BY = Object.fromEntries(SKINS.map(s => [s.id, s]));
const HAT_BY = Object.fromEntries(HATS.map(h => [h.id, h]));

function creaturePath(c, x, y, R, wob) {
  const k = R / PR;
  c.beginPath();
  c.moveTo(x - R, y + R * 0.7);
  c.quadraticCurveTo(x - R - k, y - R - 3 * k + wob, x, y - R - 2 * k);
  c.quadraticCurveTo(x + R + k, y - R - 3 * k - wob, x + R, y + R * 0.7);
  for (let i = 0; i < 3; i++) {
    const x1 = x + R - (i + 0.5) * (R * 2 / 3), x2 = x + R - (i + 1) * (R * 2 / 3);
    c.quadraticCurveTo(x1, y + R * 1.2 + wob, x2, y + R * 0.7);
  }
  c.closePath();
}
// o: skin, hat, t, alpha, tint (Umkehrpilz), eyes ('open' | 'burn' | 'dizzy' | 'happy')
function drawCreature(c, x, y, R, o) {
  const sk = SKIN_BY[o.skin] || SKINS[0], t = o.t || 0, k = R / PR;
  const wob = o.wob ?? Math.sin(t * 9) * 1.2 * k;
  const a0 = c.globalAlpha, alpha = o.alpha ?? 1;
  c.save();
  c.globalAlpha = a0 * alpha;
  creaturePath(c, x, y, R, wob);
  c.fillStyle = o.tint || (sk.body === 'rainbow' ? `hsl(${(t * 70) % 360} 62% 36%)` : sk.body);
  c.fill();
  if (sk.rim && !o.tint) { c.strokeStyle = sk.rim; c.lineWidth = Math.max(1, 1.3 * k); c.stroke(); }
  if (sk.fx === 'stars' && !o.tint) {
    c.save(); c.clip();
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + 0.3, rr = ((i % 3) + 0.6) * R * 0.3, tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7);
      c.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * tw})`;
      c.beginPath(); c.arc(x + Math.cos(a) * rr, y + 1.5 * k + Math.sin(a) * rr * 0.7, (0.6 + tw * 0.5) * k, 0, TAU); c.fill();
    }
    c.restore();
  }
  if (sk.fx === 'shine' && !o.tint) {
    c.save(); c.clip();
    const sx = x - R * 1.6 + ((t * 0.5) % 1.6) * R * 2.4;
    const g = c.createLinearGradient(sx - R * 0.5, 0, sx + R * 0.5, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,250,220,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(x - R * 2, y - R * 2, R * 4, R * 4);
    c.restore();
  }
  c.globalAlpha = a0 * Math.max(alpha, o.eyeAlpha ?? 0);
  c.fillStyle = sk.eye; c.strokeStyle = sk.eye; c.lineWidth = 1.6 * k; c.lineCap = 'round';
  const ex = R * 0.39, er = R * 0.22;
  for (const s of [-1, 1]) {
    if (o.eyes === 'burn') { c.beginPath(); c.moveTo(x + s * ex - er, y - R * 0.33); c.lineTo(x + s * ex + er, y - R * 0.22); c.stroke(); }
    else if (o.eyes === 'dizzy') { c.beginPath(); c.arc(x + s * ex, y - R * 0.22, er * 1.2, t * 8, t * 8 + 4.5); c.stroke(); }
    else if (o.eyes === 'happy') { c.beginPath(); c.arc(x + s * ex, y - R * 0.12, er * 1.1, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
    else { c.beginPath(); c.arc(x + s * ex, y - R * 0.22, er, 0, TAU); c.fill(); }
  }
  if (o.hat && o.hat !== 'none') {
    c.globalAlpha = a0 * Math.max(alpha, 0.6);
    drawHat(c, o.hat, x, y - R - 1.4 * k + wob * 0.3, k, t);
  }
  c.restore();
}

// Hüte sind für eine Figur mit Radius 9 gezeichnet; (0, 0) ist die Oberkante des Kopfes.
function drawHat(c, id, x, y, k, t) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.lineJoin = 'round'; c.lineCap = 'round';
  switch (id) {
    case 'zylinder':
      c.fillStyle = '#1E222C'; c.strokeStyle = '#5A6178'; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(0, 0, 9, 2.2, 0, 0, TAU); c.fill(); c.stroke();
      c.fillRect(-5.5, -11, 11, 11); c.strokeRect(-5.5, -11, 11, 11);
      c.fillStyle = '#C3402C'; c.fillRect(-5.5, -3.4, 11, 2.2);
      break;
    case 'party':
      c.fillStyle = '#E0457B'; c.beginPath(); c.moveTo(-6, 0.5); c.lineTo(0, -15); c.lineTo(6, 0.5); c.closePath(); c.fill();
      c.save(); c.clip(); c.strokeStyle = '#F4CF63'; c.lineWidth = 1.8;
      for (let i = -3; i < 3; i++) { c.beginPath(); c.moveTo(-8, -1 + i * 5); c.lineTo(8, -5 + i * 5); c.stroke(); }
      c.restore();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -15, 2.3, 0, TAU); c.fill();
      break;
    case 'bommel':
      c.fillStyle = '#2B8FD6'; c.beginPath(); c.ellipse(0, -1, 7.8, 8, 0, Math.PI, 0); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-7, -5); c.lineTo(7, -5); c.stroke();
      c.fillStyle = '#1B6BA8'; c.fillRect(-8.6, -2.6, 17.2, 4);
      c.fillStyle = '#F2F4F8'; c.beginPath(); c.arc(0, -9.6, 3, 0, TAU); c.fill();
      break;
    case 'blume':
      c.translate(4.5, -1.5);
      c.fillStyle = '#5E8C3A'; c.beginPath(); c.ellipse(-3.5, 2, 2.8, 1.2, -0.5, 0, TAU); c.fill();
      c.fillStyle = '#FFFFFF'; for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3; c.beginPath(); c.arc(Math.cos(a) * 2.7, Math.sin(a) * 2.7, 2.1, 0, TAU); c.fill(); }
      c.fillStyle = '#F4CF63'; c.beginPath(); c.arc(0, 0, 1.9, 0, TAU); c.fill();
      break;
    case 'pirat':
      c.fillStyle = '#16181F'; c.strokeStyle = '#F4CF63'; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-11, 0.5); c.quadraticCurveTo(-7, -3, -5, -9); c.quadraticCurveTo(0, -12.5, 5, -9); c.quadraticCurveTo(7, -3, 11, 0.5); c.quadraticCurveTo(0, -2.5, -11, 0.5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#F2F4F8'; c.beginPath(); c.arc(0, -5.8, 1.9, 0, TAU); c.fill(); c.fillRect(-1.1, -4.6, 2.2, 1.3);
      c.strokeStyle = '#F2F4F8'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-2.8, -2.2); c.lineTo(2.8, -3.8); c.moveTo(-2.8, -3.8); c.lineTo(2.8, -2.2); c.stroke();
      break;
    case 'propeller': {
      c.fillStyle = '#F4CF63'; c.beginPath(); c.ellipse(0, 0, 7.5, 6.5, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#D6304F'; c.beginPath(); c.moveTo(0, 0); c.ellipse(0, 0, 7.5, 6.5, 0, Math.PI * 1.36, Math.PI * 1.64); c.closePath(); c.fill();
      c.fillStyle = '#2B8FD6'; c.fillRect(-8, -1.2, 16, 2);
      c.strokeStyle = '#5B6376'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(0, -6.5); c.lineTo(0, -9.5); c.stroke();
      const s = Math.cos(t * 24);
      c.fillStyle = '#2B8FD6'; c.beginPath(); c.ellipse(0, -9.8, 8.5 * Math.abs(s) + 0.8, 1.3, 0, 0, TAU); c.fill();
      c.fillStyle = '#D6304F'; c.beginPath(); c.arc(0, -9.8, 1.2, 0, TAU); c.fill();
      break;
    }
    case 'zauberer':
      c.fillStyle = '#4B3AA8';
      c.beginPath(); c.moveTo(-6.5, 0); c.lineTo(-1.5, -12); c.quadraticCurveTo(1.5, -18, 8, -16.5); c.quadraticCurveTo(2.5, -13, 6.5, 0); c.closePath(); c.fill();
      c.beginPath(); c.ellipse(0, 0.3, 10, 2.4, 0, 0, TAU); c.fill();
      c.fillStyle = '#F4CF63'; starPath(c, -0.5, -6, 2.2, 0.9, 5); c.fill(); starPath(c, 3, -1.8, 1.4, 0.6, 5); c.fill();
      break;
    case 'diadem':
      c.strokeStyle = '#8FC7EE'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 7, 9, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
      c.fillStyle = '#E8F4FF'; c.strokeStyle = '#2F7FBF'; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(0, -8.5); c.lineTo(3.2, -4.5); c.lineTo(0, -1); c.lineTo(-3.2, -4.5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#C3402C'; c.beginPath(); c.arc(0, -4.5, 1, 0, TAU); c.fill();
      break;
    case 'krone':
      c.fillStyle = COL.gold; c.strokeStyle = '#8A5A00'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(-6, 0.5); c.lineTo(-6.8, -7.5); c.lineTo(-3, -3.8); c.lineTo(0, -9.5); c.lineTo(3, -3.8); c.lineTo(6.8, -7.5); c.lineTo(6, 0.5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#D6304F'; c.beginPath(); c.arc(0, -2, 1.3, 0, TAU); c.fill();
      c.fillStyle = COL.dew; c.beginPath(); c.arc(-3.8, -1.6, 0.9, 0, TAU); c.arc(3.8, -1.6, 0.9, 0, TAU); c.fill();
      break;
    case 'hoerner':
      c.strokeStyle = '#F2E6D8'; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(-5, 1.5); c.quadraticCurveTo(-11.5, -0.5, -10.5, -8.5); c.moveTo(5, 1.5); c.quadraticCurveTo(11.5, -0.5, 10.5, -8.5); c.stroke();
      break;
    case 'heiligenschein': {
      const bob = Math.sin(t * 3) * 0.8;
      c.strokeStyle = 'rgba(244,207,99,.35)'; c.lineWidth = 3.6; c.beginPath(); c.ellipse(0, -6 + bob, 7, 2.1, 0, 0, TAU); c.stroke();
      c.strokeStyle = '#F4CF63'; c.lineWidth = 1.4; c.stroke();
      break;
    }
    case 'schlafmuetze':
      c.fillStyle = '#3AA5E0';
      c.beginPath(); c.moveTo(-7.8, 0); c.quadraticCurveTo(-5, -11, 6, -12); c.quadraticCurveTo(12.5, -11.5, 12, -4); c.quadraticCurveTo(7.5, -9, 7.8, 0); c.closePath(); c.fill();
      c.save(); c.clip(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-9 + i * 5, 1); c.lineTo(-3 + i * 5, -14); c.stroke(); }
      c.restore();
      c.fillStyle = '#F2F4F8'; c.fillRect(-8.2, -2, 16.4, 3.2);
      c.beginPath(); c.arc(12, -3.3, 2.3, 0, TAU); c.fill();
      break;
    case 'sonnenkrone':
      c.fillStyle = COL.gold; c.strokeStyle = '#8A5A00'; c.lineWidth = 0.8;
      c.fillRect(-6, -2.6, 12, 3.2); c.strokeRect(-6, -2.6, 12, 3.2);
      c.save(); c.translate(0, -8); c.rotate(t * 1.2); sunShape(c, 0, 0, 3.2); c.restore();
      break;
  }
  c.restore();
}

// Kleiner Innenhof mit Säule, Schatten und Figur: für Hauptmenü, Garderobe und Vorschau
function drawYard(c, w, h, skin, hat, t) {
  c.save();
  c.fillStyle = COL.lit; c.fillRect(0, 0, w, h);
  const cell = w / 7;
  c.strokeStyle = COL.tile; c.lineWidth = 1; c.beginPath();
  for (let i = cell; i < w; i += cell) { c.moveTo(Math.round(i) + .5, 0); c.lineTo(Math.round(i) + .5, h); }
  for (let i = cell; i < h; i += cell) { c.moveTo(0, Math.round(i) + .5); c.lineTo(w, Math.round(i) + .5); }
  c.stroke();
  const px = w * 0.14, py = h * 0.1, pw = w * 0.2, ph = w * 0.2;
  const sway = Math.sin(t * 0.4) * 0.12, vx = Math.cos(0.72 + sway) * w * 0.62, vy = Math.sin(0.72 + sway) * w * 0.62;
  const corners = [[px, py], [px + pw, py], [px + pw, py + ph], [px, py + ph]];
  const hl = hull(corners.concat(corners.map(q => [q[0] + vx, q[1] + vy])));
  c.fillStyle = COL.shade; c.beginPath(); c.moveTo(hl[0][0], hl[0][1]); for (let i = 1; i < hl.length; i++) c.lineTo(hl[i][0], hl[i][1]); c.closePath(); c.fill();
  c.save(); c.clip(); c.strokeStyle = COL.shadeTile; c.beginPath();
  for (let i = cell; i < w; i += cell) { c.moveTo(Math.round(i) + .5, 0); c.lineTo(Math.round(i) + .5, h); }
  for (let i = cell; i < h; i += cell) { c.moveTo(0, Math.round(i) + .5); c.lineTo(w, Math.round(i) + .5); }
  c.stroke(); c.restore();
  c.fillStyle = COL.top; c.fillRect(px, py, pw, ph);
  c.strokeStyle = COL.edge; c.lineWidth = Math.max(2, w / 110); c.strokeRect(px + w / 110 + 1, py + w / 110 + 1, pw - 2 * (w / 110 + 1), ph - 2 * (w / 110 + 1));
  c.save(); c.translate(w * 0.9, h * 0.1); c.rotate(t * 0.5); sunShape(c, 0, 0, w * 0.035); c.restore();
  const R = Math.min(w, h) * 0.17;
  drawCreature(c, w * 0.6, h * 0.6 + Math.sin(t * 2.2) * R * 0.06, R, { skin, hat, t, wob: Math.sin(t * 3) * R * 0.06, eyes: Math.sin(t * 0.9) > 0.97 ? 'happy' : 'open' });
  c.restore();
}
function hull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// Canvas in CSS-Größe mit scharfer Auflösung vorbereiten
function sizeCanvas(c, cssW, cssH) {
  const d = dpr(), w = Math.round(cssW * d), h = Math.round(cssH * d);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const cc = c.getContext('2d'); cc.setTransform(d, 0, 0, d, 0, 0);
  return cc;
}
function iconCanvas(k, size, el) {
  const c = el || document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  const cc = sizeCanvas(c, size, size);
  cc.clearRect(0, 0, size, size);
  cc.translate(size / 2, size / 2); cc.scale(size / 28, size / 28);
  icon(cc, k);
  return c;
}
function creatureCanvas(skin, hat, size, el, t) {
  const c = el || document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  const cc = sizeCanvas(c, size, size);
  cc.clearRect(0, 0, size, size);
  const R = size * 0.26;
  drawCreature(cc, size / 2, size * 0.6, R, { skin, hat, t: t ?? 1.1, wob: 0 });
  return c;
}
