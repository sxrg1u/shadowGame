'use strict';
// Profil, Schwierigkeit, Regeln, Upgrades, Erfolge

// ---------- Profil (localStorage) ----------
const STORE = 'schattenfaenger-profil-v2';
const DEF_SETTINGS = { lang: 'en', music: 0.55, sfx: 0.8, muted: false, shake: true, flashes: true, theme: 'system', name: '', diff: 'normal' };
function freshProfile() {
  return {
    v: 2, wallet: 0, settings: { ...DEF_SETTINGS },
    best: { campaign: 0, endless: 0, daily: 0 }, top: { campaign: [], endless: [] },
    stats: { runs: 0, time: 0, points: 0, bosses: 0, prisma: 0, queen: 0, bull: 0, core: 0, bugsDashed: 0, bugs: 0, dews: 0,
             dashes: 0, hits: 0, items: 0, traps: 0, missiles: 0, upgrades: 0, maxLevel: 0, endlessLevel: 0, maxCombo: 0,
             wins: 0, hardWins: 0, duels: 0, duelWins: 0, dailyDone: 0, cleanBoss: 0, longest: 0, bestScore: 0, revives: 0,
             close: 0, spearKill: 0, maxUpgradesRun: 0 },
    ach: {}, owned: { skin: ['schatten'], hat: ['none'] }, equip: { skin: 'schatten', hat: 'none' },
    seen: {}, daily: {}, streak: { last: '', n: 0, best: 0 },
  };
}
function loadProfile() {
  const f = freshProfile();
  let p = null;
  try { const raw = localStorage.getItem(STORE); if (raw) p = JSON.parse(raw); } catch (e) {}
  if (!p || typeof p !== 'object') {
    p = f;
    try { const old = parseInt(localStorage.getItem('schattenfaenger-best') || '0', 10) || 0; p.best.endless = old; } catch (e) {}
    return p;
  }
  for (const k in f) {
    if (p[k] === undefined) p[k] = f[k];
    else if (f[k] && typeof f[k] === 'object' && !Array.isArray(f[k])) for (const j in f[k]) if (p[k][j] === undefined) p[k][j] = f[k][j];
  }
  return p;
}
let P = loadProfile();
if (!P.settings.name) P.settings.name = 'Shady' + (10 + Math.floor(Math.random() * 90));
function save() { try { localStorage.setItem(STORE, JSON.stringify(P)); } catch (e) {} }
let achDirty = false;
function stat(k, n = 1) { P.stats[k] = (P.stats[k] || 0) + n; achDirty = true; }
function statMax(k, v) { if (v > (P.stats[k] || 0)) { P.stats[k] = v; achDirty = true; } }

function dayKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }

// ---------- Schwierigkeit ----------
const DIFF = {
  easy: { name: 'Leicht', burn: 0.75, dmg: 0.7, pts: 0.75, note: 'Sonne und Treffer tun weniger weh. 75 % Punkte.' },
  normal: { name: 'Normal', burn: 1, dmg: 1, pts: 1, note: 'So ist das Spiel gedacht.' },
  hard: { name: 'Schwer', burn: 1.25, dmg: 1.3, pts: 1.3, note: 'Mehr Hitze, härtere Treffer. 130 % Punkte.' },
};

// ---------- Tägliche Herausforderung ----------
const RULES = [
  { id: 'traps', name: 'Nur Fallen', icon: 'shroom', desc: 'Es tauchen nur Fallen auf. Dafür zählt Tau dreifach.' },
  { id: 'twosun', name: 'Doppelte Sonne', icon: 'sun2', desc: 'Zwei Sonnen, die ganze Zeit. Wo nur ein Schatten liegt, brennt es halb so stark.' },
  { id: 'bugs', name: 'Käferplage', icon: 'swarm', desc: 'Dreimal so viele Käfer. Weggedashte Käfer geben dreifach Punkte.' },
  { id: 'chaos', name: 'Chaos pur', icon: 'quake', desc: 'Das Chaos-Rad dreht sich alle 3 Sekunden.' },
  { id: 'tiny', name: 'Winzlinge', icon: 'shrink', desc: 'Du bist die ganze Zeit winzig, dafür ist alles andere schneller.' },
  { id: 'rush', name: 'Bossrausch', icon: 'prisma', desc: 'Stufen dauern nur 6 Sekunden, Bosse haben ein Leben weniger.' },
  { id: 'mirror', name: 'Spiegelwelt', icon: 'vortex', desc: 'Deine Steuerung ist die ganze Zeit verdreht.' },
  { id: 'glass', name: 'Glaskanone', icon: 'glass', desc: 'Keine Herzen und höchstens 60 Kraft. Dafür doppelte Punkte.' },
  { id: 'dashfever', name: 'Dash-Fieber', icon: 'dashy', desc: 'Der Dash lädt fast sofort, aber die Sonne brennt 30 % stärker.' },
  { id: 'summer', name: 'Hochsommer', icon: 'noon', desc: 'Schatten sind 35 % kürzer, Tau gibt doppelt so viel Kraft.' },
  { id: 'clouds', name: 'Wolkentag', icon: 'cloud', desc: 'Ständig ziehen Wolken vorbei, aber die Sonne rast.' },
  { id: 'night', name: 'Mondnacht', icon: 'lens', desc: 'Schatten sind 40 % länger. Das Brennglas jagt dich von Anfang an, doppelt so schnell.' },
];
const RULE_BY = Object.fromEntries(RULES.map(r => [r.id, r]));
const DAILY_GOAL = 6;   // Stufe, die man erreichen muss
const DAILY_REWARD = 1500;
function dailyInfo(key = dayKey()) {
  const rule = RULES[hashStr('regel-' + key) % RULES.length];
  return { key, rule, seed: hashStr('schattenfaenger-' + key) };
}

// ---------- Upgrades (Karten nach jedem Boss) ----------
const UPGRADES = [
  { id: 'dashcd', name: 'Schnelldash', icon: 'dashy', max: 3, rar: 'c', desc: 'Dein Dash lädt 22 % schneller.' },
  { id: 'trail', name: 'Schattenspur', icon: 'bomb', max: 1, rar: 'r', desc: 'Dein Dash hinterlässt eine Spur aus Schatten, die 3 s hält.' },
  { id: 'linger', name: 'Zäher Schatten', icon: 'cloud', max: 2, rar: 'c', desc: 'Schattenbombe, Spur und Schirm halten 50 % länger.' },
  { id: 'longshadow', name: 'Lange Schatten', icon: 'eclipse', max: 3, rar: 'c', desc: 'Säulen werfen 20 % längere Schatten.' },
  { id: 'heart', name: 'Extraherz', icon: 'heart', max: 3, rar: 'r', desc: '+1 Herz sofort und ein Herzplatz mehr.' },
  { id: 'armor', name: 'Dicke Haut', icon: 'spikes', max: 3, rar: 'c', desc: 'Treffer kosten 20 % weniger Kraft.' },
  { id: 'cream', name: 'Sonnencreme', icon: 'umbrella', max: 3, rar: 'c', desc: 'Sonnenlicht brennt 15 % schwächer.' },
  { id: 'feet', name: 'Flinke Füße', icon: 'boots', max: 3, rar: 'c', desc: 'Du läufst 12 % schneller.' },
  { id: 'regen', name: 'Schattenbad', icon: 'crystal', max: 3, rar: 'c', desc: 'Im Schatten lädt deine Kraft 50 % schneller.' },
  { id: 'dewmag', name: 'Taumagnet', icon: 'magnet', max: 1, rar: 'c', desc: 'Tau in deiner Nähe fliegt von selbst zu dir.' },
  { id: 'heavy', name: 'Wuchtdash', icon: 'spear', max: 2, rar: 'r', desc: 'Dash-Treffer machen 1 Schaden mehr am Boss.' },
  { id: 'twin', name: 'Doppeldash', icon: 'twin', max: 1, rar: 'e', desc: 'Zwei Dash-Ladungen statt einer.' },
  { id: 'longdash', name: 'Weitsprung', icon: 'wind', max: 2, rar: 'c', desc: 'Dein Dash fliegt 30 % weiter.' },
  { id: 'blade', name: 'Schattenklinge', icon: 'saw', max: 1, rar: 'r', desc: 'Dein Dash zerschneidet Lichtkugeln und Sägeblätter.' },
  { id: 'shieldgen', name: 'Blasenquelle', icon: 'bubble', max: 1, rar: 'e', desc: 'Alle 20 s bekommst du ein Blasenschild, wenn du keins hast.' },
  { id: 'combo', name: 'Kombomeister', icon: 'star', max: 1, rar: 'r', desc: 'Die Tau-Kombo geht bis ×8 und hält länger.' },
  { id: 'greed', name: 'Goldgier', icon: 'gold', max: 3, rar: 'c', desc: '+25 % auf alle Punkte.' },
  { id: 'lucky', name: 'Glückspilz', icon: 'clover', max: 2, rar: 'c', desc: 'Das Chaos-Rad bringt öfter etwas Gutes.' },
  { id: 'phoenix', name: 'Phönix', icon: 'flame', max: 1, rar: 'e', desc: 'Rettet dich ein Herz, bekommst du volle Kraft und alles friert 2 s ein.' },
  { id: 'architect', name: 'Baumeister', icon: 'seed', max: 1, rar: 'r', desc: 'Sofort 2 neue Säulen, und keine Säule stürzt mehr ein.' },
];
const UP_BY = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
const RARITY = { c: ['Gewöhnlich', 10], r: ['Selten', 5], e: ['Episch', 2.5] };

// ---------- Erfolge ----------
const ACH = [
  { id: 'first', name: 'Erster Schritt', icon: 'dew', desc: 'Spiel deine erste Runde.', goal: 1, val: s => s.runs },
  { id: 'bug10', name: 'Käferschreck', icon: 'bug', desc: '10 Käfer weggedasht.', goal: 10, val: s => s.bugsDashed },
  { id: 'bug100', name: 'Kammerjäger', icon: 'swarm', desc: '100 Käfer weggedasht.', goal: 100, val: s => s.bugsDashed },
  { id: 'clean', name: 'Unberührt', icon: 'bubble', desc: 'Besiege einen Boss, ohne getroffen zu werden.', goal: 1, val: s => s.cleanBoss },
  { id: 'prisma', name: 'Prismabrecher', icon: 'prisma', desc: 'Besiege Prisma.', goal: 1, val: s => s.prisma },
  { id: 'queen', name: 'Königsmord', icon: 'queen', desc: 'Besiege die Käferkönigin.', goal: 1, val: s => s.queen },
  { id: 'bull', name: 'Stierkämpfer', icon: 'bull', desc: 'Besiege den Sonnenstier.', goal: 1, val: s => s.bull },
  { id: 'core', name: 'Sonnenfinsternis', icon: 'core', desc: 'Besiege den Sonnenkern.', goal: 1, val: s => s.core },
  { id: 'campaign', name: 'Held des Innenhofs', icon: 'trophy', desc: 'Gewinne die Kampagne.', goal: 1, val: s => s.wins },
  { id: 'hard', name: 'Unverwüstlich', icon: 'spikes', desc: 'Gewinne die Kampagne auf Schwer.', goal: 1, val: s => s.hardWins },
  { id: 'boss25', name: 'Bossjäger', icon: 'spear', desc: 'Besiege insgesamt 25 Bosse.', goal: 25, val: s => s.bosses },
  { id: 'spear', name: 'Speerwurf', icon: 'target', desc: 'Erledige einen Boss mit dem Schattenspeer.', goal: 1, val: s => s.spearKill },
  { id: 'combo', name: 'Kombokönig', icon: 'star', desc: 'Schaff eine Tau-Kombo von ×5.', goal: 5, val: s => s.maxCombo },
  { id: 'dew100', name: 'Taufänger', icon: 'rain', desc: 'Sammle 100 Tautropfen.', goal: 100, val: s => s.dews },
  { id: 'survive', name: 'Zäher Schatten', icon: 'hourglass', desc: 'Überlebe 3 Minuten in einer Runde.', goal: 180, val: s => s.longest },
  { id: 'lvl15', name: 'Marathon', icon: 'boots', desc: 'Erreiche Stufe 15 im Endlosmodus.', goal: 15, val: s => s.endlessLevel },
  { id: 'score10k', name: 'Punktejäger', icon: 'gold', desc: '10 000 Punkte in einer Runde.', goal: 10000, val: s => s.bestScore },
  { id: 'score30k', name: 'Highscore-Held', icon: 'lootrain', desc: '30 000 Punkte in einer Runde.', goal: 30000, val: s => s.bestScore },
  { id: 'rich', name: 'Schatzkammer', icon: 'loot', desc: 'Sammle insgesamt 100 000 Punkte.', goal: 100000, val: s => s.points },
  { id: 'daily1', name: 'Tagwerk', icon: 'calendar', desc: 'Schaffe eine tägliche Herausforderung.', goal: 1, val: s => s.dailyDone },
  { id: 'streak3', name: 'Dranbleiben', icon: 'sun2', desc: 'Schaffe die Herausforderung 3 Tage in Folge.', goal: 3, val: () => P.streak.best },
  { id: 'missile10', name: 'Raketenabwehr', icon: 'missile', desc: 'Zerstöre 10 Suchraketen.', goal: 10, val: s => s.missiles },
  { id: 'close', name: 'Haarscharf', icon: 'crystal', desc: 'Fall unter 3 Kraft und komm wieder über 50.', goal: 1, val: s => s.close },
  { id: 'cards10', name: 'Kartenspieler', icon: 'clover', desc: 'Wähle insgesamt 10 Upgrades.', goal: 10, val: s => s.upgrades },
  { id: 'build5', name: 'Vollausgestattet', icon: 'twin', desc: 'Sammle 5 Upgrades in einer Runde.', goal: 5, val: s => s.maxUpgradesRun },
  { id: 'fashion', name: 'Modebewusst', icon: 'hat', desc: 'Besitze 6 Skins oder Hüte.', goal: 6, val: () => ownedCount() },
  { id: 'duel', name: 'Duellant', icon: 'decoy', desc: 'Gewinne ein Online-Duell.', goal: 1, val: s => s.duelWins },
  { id: 'traps', name: 'Pechvogel', icon: 'shroom', desc: 'Tappe in 20 Fallen.', goal: 20, val: s => s.traps },
];
const ACH_BY = Object.fromEntries(ACH.map(a => [a.id, a]));

function isOwned(kind, it) {
  if (P.owned[kind].includes(it.id)) return true;
  return !!(it.req && (P.stats[it.req.stat] || 0) >= it.req.n);
}
function ownedCount() { return SKINS.filter(s => isOwned('skin', s)).length + HATS.filter(h => isOwned('hat', h)).length - 2; }

