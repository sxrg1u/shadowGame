'use strict';
// Anzeige, Bildschirme, Runden, Online-Duell, Eingabe, Start

// ---------- HUD ----------
const hc = {};
function setText(id, v) { if (hc[id] !== v) { hc[id] = v; $(id).textContent = v; } }
function hud() {
  if (!S) return;
  setText('score', fmt(S.score));
  setText('level', String(S.level + 1));
  setText('best', S.bestLabel || '–');
  const mh = maxHearts(), hk = S.hearts + '/' + mh;
  if (hc.hearts !== hk) {
    hc.hearts = hk;
    $('hearts').innerHTML = mh ? Array.from({ length: mh }, (_, i) =>
      `<svg viewBox="0 0 24 24" fill="currentColor" style="color:${i < S.hearts ? '#D6304F' : 'var(--line)'}"><use href="#i-heart"/></svg>`).join('') : '<b>–</b>';
  }
  const e = Math.round(S.energy * 10) / 10;
  if (hc.energy !== e) { hc.energy = e; const el = $('energy'); el.style.width = e + '%'; el.classList.toggle('low', e < 30); }
}
function updateOppBar() {
  const o = Net.opp;
  if (!o) return;
  setText('oppName', o.name);
  setText('oppScore', fmt(o.score || 0));
  const e = o.alive ? Math.max(0, Math.min(100, o.energy ?? 100)) : 0;
  if (hc.oppE !== e) { hc.oppE = e; $('oppEnergy').style.width = e + '%'; }
  setText('oppState', o.left ? tr('getrennt', 'disconnected') : o.finished ? tr('gewonnen', 'won') : o.alive ? tr('Stufe ', 'Level ') + ((o.level || 0) + 1) : tr('verdampft', 'evaporated'));
}
function updateMuteBtn() {
  const m = P.settings.muted;
  $('muteBtn').innerHTML = `<svg><use href="#i-${m ? 'mute' : 'sound'}"/></svg>`;
  $('muteBtn').setAttribute('aria-label', m ? tr('Ton an', 'Sound on') : tr('Ton aus', 'Sound off'));
}
function toggleMute() { P.settings.muted = !P.settings.muted; Sound.init(); Sound.volumes(); updateMuteBtn(); save(); if (topScr() === 'scrSettings') RENDER.scrSettings(); }
function applyTheme() {
  const t = P.settings.theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t;
}

// ---------- Hinweise ----------
function toast(head, text, iconKey, canvasEl) {
  const box = $('toasts'), el = document.createElement('div');
  el.className = 'toast';
  el.appendChild(canvasEl || iconCanvas(iconKey, 38));
  const d = document.createElement('div');
  const h = document.createElement('span'); h.textContent = head;
  const b = document.createElement('b'); b.textContent = text;
  d.append(h, b); el.appendChild(d); box.appendChild(el);
  const live = [...box.children].filter(c => !c.classList.contains('out'));
  while (live.length > 3) dismissToast(live.shift());
  setTimeout(() => dismissToast(el), 3300);
}
// Ein Hinweis geht mit eigener Animation und gibt seinen Platz sofort frei, ein neuer muss nicht warten.
function dismissToast(el) {
  if (!el.isConnected || el.classList.contains('out')) return;
  el.classList.add('out');
  el.addEventListener('animationend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 500);
}
// Zustandsmeldungen des Spiels fuer Screenreader (Parade, Schild, Upgrade, Boss ...), gleiche Meldung nicht doppelt
let srLast = '', srAt = 0, srT = 0;
function announce(text) {
  const el = $('srLive'), now = performance.now();
  if (!el || !text || (text === srLast && now - srAt < 1500)) return;
  srLast = text; srAt = now;
  clearTimeout(srT); el.textContent = '';
  srT = setTimeout(() => { el.textContent = text; }, 50);
}
function checkAch() {
  achDirty = false;
  for (const a of ACH) {
    if (P.ach[a.id]) continue;
    if ((a.val(P.stats) || 0) >= a.goal) {
      P.ach[a.id] = Date.now();
      if (S && S.run) S.run.newAch.push(a.id);
      toast(tr('Erfolg freigeschaltet', 'Achievement unlocked'), a.name, a.icon); Sound.sfx('ach');
    }
  }
  for (const [kind, list] of [['skin', SKINS], ['hat', HATS]]) for (const it of list) {
    const key = kind + ':' + it.id;
    if (!it.req || P.seen[key] || (P.stats[it.req.stat] || 0) < it.req.n) continue;
    P.seen[key] = 1;
    if (S && S.run) S.run.newItems.push([kind, it.id]);
    toast(kind === 'skin' ? tr('Neuer Skin', 'New skin') : tr('Neuer Hut', 'New hat'), it.name, null, creatureCanvas(kind === 'skin' ? it.id : P.equip.skin, kind === 'hat' ? it.id : 'none', 38));
    Sound.sfx('ach');
  }
}

// ---------- Bildschirme ----------
const screens = [...document.querySelectorAll('.screen')];
let stack = [];
const topScr = () => stack[stack.length - 1];
const RENDER = {};
// Abbild eines Bildschirms, der gerade verschwindet: blendet aus, waehrend der naechste schon bedienbar ist
function leave(el) {
  const c = el.cloneNode(true);
  c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  c.hidden = false; c.inert = true; c.setAttribute('aria-hidden', 'true'); c.classList.add('leaving');
  const from = el.querySelectorAll('canvas'), to = c.querySelectorAll('canvas');
  from.forEach((f, i) => { const d = to[i]; if (!d || !f.width) return; d.width = f.width; d.height = f.height; d.getContext('2d').drawImage(f, 0, 0); });
  document.body.appendChild(c);
  const done = () => c.remove();
  const panel = c.querySelector('.panel');
  if (panel) panel.addEventListener('animationend', done, { once: true });
  setTimeout(done, 400);
}
function show(noFocus) {
  const t = topScr();
  for (const s of screens) {
    const hide = s.id !== t;
    if (hide && !s.hidden) leave(s);
    s.hidden = hide;
  }
  if (t && RENDER[t]) RENDER[t]();
  document.body.classList.toggle('menu', !S || S.mode === 'ready');
  keys.clear(); if (S) S.target = null;
  if (t && !noFocus) {
    const el = $(t).querySelector('[data-focus]') || $(t).querySelector('.card, .btn.primary:not([hidden]):not(:disabled), .btn:not([hidden]), button');
    if (el) el.focus({ preventScroll: true });
  }
}
function open(id) { if (topScr() !== id) stack.push(id); show(); }
function back() { stack.pop(); show(); }
function closeAll() { stack = []; show(true); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
function resetTo(id) { stack = [id]; show(); }

const MODE_NAME = { get campaign() { return tr('Kampagne', 'Campaign'); }, get endless() { return tr('Endlos', 'Endless'); }, get daily() { return tr('Tägliche Herausforderung', 'Daily challenge'); },
                    get practice() { return tr('Boss üben', 'Practice boss'); }, get duel() { return tr('Online-Duell', 'Online duel'); },
                    get weekly() { return tr('Wochenherausforderung', 'Weekly challenge'); }, get tutorial() { return 'Tutorial'; } };
const rulesLabel = rules => rules.map(r => (typeof r === 'string' ? RULE_BY[r] : r).name).join(' + ');
function modeName() {
  const m = S.cfg.mode;
  if (m === 'daily') return tr('Täglich · ', 'Daily · ') + rulesLabel([...S.rules]) + ' · ' + mapName(S.map);
  if (m === 'weekly') return tr('Woche · ', 'Week · ') + rulesLabel([...S.rules]) + ' · ' + mapName(S.map);
  if (m === 'tutorial') return 'Tutorial';
  if (m === 'duel') return tr('Duell gegen ', 'Duel against ') + (Net.opp ? Net.opp.name : '…');
  return MODE_NAME[m] + (m === 'campaign' || m === 'endless' || m === 'practice' ? ' · ' + S.diff.name + ' · ' + mapName(S.map) : '');
}
function fmtTime(sec) {
  sec = Math.floor(sec || 0);
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  return h ? h + ' h ' + (m % 60) + ' min' : m + ':' + String(sec % 60).padStart(2, '0');
}
function streakNow() { const k = dayKey(); return P.streak.last === k || P.streak.last === shiftDay(k, -1) ? P.streak.n : 0; }

RENDER.scrMain = () => {
  $('walletMain').textContent = fmt(P.wallet);
  $('achCountMain').textContent = Object.keys(P.ach).length + ' / ' + ACH.length;
  const di = dailyInfo(), dd = P.daily[di.key] || {};
  $('dailyName').textContent = di.rule.name + ' · ' + mapName(di.map);
  $('dailyDescMain').textContent = di.rule.desc;
  const st = streakNow();
  $('dailyMetaMain').textContent = (dd.done ? tr('Heute geschafft', 'Done today') + (dd.best ? tr(' · Bestwert ', ' · Best ') + fmt(dd.best) : '') : tr('Ziel: Stufe ' + DAILY_GOAL + ' · Belohnung ' + fmt(DAILY_REWARD) + ' Punkte', 'Goal: level ' + DAILY_GOAL + ' · Reward ' + fmt(DAILY_REWARD) + ' points')) + (st ? tr(' · Serie: ' + st + (st === 1 ? ' Tag' : ' Tage'), ' · Streak: ' + st + (st === 1 ? ' day' : ' days')) : '');
  iconCanvas(di.rule.icon, 40, $('dailyIcon'));
  const wi = weeklyInfo(), wd = P.weekly[wi.key] || {};
  $('weeklyName').textContent = rulesLabel(wi.rules) + ' · ' + mapName(wi.map);
  $('weeklyDescMain').textContent = wi.rules.map(r => r.desc).join(' ');
  $('weeklyMetaMain').textContent = weeklyMeta(wi, wd);
  iconCanvas('trophy', 40, $('weeklyIcon'));
};
function weeklyMeta(wi, wd) {
  const left = weekEnds();
  const time = tr(' · noch ' + left + (left === 1 ? ' Tag' : ' Tage'), ' · ' + left + (left === 1 ? ' day' : ' days') + ' left');
  if (wd.done) return tr('Diese Woche geschafft', 'Done this week') + (wd.best ? tr(' · Bestwert ', ' · Best ') + fmt(wd.best) : '') + time;
  return tr('Ziel: Stufe ' + WEEKLY_GOAL + ' · ' + fmt(WEEKLY_REWARD) + ' Punkte', 'Goal: level ' + WEEKLY_GOAL + ' · ' + fmt(WEEKLY_REWARD) + ' points') +
    (P.stats.weeklyDone ? '' : tr(' + exklusiver Skin und Hut', ' + exclusive skin and hat')) + time;
}
// Kleines Vorschaubild einer Karte
function drawMapPreview(el, m, t) {
  const rc = el.getBoundingClientRect(), w = rc.width || 160, h = rc.height || 100, c = sizeCanvas(el, w, h), p = m.pal;
  c.fillStyle = m.dark ? p.shade : p.lit; c.fillRect(0, 0, w, h);
  const cell = w / 8;
  const grid = col => { c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); for (let x = cell; x < w; x += cell) { c.moveTo(x, 0); c.lineTo(x, h); } for (let y = cell; y < h; y += cell) { c.moveTo(0, y); c.lineTo(w, y); } c.stroke(); };
  grid(m.dark ? p.shadeTile : p.tile);
  const s = h * 0.34, px = w * 0.28, py = h * 0.28;
  const outline = m.round ? Array.from({ length: 14 }, (_, i) => [px + s / 2 + Math.cos(i * TAU / 14) * s / 2, py + s / 2 + Math.sin(i * TAU / 14) * s / 2])
                          : [[px, py], [px + s, py], [px + s, py + s], [px, py + s]];
  const poly = pts => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); c.closePath(); };
  if (m.dark) {
    const tx = w * 0.06, ty = h * 0.12, g = c.createRadialGradient(tx, ty, 2, tx, ty, w * 0.75);
    g.addColorStop(0, '#FFDC96'); g.addColorStop(0.7, p.lit); g.addColorStop(1, 'rgba(242,180,94,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const far = outline.map(([x, y]) => { const dx = x - tx, dy = y - ty, d = Math.hypot(dx, dy); return [x + dx / d * w, y + dy / d * w]; });
    c.fillStyle = p.shade; poly(hull(outline.concat(far))); c.fill();
    c.fillStyle = '#FFD37A'; c.beginPath(); c.arc(tx, ty, 3.5, 0, TAU); c.fill();
  } else {
    const vx = w * 0.42, vy = h * 0.42;
    c.fillStyle = p.shade; poly(hull(outline.concat(outline.map(([x, y]) => [x + vx, y + vy])))); c.fill();
  }
  c.fillStyle = p.top; poly(outline); c.fill();
  if (m.chimneys) { c.fillStyle = '#15100F'; c.fillRect(px + s * 0.25, py + s * 0.25, s * 0.5, s * 0.5); }
  if (m.wind) { c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i < 3; i++) { const y = h * (0.2 + i * 0.28); c.moveTo(w * 0.6, y); c.lineTo(w * 0.9, y); } c.stroke(); }
  drawCreature(c, w * 0.66, h * 0.66, h * 0.13, { skin: P.equip.skin, hat: P.equip.hat, t: t || 1, wob: 0 });
}
const selMap = () => { const m = MAP_BY[P.settings.map]; return m && mapUnlocked(m) ? m.id : 'yard'; };

RENDER.scrModes = () => {
  for (const b of $('diffSeg').children) b.setAttribute('aria-pressed', String(b.dataset.diff === P.settings.diff));
  $('diffNote').textContent = DIFF[P.settings.diff].note;
  $('metaCampaign').textContent = P.best.campaign ? tr('Rekord ', 'Best ') + fmt(P.best.campaign) + (P.stats.wins ? tr(' · ' + P.stats.wins + '× gewonnen', ' · won ' + P.stats.wins + '×') : '') : tr('Noch nicht gespielt', 'Not played yet');
  $('metaEndless').textContent = P.best.endless ? tr('Rekord ', 'Best ') + fmt(P.best.endless) + (P.stats.endlessLevel ? tr(' · bis Stufe ', ' · up to level ') + P.stats.endlessLevel : '') : tr('Noch nicht gespielt', 'Not played yet');
  const di = dailyInfo(), dd = P.daily[di.key] || {};
  $('dailyName2').textContent = tr('Täglich: ', 'Daily: ') + di.rule.name;
  const wi = weeklyInfo(), wd = P.weekly[wi.key] || {};
  $('weeklyName2').textContent = tr('Woche: ', 'Week: ') + rulesLabel(wi.rules);
  $('weeklyDesc2').textContent = tr('Zwei Regeln gleichzeitig auf ', 'Two rules at once on ') + mapName(wi.map) + '. ' + wi.rules.map(r => r.desc).join(' ');
  $('metaWeekly').textContent = weeklyMeta(wi, wd);
  iconCanvas('trophy', 36, $('weeklyIcon2'));
  const grid = $('mapGrid'); grid.innerHTML = '';
  for (const m of MAPS) {
    const ok = mapUnlocked(m), b = document.createElement('button');
    b.className = 'map-card' + (ok ? '' : ' locked'); b.dataset.map = m.id;
    b.setAttribute('aria-pressed', String(selMap() === m.id));
    const cvs = document.createElement('canvas'); cvs.setAttribute('aria-hidden', 'true');
    const nm = document.createElement('b'); nm.textContent = mapName(m);
    const st = document.createElement('span'); st.textContent = ok ? mapDesc(m) : mapLockText(m);
    b.append(cvs, nm, st); b.title = mapDesc(m);
    grid.appendChild(b);
    drawMapPreview(cvs, m);
  }
  $('dailyDesc2').textContent = di.rule.desc + tr(' Karte: ' + mapName(di.map) + '. Erreiche Stufe ' + DAILY_GOAL + '.', ' Map: ' + mapName(di.map) + '. Reach level ' + DAILY_GOAL + '.');
  $('metaDaily').textContent = dd.done ? tr('Heute geschafft', 'Done today') + (dd.best ? tr(' · Bestwert ', ' · Best ') + fmt(dd.best) : '') : dd.best ? tr('Heute bisher ', 'Today so far ') + fmt(dd.best) : tr('Belohnung ' + fmt(DAILY_REWARD) + ' Punkte', 'Reward ' + fmt(DAILY_REWARD) + ' points');
  iconCanvas(di.rule.icon, 36, $('dailyIcon2'));
  for (const c of document.querySelectorAll('.mode-card canvas[data-icon]')) iconCanvas(c.dataset.icon, 36, c);
  const coreOk = P.stats.core > 0 || P.stats.maxLevel >= 10;
  $('coreBtn').disabled = !coreOk;
  $('coreBtn').title = coreOk ? '' : tr('Erreich zuerst Stufe 10', 'Reach level 10 first');
  $('coreBtn').textContent = coreOk ? bossLabel('core') : bossLabel('core') + tr(' (ab Stufe 10)', ' (from level 10)');
  for (const b of document.querySelectorAll('#practice [data-boss]')) if (b.dataset.boss !== 'core') b.textContent = bossLabel(b.dataset.boss);
};

const wardLabel = (skin, hat, trail) => SKIN_BY[skin].name + (hat !== 'none' ? tr(' mit ', ' with ') + HAT_BY[hat].name : '') + (trail && trail !== 'none' ? ' · ' + TRAIL_BY[trail].name : '');
const eqLabel = () => wardLabel(P.equip.skin, P.equip.hat, P.equip.trail);
const WARD_LISTS = { skin: () => SKINS, hat: () => HATS, trail: () => TRAILS };
let wTab = 'skin', wConfirm = null, wPrev = { skin: P.equip.skin, hat: P.equip.hat, trail: P.equip.trail };
RENDER.scrWardrobe = () => {
  $('walletWard').textContent = fmt(P.wallet);
  for (const b of document.querySelectorAll('[data-wtab]')) b.setAttribute('aria-selected', String(b.dataset.wtab === wTab));
  wPrev = { skin: P.equip.skin, hat: P.equip.hat, trail: P.equip.trail };
  $('wardName').textContent = eqLabel();
  const focusId = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null;
  const grid = $('wardGrid'); grid.innerHTML = '';
  for (const it of WARD_LISTS[wTab]()) {
    const owned = isOwned(wTab, it), eq = P.equip[wTab] === it.id, conf = wConfirm === it.id;
    const skin = wTab === 'skin' ? it.id : P.equip.skin, hat = wTab === 'hat' ? it.id : P.equip.hat, trail = wTab === 'trail' ? it.id : P.equip.trail;
    const b = document.createElement('button');
    b.className = 'item' + (eq ? ' on' : '') + (owned ? '' : ' locked') + (conf ? ' confirm' : '');
    b.dataset.id = it.id;
    b.appendChild(creatureCanvas(skin, hat, 64, null, 1.1, wTab === 'trail' ? trail : null));
    const nm = document.createElement('b'); nm.textContent = it.name;
    const st = document.createElement('span');
    if (eq) st.textContent = tr('Angelegt', 'Equipped');
    else if (owned) st.textContent = tr('Anlegen', 'Equip');
    else if (it.cost) { st.textContent = conf ? tr('Tippen zum Kaufen', 'Tap to buy') : fmt(it.cost) + tr(' Punkte', ' points'); if (!conf) st.className = 'price'; }
    else st.textContent = it.req.text + ' · ' + Math.min(P.stats[it.req.stat] || 0, it.req.n) + '/' + it.req.n;
    b.append(nm, st);
    b.setAttribute('aria-label', it.name + ', ' + st.textContent);
    const prev = () => { wPrev = { skin, hat, trail }; $('wardName').textContent = wardLabel(skin, hat, trail); };
    const unprev = () => { wPrev = { skin: P.equip.skin, hat: P.equip.hat, trail: P.equip.trail }; $('wardName').textContent = eqLabel(); };
    b.addEventListener('pointerenter', prev); b.addEventListener('focus', prev);
    b.addEventListener('pointerleave', unprev); b.addEventListener('blur', unprev);
    b.addEventListener('click', () => wardClick(it, owned));
    grid.appendChild(b);
  }
  if (focusId) { const f = grid.querySelector(`[data-id="${focusId}"]`); if (f) f.focus({ preventScroll: true }); }
};
function wardClick(it, owned) {
  if (owned) { P.equip[wTab] = it.id; wConfirm = null; save(); Sound.sfx('pickup'); RENDER.scrWardrobe(); return; }
  if (!it.cost) { Sound.sfx('deny'); toast(tr('Noch gesperrt', 'Still locked'), it.req.text, 'target'); return; }
  if (P.wallet < it.cost) { Sound.sfx('deny'); toast(tr('Nicht genug Punkte', 'Not enough points'), tr('Dir fehlen noch ' + fmt(it.cost - P.wallet) + ' Punkte', 'You need ' + fmt(it.cost - P.wallet) + ' more points'), 'loot'); return; }
  if (wConfirm !== it.id) { wConfirm = it.id; RENDER.scrWardrobe(); return; }
  P.wallet -= it.cost; P.owned[wTab].push(it.id); P.equip[wTab] = it.id; wConfirm = null;
  save(); Sound.sfx('buy'); checkAch(); RENDER.scrWardrobe();
}

let aTab = 'ach';
RENDER.scrAch = () => {
  for (const b of document.querySelectorAll('[data-atab]')) b.setAttribute('aria-selected', String(b.dataset.atab === aTab));
  $('achView').hidden = aTab !== 'ach'; $('statsView').hidden = aTab !== 'stats'; $('topView').hidden = aTab !== 'top';
  const n = ACH.filter(a => P.ach[a.id]).length;
  $('achSummary').textContent = aTab === 'ach' ? tr(n + ' von ' + ACH.length + ' Erfolgen freigeschaltet.', n + ' of ' + ACH.length + ' achievements unlocked.') : aTab === 'stats' ? tr('Alles, was du bisher geschafft hast.', 'Everything you have achieved so far.') : tr('Deine zehn besten Runden in Kampagne und Endlosmodus.', 'Your ten best runs in campaign and endless mode.');
  if (aTab === 'ach') {
    const el = $('achView'); el.innerHTML = '';
    for (const a of ACH) {
      const done = !!P.ach[a.id], v = Math.min(a.goal, a.val(P.stats) || 0);
      const d = document.createElement('div'); d.className = 'ach ' + (done ? 'done' : 'locked');
      d.appendChild(iconCanvas(a.icon, 44));
      const tx = document.createElement('div');
      const b = document.createElement('b'); b.textContent = a.name;
      const p = document.createElement('p'); p.textContent = a.desc;
      tx.append(b, p);
      if (done) { const s = document.createElement('p'); s.className = 'prog-t'; s.textContent = tr('Geschafft am ', 'Unlocked on ') + new Date(P.ach[a.id]).toLocaleDateString(LANG === 'de' ? 'de-DE' : 'en-US'); tx.appendChild(s); }
      else if (a.goal > 1) {
        const bar = document.createElement('div'); bar.className = 'prog'; bar.innerHTML = `<i style="width:${Math.round(v / a.goal * 100)}%"></i>`;
        const s = document.createElement('p'); s.className = 'prog-t'; s.textContent = fmt(v) + ' / ' + fmt(a.goal);
        tx.append(bar, s);
      }
      d.appendChild(tx); el.appendChild(d);
    }
  } else if (aTab === 'stats') {
    const s = P.stats;
    const rows = [
      [tr('Runden gespielt', 'Runs played'), fmt(s.runs)], [tr('Spielzeit', 'Play time'), fmtTime(s.time)], [tr('Punkte insgesamt', 'Total points'), fmt(s.points)], [tr('Punktekonto', 'Points balance'), fmt(P.wallet)],
      [tr('Bester Punktestand', 'Best score'), fmt(s.bestScore)], [tr('Höchste Stufe', 'Highest level'), s.maxLevel || 0], [tr('Längste Runde', 'Longest run'), fmtTime(s.longest)], [tr('Kampagnen gewonnen', 'Campaigns won'), s.wins],
      [tr('Bosse besiegt', 'Bosses defeated'), fmt(s.bosses)], [bossLabel('prisma'), s.prisma], [bossLabel('queen'), s.queen], [bossLabel('bull'), s.bull], [bossLabel('eater'), s.eater], [bossLabel('dusk'), s.dusk], [bossLabel('core'), s.core],
      [tr('Bosse ohne Treffer', 'Bosses without a hit'), s.cleanBoss], [tr('Käfer weggedasht', 'Bugs dashed through'), fmt(s.bugsDashed)], [tr('Tautropfen', 'Dew drops'), fmt(s.dews)], [tr('Größte Kombo', 'Biggest combo'), '×' + (s.maxCombo || 0)],
      ['Dashes', fmt(s.dashes)], [tr('Paraden', 'Parries'), fmt(s.parries || 0)], [tr('Ankersprünge', 'Anchor jumps'), fmt(s.anchorJumps || 0)], [tr('Treffer kassiert', 'Hits taken'), fmt(s.hits)], [tr('Extras eingesammelt', 'Extras collected'), fmt(s.items)], [tr('In Fallen getappt', 'Traps stepped in'), fmt(s.traps)],
      [tr('Raketen zerstört', 'Missiles destroyed'), fmt(s.missiles)], [tr('Upgrades gewählt', 'Upgrades picked'), fmt(s.upgrades)], [tr('Von Herzen gerettet', 'Saved by hearts'), fmt(s.revives)],
      [tr('Duelle gewonnen', 'Duels won'), s.duelWins + tr(' von ', ' of ') + s.duels], [tr('Tägliche geschafft', 'Dailies completed'), s.dailyDone], [tr('Wochen geschafft', 'Weeklies completed'), s.weeklyDone],
      ...MAPS.map(m => [tr('Beste Stufe: ', 'Best level: ') + mapName(m), s['lvl_' + m.id] || 0]), [tr('Serie jetzt / beste', 'Streak now / best'), streakNow() + ' / ' + P.streak.best],
    ];
    $('statsView').innerHTML = '';
    for (const [k, v] of rows) { const d = document.createElement('div'); d.className = 'stat'; const a = document.createElement('span'); a.textContent = k; const b = document.createElement('b'); b.textContent = v; d.append(a, b); $('statsView').appendChild(d); }
  } else {
    const el = $('topView'); el.innerHTML = '';
    for (const m of ['campaign', 'endless']) {
      const sec = document.createElement('section');
      const h = document.createElement('h3'); h.textContent = MODE_NAME[m]; h.style.marginBottom = '8px';
      sec.appendChild(h);
      const list = P.top[m];
      if (!list.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = tr('Noch keine Runde.', 'No run yet.'); sec.appendChild(p); }
      else {
        const t = document.createElement('table'); t.className = 'top';
        t.innerHTML = '<thead><tr><th>#</th><th class="r">' + tr('Punkte', 'Score') + '</th><th class="r">' + tr('Stufe', 'Level') + '</th><th>' + tr('Modus', 'Mode') + '</th><th>' + tr('Datum', 'Date') + '</th></tr></thead>';
        const tb = document.createElement('tbody');
        list.forEach((r, i) => {
          const row = document.createElement('tr');
          const cells = [String(i + 1), fmt(r.s), String(r.l) + (r.w ? ' ★' : ''), (DIFF[r.df] || DIFF.normal).name, LANG === 'de' ? r.d.split('-').reverse().join('.') : r.d];
          cells.forEach((c, j) => { const td = document.createElement('td'); td.textContent = c; if (j === 1 || j === 2) td.className = 'r'; row.appendChild(td); });
          tb.appendChild(row);
        });
        t.appendChild(tb); sec.appendChild(t);
      }
      el.appendChild(sec);
    }
  }
};

RENDER.scrSettings = () => {
  const s = P.settings;
  $('setMusic').value = Math.round(s.music * 100);
  $('setSfx').value = Math.round(s.sfx * 100);
  $('setSound').checked = !s.muted;
  $('setShake').checked = s.shake;
  $('setFlash').checked = s.flashes;
  $('setHaptics').checked = s.haptics;
  $('setHaptics').closest('.set-row').hidden = !Haptics.can;
  $('setName').value = s.name;
  for (const b of $('themeSeg').children) b.setAttribute('aria-pressed', String(b.dataset.themeSet === s.theme));
  for (const b of $('langSeg').children) b.setAttribute('aria-pressed', String(b.dataset.langSet === LANG));
};

let hTab = 'rules', legendBuilt = false;
function buildLegend(list, el) {
  for (const [k, name, desc] of list) {
    const row = document.createElement('div');
    const p = document.createElement('p');
    const b = document.createElement('b'); b.textContent = name;
    p.append(b, document.createElement('br'), document.createTextNode(desc));
    row.append(iconCanvas(k, 28), p); el.appendChild(row);
  }
}
RENDER.scrHelp = () => {
  for (const b of document.querySelectorAll('[data-htab]')) b.setAttribute('aria-selected', String(b.dataset.htab === hTab));
  $('helpRules').hidden = hTab !== 'rules'; $('helpLex').hidden = hTab !== 'lex';
  if (hTab === 'lex' && !legendBuilt) {
    legendBuilt = true;
    buildLegend(GOOD, $('legendGood')); buildLegend(BAD, $('legendBad')); buildLegend(BOSS_INFO, $('legendBoss'));
    $('goodCount').textContent = GOOD.length + tr(' Sachen', ' things'); $('badCount').textContent = BAD.length + tr(' Sachen', ' things');
  }
};

RENDER.scrMulti = () => {
  const inRoom = !!Net.role;
  $('mpName').value = P.settings.name;
  $('mpIdle').hidden = inRoom; $('mpRoom').hidden = !inRoom;
  if (Net.pendingCode && !$('mpCode').value) $('mpCode').value = Net.pendingCode;
  if (inRoom) {
    $('mpCodeShow').textContent = Net.code || '·····';
    $('mpCopy').hidden = Net.role !== 'host' || !Net.ready;
    const ul = $('mpPlayers'); ul.innerHTML = '';
    const row = (skin, hat, name, tag, wait) => {
      const li = document.createElement('li'); if (wait) li.className = 'wait';
      if (!wait) li.appendChild(creatureCanvas(skin, hat, 40));
      const b = document.createElement('b'); b.textContent = name;
      const s = document.createElement('small'); s.textContent = tag;
      li.append(b, s); ul.appendChild(li);
    };
    row(P.equip.skin, P.equip.hat, P.settings.name, Net.role === 'host' ? tr('Du · Gastgeber', 'You · Host') : tr('Du', 'You'));
    if (Net.opp && !Net.opp.left) row(Net.opp.skin, Net.opp.hat, Net.opp.name, Net.role === 'host' ? tr('Gast', 'Guest') : tr('Gastgeber', 'Host'));
    else row(null, null, Net.role === 'host' ? tr('Warte auf Mitspieler …', 'Waiting for a player …') : tr('Verbinde …', 'Connecting …'), '', true);
    $('mpStart').hidden = !(Net.role === 'host' && Net.opp && !Net.opp.left);
  }
  const st = $('mpStatus');
  st.className = 'status' + (Net.err ? ' err' : '');
  st.textContent = Net.status;
  if (Net.busy) { const sp = document.createElement('span'); sp.className = 'spin'; st.prepend(sp); }
};

// ---------- Runden ----------
let lastCfg = null, pickCards = [], pickTimer = 0;
function startRun(cfg) {
  Sound.init();
  rng = cfg.seed != null ? mulberry32(cfg.seed) : Math.random;
  reset(cfg.duel ? 'count' : 'play', cfg);
  if (cfg.duel) S.countT = 3.2;
  if (cfg.boss) {
    const b = cfg.boss === 'core' ? CORE : BOSSES.find(x => x.type === cfg.boss) || BOSSES[0];
    S.level = b === CORE ? 9 : BOSSES.indexOf(b) + 1; S.grace = 2.5;
    spawnBoss(b);
  } else Sound.music(gameTrack());
  if (cfg.mode !== 'tutorial') stat('play_' + S.map.id);
  $('tutSkip').hidden = cfg.mode !== 'tutorial';
  Sound.setLevel(S.level);
  lastCfg = cfg;
  const m = cfg.mode;
  S.bestLabel = m === 'campaign' || m === 'endless' ? fmt(P.best[m] || 0) : m === 'daily' ? fmt((P.daily[cfg.dailyKey] || {}).best || 0) : m === 'weekly' ? fmt((P.weekly[cfg.weekKey] || {}).best || 0) : '–';
  $('oppBar').hidden = !cfg.duel;
  document.body.classList.toggle('duel', !!cfg.duel);
  for (const k in hc) delete hc[k];
  closeAll(); hud();
}
function startMode(mode) {
  if (mode === 'daily') { const di = dailyInfo(); startRun({ mode: 'daily', diff: 'normal', seed: di.seed, rules: [di.rule.id], map: di.map.id, dailyKey: di.key }); }
  else if (mode === 'weekly') { const wi = weeklyInfo(); startRun({ mode: 'weekly', diff: 'normal', seed: wi.seed, rules: wi.rules.map(r => r.id), map: wi.map.id, weekKey: wi.key }); }
  else startRun({ mode, diff: P.settings.diff, map: selMap() });
}
function toMenu() {
  Net.inMatch = false;
  if (Net.opp && Net.opp.left) Net.opp = null;
  rng = Math.random; reset('ready');
  $('oppBar').hidden = true; $('tutSkip').hidden = true;
  document.body.classList.remove('duel');
  resetTo('scrMain');
  Sound.music('menu'); Sound.setLevel(0);
}
function pause() {
  if (!S || S.mode !== 'play' || topScr() || DEBUG) return;   // Debug-Runden laufen auch ohne Fokus weiter
  if (!isDuel()) S.mode = 'pause';
  resetTo('scrPause');
}
RENDER.scrPause = () => {
  if (!S || !S.cfg) return;
  $('pauseMode').textContent = modeName();
  $('pauseNote').textContent = isDuel() ? tr('Achtung: Im Duell läuft das Spiel weiter!', 'Careful: the game keeps running in a duel!') : S.upList.length ? tr('Deine Upgrades in dieser Runde:', 'Your upgrades this run:') : tr('Noch keine Upgrades. Besieg einen Boss, dann darfst du wählen.', 'No upgrades yet. Defeat a boss, then you get to choose.');
  const box = $('pauseUps'); box.innerHTML = '';
  const counts = {};
  for (const id of S.upList) counts[id] = (counts[id] || 0) + 1;
  for (const id in counts) {
    const c = document.createElement('span'); c.className = 'chip';
    c.appendChild(iconCanvas(UP_BY[id].icon, 22));
    c.appendChild(document.createTextNode(UP_BY[id].name));
    if (counts[id] > 1) { const i = document.createElement('i'); i.textContent = '×' + counts[id]; c.appendChild(i); }
    box.appendChild(c);
  }
};
function resume() { if (S.mode === 'pause') S.mode = 'play'; closeAll(); }
function quit() {
  if (S.mode === 'over') return;
  if (S.cfg.mode === 'tutorial') { closeAll(); tutFinish(true); return; }
  S.quit = true;
  closeAll();
  finish(false);
}

function openPick() {
  pickCards = rollCards();
  if (!pickCards.length) { const p = pts(500); S.score += p; flash(tr('Alles voll aufgerüstet! +', 'Fully upgraded! +') + p, COL.gold); return; }
  S.mode = 'pick';
  $('pickEyebrow').textContent = tr('Boss besiegt · ', 'Boss defeated · ') + (S.upList.length ? tr(S.upList.length + (S.upList.length === 1 ? ' Upgrade' : ' Upgrades') + ' bisher', S.upList.length + (S.upList.length === 1 ? ' upgrade' : ' upgrades') + ' so far') : tr('dein erstes Upgrade', 'your first upgrade'));
  const el = $('cards'); el.innerHTML = '';
  pickCards.forEach((u, i) => {
    const b = document.createElement('button'); b.className = 'card ' + u.rar;
    b.appendChild(iconCanvas(u.icon, 52));
    const r = document.createElement('span'); r.className = 'rar'; r.textContent = RARITY[u.rar][0];
    const h = document.createElement('h3'); h.textContent = u.name;
    const p = document.createElement('p'); p.textContent = u.desc;
    const l = document.createElement('span'); l.className = 'lvl'; l.textContent = u.max > 1 ? tr('Stufe ' + (up(u.id) + 1) + ' von ' + u.max, 'Level ' + (up(u.id) + 1) + ' of ' + u.max) : tr('Einmalig', 'One-time');
    const k = document.createElement('kbd'); k.textContent = i + 1;
    b.append(r, h, p, l, k);
    b.addEventListener('click', () => choose(i));
    el.appendChild(b);
  });
  pickTimer = isDuel() ? 8 : 0;
  $('pickTimer').textContent = pickTimer ? tr('Im Duell zählt die Zeit: noch 8 s', 'Time counts in a duel: 8 s left') : '';
  resetTo('scrPick');
  Sound.sfx('deal');
}
function choose(i) {
  if (S.mode !== 'pick') return;
  const u = pickCards[i]; if (!u) return;
  applyUpgrade(u.id);
  S.mode = 'play'; S.grace = Math.max(S.grace, 0.8);
  closeAll();
  flash(u.name + '!', '#C9B8FF');
  Sound.sfx('card');
}

function finish(won) {
  if (S.mode === 'over' || S.cfg.mode === 'tutorial') return;
  S.mode = 'over'; S.won = won;
  const sc = Math.floor(S.score), m = S.cfg.mode;
  stat('runs'); P.stats.time += S.t; statMax('longest', Math.floor(S.t)); statMax('bestScore', sc); P.stats.points += sc;
  if (won && m === 'campaign') { stat('wins'); if (S.cfg.diff === 'hard') stat('hardWins'); }
  if (m === 'duel') { stat('duels'); if (won) stat('duelWins'); }
  const earned = Math.round(sc * (m === 'practice' ? 0.5 : 1));
  P.wallet += earned;
  let rec = false;
  if ((m === 'campaign' || m === 'endless') && sc > (P.best[m] || 0)) { P.best[m] = sc; rec = true; }
  if (m === 'campaign' || m === 'endless') {
    const list = P.top[m];
    list.push({ s: sc, l: S.level + 1, d: dayKey(), w: won ? 1 : 0, df: S.cfg.diff });
    list.sort((a, b) => b.s - a.s); list.length = Math.min(list.length, 10);
  }
  if (m === 'daily') {
    const d = P.daily[S.cfg.dailyKey] || (P.daily[S.cfg.dailyKey] = { best: 0 });
    if (sc > (d.best || 0)) { d.best = sc; rec = true; }
    P.best.daily = Math.max(P.best.daily, sc);
  }
  if (m === 'weekly') {
    const w = P.weekly[S.cfg.weekKey] || (P.weekly[S.cfg.weekKey] = { best: 0 });
    if (sc > (w.best || 0)) { w.best = sc; rec = true; }
    P.best.weekly = Math.max(P.best.weekly || 0, sc);
  }
  checkAch(); save();
  S.result = { sc, earned, rec };
  S.target = null; keys.clear();
  Sound.music(null); Sound.sfx(won ? 'victory' : 'over');
  if (isDuel()) Net.send(won ? { t: 'won', s: sc } : { t: 'dead', s: sc, time: S.t, l: S.level });
  setTimeout(() => { if (S.mode === 'over') showResults(); }, won ? 600 : 850);
}
function duelOutcome() {
  if (S.won) return 'win';
  const o = Net.opp;
  if (!o || o.alive) return 'lose';
  if (o.dead) { if (o.dead.t < S.t - 0.05) return 'win'; if (o.dead.t > S.t + 0.05) return 'lose'; return 'draw'; }
  return 'lose';
}
function tile(label, value, hl) {
  const d = document.createElement('div'); d.className = 'tile' + (hl ? ' hl' : '');
  const a = document.createElement('span'); a.textContent = label;
  const b = document.createElement('b'); b.textContent = value;
  d.append(a, b); return d;
}
function showResults() {
  const R = S.result, m = S.cfg.mode, duel = isDuel(), o = Net.opp;
  $('ovEyebrow').textContent = modeName();
  let title, text;
  if (duel) {
    const out = duelOutcome(), name = o ? o.name : tr('Dein Gegner', 'Your opponent');
    title = out === 'win' ? tr('Sieg!', 'Victory!') : out === 'draw' ? tr('Unentschieden', 'Draw') : tr('Niederlage', 'Defeat');
    text = out === 'win' ? (o && o.left ? tr(name + ' hat das Duell verlassen. Der Sieg gehört dir.', name + ' left the duel. The victory is yours.') : tr(name + ' ist zuerst verdampft. Du hast länger durchgehalten.', name + ' evaporated first. You lasted longer.'))
         : out === 'draw' ? tr('Ihr seid fast gleichzeitig verdampft.', 'You both evaporated almost at the same time.')
         : o && o.finished ? tr(name + ' hat länger durchgehalten und gewinnt.', name + ' lasted longer and wins.')
         : o && o.alive ? tr(name + ' hält noch durch. Du bist zuerst verdampft.', name + ' is still going. You evaporated first.') : tr(name + ' hat länger durchgehalten.', name + ' lasted longer.');
    if (Net.oppAgain && Net.role === 'host') text += tr(' ' + name + ' will eine Revanche!', ' ' + name + ' wants a rematch!');
    if (Net.meAgain && Net.role === 'guest') text += tr(' Warte, bis ' + name + ' die Revanche startet …', ' Wait for ' + name + ' to start the rematch …');
  } else if (S.won) {
    title = tr('Sieg!', 'Victory!');
    text = tr('Du hast den Sonnenkern besiegt und den Innenhof befreit. ' + fmtTime(S.t) + ' Minuten, ' + S.upList.length + ' Upgrades.', 'You defeated the Sun Core and freed the yard. ' + fmtTime(S.t) + ' minutes, ' + S.upList.length + ' upgrades.');
  } else if (S.quit) {
    title = tr('Aufgegeben', 'Gave up');
    text = tr('Du hast nach ' + Math.floor(S.t) + ' Sekunden auf Stufe ' + (S.level + 1) + ' aufgehört. Deine Punkte zählen trotzdem.', 'You stopped after ' + Math.floor(S.t) + ' seconds on level ' + (S.level + 1) + '. Your points still count.');
  } else {
    title = tr('Verdampft', 'Evaporated');
    text = tr('Du hast ' + Math.floor(S.t) + ' Sekunden Chaos überstanden und Stufe ' + (S.level + 1) + ' erreicht.', 'You survived ' + Math.floor(S.t) + ' seconds of chaos and reached level ' + (S.level + 1) + '.');
  }
  if (m === 'weekly') text += S.run.weeklyDone ? tr(' Wochenziel geschafft!', ' Weekly goal reached!') : tr(' Fürs Wochenziel brauchst du Stufe ' + WEEKLY_GOAL + '.', ' For the weekly goal you need level ' + WEEKLY_GOAL + '.');
  if (m === 'daily') text += S.run.dailyDone ? tr(' Tagesziel geschafft!', ' Daily goal reached!') : tr(' Fürs Tagesziel brauchst du Stufe ' + DAILY_GOAL + '.', ' For the daily goal you need level ' + DAILY_GOAL + '.');
  if (m === 'practice') text += tr(' Beim Üben gibt es nur die halben Punkte aufs Konto.', ' Practice runs only give half the points.');
  const t = $('ovTitle'); t.textContent = title;
  if (R.rec && !duel) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = tr('Neuer Rekord', 'New record'); t.appendChild(b); }
  $('ovText').textContent = text;
  const tiles = $('ovTiles'); tiles.innerHTML = '';
  tiles.append(tile(tr('Punkte', 'Score'), fmt(R.sc), true), tile(tr('Zeit', 'Time'), fmtTime(S.t)), tile(tr('Stufe', 'Level'), String(S.level + 1)));
  if (duel) tiles.append(tile(o ? o.name : tr('Gegner', 'Opponent'), fmt(o ? o.score || 0 : 0)), tile(tr('Bosse', 'Bosses'), String(S.bossKills)), tile(tr('Aufs Konto', 'To balance'), '+' + fmt(R.earned)));
  else tiles.append(tile(tr('Bosse', 'Bosses'), String(S.bossKills)), tile('Upgrades', String(S.upList.length)), tile(tr('Aufs Konto', 'To balance'), '+' + fmt(R.earned)));
  const nl = $('ovNew'); nl.innerHTML = '';
  for (const id of S.run.newAch) { const c = document.createElement('span'); c.className = 'chip'; c.appendChild(iconCanvas(ACH_BY[id].icon, 22)); c.appendChild(document.createTextNode(tr('Erfolg: ', 'Achievement: ') + ACH_BY[id].name)); nl.appendChild(c); }
  for (const [kind, id] of S.run.newItems) {
    const c = document.createElement('span'); c.className = 'chip';
    c.appendChild(creatureCanvas(kind === 'skin' ? id : P.equip.skin, kind === 'hat' ? id : 'none', 22));
    c.appendChild(document.createTextNode((kind === 'skin' ? 'Skin: ' : tr('Hut: ', 'Hat: ')) + (kind === 'skin' ? SKIN_BY[id] : HAT_BY[id]).name)); nl.appendChild(c);
  }
  const again = $('againBtn'), connected = !!(Net.conn && Net.conn.open && o && !o.left);
  if (duel) {
    again.textContent = Net.role === 'host' ? tr('Revanche starten', 'Start rematch') : Net.meAgain ? tr('Revanche angefragt', 'Rematch requested') : tr('Revanche anfragen', 'Request rematch');
    again.disabled = !connected || (Net.role === 'guest' && Net.meAgain);
  } else { again.textContent = m === 'daily' || m === 'weekly' ? tr('Nochmal versuchen', 'Try again') : tr('Nochmal', 'Again'); again.disabled = false; }
  if (topScr() === 'scrOver') { show(true); } else resetTo('scrOver');
}
function oppDied(m) {
  const o = Net.opp; if (!o) return;
  o.alive = false; o.dead = m; if (m.s != null) o.score = m.s;
  if (!isDuel() || !Net.inMatch) return;
  if (S.mode === 'over') {
    if (!S.won && duelOutcome() === 'win') { S.won = true; stat('duelWins'); checkAch(); save(); }
    if (topScr() === 'scrOver') showResults();
  } else if (S.mode === 'play' || S.mode === 'count') {
    if (!S.duelWinT) {
      S.duelWinT = 1.8; S.grace = 99;
      S.banner = { text: m.left ? tr(o.name + ' ist weg', o.name + ' is gone') : tr(o.name + ' ist verdampft!', o.name + ' evaporated!'), good: true, t: 2.2, head: tr('DU GEWINNST', 'YOU WIN') };
      Sound.sfx('ach');
      if (S.mode === 'count') S.mode = 'play';
    }
  } else { closeAll(); S.mode = 'play'; finish(true); }
}
function startDuel(seed, map) {
  Net.inMatch = true; Net.oppAgain = false; Net.meAgain = false;
  const o = Net.opp;
  if (o) Object.assign(o, { alive: true, dead: null, left: false, finished: false, score: 0, energy: 100, level: 0, x: null, y: null, dx: null, dy: null });
  startRun({ mode: 'duel', diff: 'normal', seed, duel: true, map: MAP_BY[map] ? map : 'yard' });
}

// ---------- Online-Duell (WebRTC über PeerJS) ----------
const PEER_PREFIX = 'schattenfaenger-v2-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14);
function errText(e) {
  const t = e && e.type;
  if (t === 'peer-unavailable') return tr('Raum nicht gefunden. Stimmt der Code?', 'Room not found. Is the code right?');
  if (t === 'browser-incompatible') return tr('Dein Browser unterstützt kein WebRTC.', 'Your browser does not support WebRTC.');
  if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return tr('Der Vermittlungsserver ist nicht erreichbar. Bist du online?', 'The matchmaking server is not reachable. Are you online?');
  return tr('Verbindung fehlgeschlagen', 'Connection failed') + (t ? ' (' + t + ')' : '') + '.';
}
const Net = {
  peer: null, conn: null, role: null, code: '', opp: null, inMatch: false, ready: false, sendT: 0,
  status: '', err: false, busy: false, pendingCode: '', oppAgain: false, meAgain: false, joinTimer: 0, _lib: null,
  lib() {
    if (window.Peer) return Promise.resolve();
    if (this._lib) return this._lib;
    this._lib = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.5/peerjs.min.js';
      s.onload = () => res(); s.onerror = () => { this._lib = null; s.remove(); rej(new Error('lib')); };
      document.head.appendChild(s);
    });
    return this._lib;
  },
  setStatus(text, err, busy) { this.status = text || ''; this.err = !!err; this.busy = !!busy; if (topScr() === 'scrMulti') RENDER.scrMulti(); },
  teardown() {
    clearTimeout(this.joinTimer);
    const c = this.conn, p = this.peer;
    this.peer = this.conn = null; this.role = null; this.code = ''; this.opp = null; this.inMatch = false; this.ready = false;
    try { c && c.close(); } catch (e) {}
    try { p && p.destroy(); } catch (e) {}
  },
  fail(text) { this.teardown(); this.setStatus(text, true); },
  leave() { this.send({ t: 'bye' }); this.teardown(); this.setStatus(''); },
  async host() {
    this.teardown(); this.role = 'host'; this.setStatus(tr('Raum wird erstellt …', 'Creating room …'), false, true);
    try { await this.lib(); } catch (e) { return this.fail(tr('Die Mehrspieler-Bibliothek ließ sich nicht laden. Bist du online?', 'The multiplayer library could not be loaded. Are you online?')); }
    const tryOpen = n => {
      const code = makeCode(), peer = new window.Peer(PEER_PREFIX + code.toLowerCase(), { debug: 0 });
      this.peer = peer; this.code = code;
      peer.on('open', () => { if (this.peer !== peer) return; this.ready = true; this.setStatus(tr('Schick den Code an deinen Mitspieler.', 'Send the code to your opponent.'), false, false); });
      peer.on('connection', c => {
        if (this.peer !== peer) return;
        if (this.conn && this.conn.open) { c.on('open', () => { try { c.send({ t: 'full' }); } catch (e) {} setTimeout(() => c.close(), 400); }); return; }
        this.bind(c);
      });
      peer.on('error', e => {
        if (this.peer !== peer) return;
        if (e.type === 'unavailable-id' && n < 4) { try { peer.destroy(); } catch (x) {} tryOpen(n + 1); }
        else if (e.type === 'peer-unavailable') this.setStatus(tr('Mitspieler nicht erreichbar.', 'Player not reachable.'), true);
        else this.fail(errText(e));
      });
      peer.on('disconnected', () => { if (this.peer === peer && !peer.destroyed && !this.conn) try { peer.reconnect(); } catch (e) {} });
    };
    tryOpen(0);
  },
  async join(code) {
    this.teardown(); this.role = 'guest'; this.code = code; this.setStatus(tr('Verbinde mit Raum ' + code + ' …', 'Connecting to room ' + code + ' …'), false, true);
    try { await this.lib(); } catch (e) { return this.fail(tr('Die Mehrspieler-Bibliothek ließ sich nicht laden. Bist du online?', 'The multiplayer library could not be loaded. Are you online?')); }
    const peer = new window.Peer({ debug: 0 });
    this.peer = peer;
    peer.on('open', () => {
      if (this.peer !== peer) return;
      this.bind(peer.connect(PEER_PREFIX + code.toLowerCase(), { reliable: true }));
      this.joinTimer = setTimeout(() => { if (this.peer === peer && !this.opp) this.fail(tr('Keine Antwort vom Raum ' + code + '. Stimmt der Code?', 'No answer from room ' + code + '. Is the code right?')); }, 15000);
    });
    peer.on('error', e => { if (this.peer === peer) this.fail(errText(e)); });
  },
  bind(c) {
    this.conn = c;
    c.on('open', () => this.send({ t: 'hello', name: P.settings.name, skin: P.equip.skin, hat: P.equip.hat, v: 2 }));
    c.on('data', m => { if (this.conn === c && m && typeof m === 'object') this.onMsg(m); });
    c.on('close', () => { if (this.conn === c) this.onClose(); });
    c.on('error', () => { if (this.conn === c) this.onClose(); });
  },
  send(m) { if (this.conn && this.conn.open) { try { this.conn.send(m); } catch (e) {} } },
  onMsg(m) {
    switch (m.t) {
      case 'hello':
        clearTimeout(this.joinTimer);
        this.opp = { name: cleanName(m.name) || tr('Gegner', 'Opponent'), skin: SKIN_BY[m.skin] ? m.skin : 'schatten', hat: HAT_BY[m.hat] ? m.hat : 'none', alive: true, score: 0 };
        this.setStatus(this.role === 'host' ? tr(this.opp.name + ' ist da. Startklar!', this.opp.name + ' is here. Ready to go!') : tr('Verbunden. Warte, bis ' + this.opp.name + ' das Duell startet …', 'Connected. Waiting for ' + this.opp.name + ' to start the duel …'), false, this.role !== 'host');
        Sound.sfx('join');
        toast(this.role === 'host' ? tr('Mitspieler da', 'Player joined') : tr('Verbunden', 'Connected'), this.opp.name, null, creatureCanvas(this.opp.skin, this.opp.hat, 38));
        break;
      case 'full': this.fail(tr('Der Raum ist schon voll.', 'The room is already full.')); break;
      case 'start': if (this.opp && Number.isFinite(m.seed)) startDuel(m.seed >>> 0, String(m.map || 'yard')); break;
      case 'st':
        if (this.opp && this.inMatch) {
          const o = this.opp;
          o.x = Math.max(0, Math.min(W, +m.x || 0)); o.y = Math.max(0, Math.min(H, +m.y || 0));
          o.score = +m.s || 0; o.energy = +m.e || 0; o.level = +m.l || 0;
          if (o.dx == null) { o.dx = o.x; o.dy = o.y; }
        }
        break;
      case 'atk': if (this.inMatch && isDuel() && typeof m.k === 'string' && S.incoming.length < 4) S.incoming.push(m.k); break;
      case 'dead': oppDied({ s: +m.s || 0, t: +m.time || 0, l: +m.l || 0 }); break;
      case 'won':
        if (this.opp && this.inMatch) { this.opp.score = +m.s || 0; this.opp.finished = true; if (topScr() === 'scrOver' && isDuel()) showResults(); }
        break;
      case 'again': this.oppAgain = true; if (topScr() === 'scrOver' && isDuel()) showResults(); else toast(tr('Revanche?', 'Rematch?'), (this.opp ? this.opp.name : tr('Dein Gegner', 'Your opponent')) + tr(' will nochmal', ' wants to play again'), 'decoy'); break;
      case 'bye': this.onClose(); break;
    }
  },
  onClose() {
    const o = this.opp, name = o ? o.name : tr('Dein Gegner', 'Your opponent');
    clearTimeout(this.joinTimer);
    this.conn = null;
    if (this.inMatch && o && isDuel()) {
      o.left = true;
      if (o.alive) oppDied({ s: o.score || 0, t: -1, left: true });
      else if (topScr() === 'scrOver') showResults();
      toast(tr('Verbindung getrennt', 'Disconnected'), tr(name + ' hat das Duell verlassen', name + ' left the duel'), 'decoy');
    } else this.opp = null;
    if (this.role === 'host' && this.peer && !this.peer.destroyed) this.setStatus(tr(name + ' ist gegangen. Warte auf einen neuen Mitspieler …', name + ' has left. Waiting for a new player …'), true);
    else { const keepOpp = this.inMatch ? this.opp : null; const im = this.inMatch; this.teardown(); this.inMatch = im; this.opp = keepOpp; this.setStatus(tr(name + ' hat die Verbindung getrennt.', name + ' disconnected.'), true); }
  },
  attack(kind) {
    const pool = kind === 'boss' ? ['Käferschwarm', 'Suchraketen', 'Lasergitter', 'Sonnenfunken', 'Sägeblätter', 'Glassäulen'] : ['Blitzlicht', 'Sturmböe', 'Honigregen', 'Elstern'];
    const k = pool[Math.floor(Math.random() * pool.length)];
    this.send({ t: 'atk', k });
    flash(tr('Angriff geschickt: ', 'Attack sent: ') + evLabel(k), '#C9B8FF');
  },
  startMatch() {
    if (!this.conn || !this.conn.open || !this.opp) return;
    const seed = (Math.random() * 4294967296) >>> 0;
    const map = selMap();
    this.send({ t: 'start', seed, map });
    startDuel(seed, map);
  },
  tick(dt) {
    if (!this.inMatch) return;
    const o = this.opp;
    if (o && o.x != null) { const k = Math.min(1, dt * 12); o.dx += (o.x - o.dx) * k; o.dy += (o.y - o.dy) * k; }
    this.sendT -= dt;
    if (this.sendT <= 0 && (S.mode === 'play' || S.mode === 'pick' || S.mode === 'count')) {
      this.sendT = 0.08;
      this.send({ t: 'st', x: Math.round(S.p.x), y: Math.round(S.p.y), s: Math.floor(S.score), e: Math.round(S.energy), l: S.level });
    }
    updateOppBar();
  },
};

// ---------- Knöpfe ----------
document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  Sound.init();
  if (!b.classList.contains('card') && !b.classList.contains('item')) Sound.sfx('click');
  if (b.dataset.go === 'scrModes' && !P.tutDone && topScr() === 'scrMain') startTutorial();
  else if (b.dataset.go) open(b.dataset.go);
  else if (b.hasAttribute('data-back')) back();
});
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => startMode(b.dataset.mode)));
document.querySelectorAll('[data-boss]').forEach(b => b.addEventListener('click', () => startRun({ mode: 'practice', diff: P.settings.diff, boss: b.dataset.boss, map: selMap() })));
$('mapGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-map]'); if (!b) return;
  const m = MAP_BY[b.dataset.map];
  if (!mapUnlocked(m)) { Sound.sfx('deny'); toast(tr('Karte gesperrt', 'Map locked'), mapLockText(m), m.icon); return; }
  P.settings.map = m.id; save(); RENDER.scrModes();
});
$('weeklyGo').addEventListener('click', () => startMode('weekly'));
$('tutBtn').addEventListener('click', () => startTutorial());
$('tutSkip').addEventListener('click', () => tutFinish(true));
$('diffSeg').addEventListener('click', e => { const b = e.target.closest('[data-diff]'); if (!b) return; P.settings.diff = b.dataset.diff; save(); RENDER.scrModes(); });
$('dailyGo').addEventListener('click', () => startMode('daily'));
$('pauseBtn').addEventListener('click', () => { if (topScr() === 'scrPause') resume(); else pause(); });
$('muteBtn').addEventListener('click', toggleMute);
$('resumeBtn').addEventListener('click', resume);
$('quitBtn').addEventListener('click', quit);
$('againBtn').addEventListener('click', () => {
  if (isDuel()) {
    if (Net.role === 'host') Net.startMatch();
    else { Net.send({ t: 'again' }); Net.meAgain = true; showResults(); }
  } else startRun(lastCfg);
});
$('menuBtn').addEventListener('click', () => { const wasDuel = isDuel(); toMenu(); if (wasDuel && Net.role) open('scrMulti'); });
document.querySelectorAll('[data-wtab]').forEach(b => b.addEventListener('click', () => { wTab = b.dataset.wtab; wConfirm = null; RENDER.scrWardrobe(); }));
document.querySelectorAll('[data-atab]').forEach(b => b.addEventListener('click', () => { aTab = b.dataset.atab; RENDER.scrAch(); }));
document.querySelectorAll('[data-htab]').forEach(b => b.addEventListener('click', () => { hTab = b.dataset.htab; RENDER.scrHelp(); }));

$('setMusic').addEventListener('input', e => { P.settings.music = e.target.value / 100; Sound.init(); Sound.volumes(); });
$('setSfx').addEventListener('input', e => { P.settings.sfx = e.target.value / 100; Sound.init(); Sound.volumes(); });
$('setSfx').addEventListener('change', () => { Sound.sfx('dew', 3); save(); });
$('setMusic').addEventListener('change', save);
$('setSound').addEventListener('change', e => { P.settings.muted = !e.target.checked; Sound.init(); Sound.volumes(); updateMuteBtn(); save(); });
$('setShake').addEventListener('change', e => { P.settings.shake = e.target.checked; save(); });
$('setFlash').addEventListener('change', e => { P.settings.flashes = e.target.checked; save(); });
$('setHaptics').addEventListener('change', e => { P.settings.haptics = e.target.checked; save(); if (e.target.checked) Haptics.play('block'); });
$('themeSeg').addEventListener('click', e => { const b = e.target.closest('[data-theme-set]'); if (!b) return; P.settings.theme = b.dataset.themeSet; applyTheme(); save(); RENDER.scrSettings(); });
$('langSeg').addEventListener('click', e => { const b = e.target.closest('[data-lang-set]'); if (!b) return; setLang(b.dataset.langSet); save(); Sound.sfx('click'); });
const setName = v => { const n = cleanName(v); if (n) { P.settings.name = n; save(); } };
$('setName').addEventListener('change', e => setName(e.target.value));
$('mpName').addEventListener('change', e => setName(e.target.value));
let resetArmed = 0;
$('resetBtn').addEventListener('click', () => {
  const b = $('resetBtn');
  if (!resetArmed) { resetArmed = setTimeout(() => { resetArmed = 0; b.textContent = tr('Zurücksetzen', 'Reset'); }, 3500); b.textContent = tr('Wirklich löschen?', 'Really delete?'); return; }
  clearTimeout(resetArmed); resetArmed = 0; b.textContent = tr('Zurücksetzen', 'Reset');
  const s = P.settings; P = freshProfile(); P.settings = s; save();
  toast(tr('Fortschritt gelöscht', 'Progress deleted'), tr('Alles wieder auf Anfang', 'Back to square one'), 'crumble');
});

$('mpHost').addEventListener('click', () => { setName($('mpName').value); Net.host(); RENDER.scrMulti(); });
const doJoin = () => {
  setName($('mpName').value);
  const code = $('mpCode').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) { Net.setStatus(tr('Der Code hat 5 Zeichen.', 'The code has 5 characters.'), true); return; }
  Net.pendingCode = ''; Net.join(code); RENDER.scrMulti();
};
$('mpJoin').addEventListener('click', doJoin);
$('mpCode').addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
$('mpStart').addEventListener('click', () => Net.startMatch());
$('mpLeave').addEventListener('click', () => { Net.leave(); RENDER.scrMulti(); });
$('mpCopy').addEventListener('click', () => {
  const link = location.protocol.startsWith('http') ? location.origin + location.pathname + '?room=' + Net.code : Net.code;
  const done = ok => Net.setStatus(ok ? (link === Net.code ? tr('Code kopiert. Schick ihn an deinen Mitspieler.', 'Code copied. Send it to your opponent.') : tr('Link kopiert. Wer ihn öffnet, landet direkt in deinem Raum.', 'Link copied. Whoever opens it lands straight in your room.')) : tr('Kopieren ging nicht. Schick einfach den Code ' + Net.code + '.', 'Copying failed. Just send the code ' + Net.code + '.'), !ok);
  if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => done(true), () => done(false)); else done(false);
});

// ---------- Eingabe ----------
const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
                 ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
document.addEventListener('keydown', e => {
  Sound.init();
  const t = topScr(), inInput = e.target && (e.target.tagName === 'INPUT');
  if (e.key === 'Escape') {
    e.preventDefault();
    if (t === 'scrPause') resume();
    else if (t && t !== 'scrMain' && t !== 'scrOver' && t !== 'scrPick') back();
    else if (!t) pause();
    return;
  }
  if (inInput) return;
  if ((e.key === 'm' || e.key === 'M') && !e.repeat) { toggleMute(); return; }
  if ((e.key === 'p' || e.key === 'P') && !e.repeat) { if (t === 'scrPause') resume(); else if (!t) pause(); return; }
  if (t === 'scrPick') { const i = '123'.indexOf(e.key); if (i >= 0 && e.key.length === 1) { choose(i); e.preventDefault(); } return; }
  if (t) return;
  if (KEYMAP[e.key]) { keys.add(KEYMAP[e.key]); e.preventDefault(); }
  else if (S.mode === 'play' && (e.key === 'Shift' || e.key === ' ')) { dash(); e.preventDefault(); }
  else if (S.mode === 'play' && (e.key === 'e' || e.key === 'E') && !e.repeat) { anchor(); e.preventDefault(); }
  else if (S.mode === 'play' && (e.key === 'q' || e.key === 'Q') && !e.repeat) { parry(); e.preventDefault(); }
});
document.addEventListener('keyup', e => { if (KEYMAP[e.key]) keys.delete(KEYMAP[e.key]); });
window.addEventListener('blur', () => { keys.clear(); if (S) S.target = null; if (S && S.mode === 'play' && !isDuel() && !topScr()) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); if (S && S.mode === 'play' && !isDuel() && !topScr()) pause(); } });
window.addEventListener('pagehide', () => { save(); Net.send({ t: 'bye' }); });
document.addEventListener('pointerdown', () => Sound.init(), { capture: true });

cv.addEventListener('contextmenu', e => e.preventDefault());
// Dash reagiert wie Anker und Spiegel schon beim Antippen. Ein Klick ohne Zeiger (Tastatur) loest ihn weiterhin aus.
$('dashBtn').addEventListener('pointerdown', e => { e.preventDefault(); dash(); });
$('dashBtn').addEventListener('click', e => { if (e.detail === 0) dash(); });
// Damit :active auf iOS sofort greift
document.addEventListener('touchstart', () => {}, { passive: true });
// Anker und Spiegel reagieren schon beim Antippen, beim Spiegel zählt jede Millisekunde
$('anchorBtn').addEventListener('pointerdown', e => { e.preventDefault(); anchor(); });
$('parryBtn').addEventListener('pointerdown', e => { e.preventDefault(); parry(); });
function toGame(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
// Rechtsklick-Dash über mousedown: Der Browser meldet einen Rechtsklick,
// während die linke Taste gehalten wird, nicht als eigenes pointerdown.
cv.addEventListener('mousedown', e => {
  if (e.button === 2) { const g = toGame(e); dash(g.x, g.y); e.preventDefault(); }
});
cv.addEventListener('pointerdown', e => {
  if (e.button !== 0 || S.mode !== 'play') return;
  S.target = toGame(e); cv.setPointerCapture?.(e.pointerId);
});
cv.addEventListener('pointermove', e => { if (S.target) S.target = toGame(e); });
const endPtr = () => { if (S) S.target = null; };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);

// ---------- Hauptschleife ----------
function drawHero(id, skin, hat, t, trail) {
  const c = $(id), r = c.getBoundingClientRect();
  if (!r.width) return;
  drawYard(sizeCanvas(c, r.width, r.height), r.width, r.height, skin, hat, t, trail);
}
let last = performance.now();
function loop(now) {
  let dt = Math.min(0.05, (now - last) / 1000) * SLOW; last = now;
  if (DEBUG) {   // feste Bildrate, nach „frames“ Bildern bleibt alles stehen
    if (DEBUG.left <= 0) { DEBUG.done = DEBUG.frame > 0; requestAnimationFrame(loop); return; }
    DEBUG.left--; DEBUG.frame++; DEBUG.done = false; dt = 1 / 60; now = DEBUG.frame * 1000 / 60;
    if (DEBUG.parry && S.mode === 'play' && S.shots.some(q => !q.ref && !q.hard && Math.hypot(q.x - S.p.x, q.y - S.p.y) < 28)) parry();
  }
  if (S.mode === 'pick') {
    if (pickTimer > 0) {
      pickTimer -= dt;
      $('pickTimer').textContent = tr('Im Duell zählt die Zeit: noch ', 'Time counts in a duel: ') + Math.max(0, Math.ceil(pickTimer)) + tr(' s', ' s left');
      if (pickTimer <= 0) choose(0);
    }
  } else if (S.mode !== 'pause') update(dt);
  CC.frame();
  draw();
  Net.tick(dt);
  if (achDirty) checkAch();
  const t = topScr();
  if (t === 'scrMain') drawHero('heroCv', P.equip.skin, P.equip.hat, now / 1000, P.equip.trail);
  else if (t === 'scrWardrobe') drawHero('wardCv', wPrev.skin, wPrev.hat, now / 1000, wPrev.trail);
  requestAnimationFrame(loop);
}

// ---------- Sprache wechseln ----------
function setLang(l) {
  LANG = l === 'de' ? 'de' : 'en';
  P.settings.lang = LANG;
  document.documentElement.lang = LANG;
  document.title = 'Shady';
  const md = document.querySelector('meta[name="description"]');
  if (md) md.content = tr('Ein chaotisches Browserspiel über Licht und Schatten. 6 Bosse, 4 Karten, tägliche und wöchentliche Herausforderungen, Upgrades, Garderobe und Online-Duell.', 'A chaotic browser game about light and shadow. 6 bosses, 4 maps, daily and weekly challenges, upgrades, wardrobe and online duel.');
  applyDataLang(); translateStatic();
  for (const k in hc) delete hc[k];
  legendBuilt = false; for (const id of ['legendGood', 'legendBad', 'legendBoss']) $(id).innerHTML = '';
  wConfirm = null; updateMuteBtn();
  if (S && S.cfg) hud();
  const t = topScr(); if (t && RENDER[t]) RENDER[t]();
}

// ---------- Start ----------
(function boot() {
  const keysD = Object.keys(P.daily).sort();
  while (keysD.length > 40) delete P.daily[keysD.shift()];
  for (const k of ['skin', 'hat', 'trail']) if (!isOwned(k, ({ skin: SKIN_BY, hat: HAT_BY, trail: TRAIL_BY })[k][P.equip[k]])) P.equip[k] = k === 'skin' ? 'schatten' : 'none';
  if (!MAP_BY[P.settings.map]) P.settings.map = 'yard';
  // Wer schon vor dem Tutorial gespielt hat, wird nicht mehr automatisch hineingeschickt.
  if (!P.tutDone && P.stats.runs > 0) P.tutDone = true;
  applyTheme(); setLang(P.settings.lang);
  // Auf hohen Bildschirmen liegen die Herausforderungen gleich offen, sonst sind sie eine Zeile und klappen auf
  if (matchMedia('(min-height:1000px)').matches && matchMedia('(min-width:781px)').matches) { $('dailyCard').open = true; $('weeklyCard').open = true; }
  reset('ready');
  const qp = new URLSearchParams(location.search), q = qp.get('room') || qp.get('raum');
  if (q) { Net.pendingCode = q.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); stack = ['scrMain', 'scrMulti']; show(); }
  else resetTo('scrMain');
  Sound.music('menu');
  checkAch(); save();
  if (DEBUG) debugStart();
  requestAnimationFrame(loop);
})();

// Debug-Start (siehe DEBUG oben): Runde mit fester Stufe, optional Boss und Ereignis. Die Figur ist unverwundbar,
// damit sie beim Stillstehen nicht verdampft. Die Zeit läuft erst los, wenn die Schriften geladen sind.
function debugStart() {
  const scr = 'scr' + DEBUG.screen[0].toUpperCase() + DEBUG.screen.slice(1);   // screen=wardrobe, modes, ach, help, settings
  if ($(scr)) open(scr);
  else if (DEBUG.screen !== 'menu') {
    startRun({ mode: DEBUG.mode, diff: P.settings.diff, seed: DEBUG.seed, map: MAP_BY[DEBUG.map] ? DEBUG.map : 'yard' });
    S.level = DEBUG.level - 1; S.grace = 1e9; Sound.setLevel(S.level);
    const b = DEBUG.boss && (DEBUG.boss === 'core' ? CORE : BOSSES.find(x => x.type === DEBUG.boss));
    if (b) { spawnBoss(b); if (DEBUG.rage) S.boss.hp = Math.floor(S.boss.maxHp / 2); }
    if (DEBUG.anchor) { S.anchor = { x: S.p.x - 70, y: S.p.y + 40, life: ANCHOR_LIFE }; resolve(); }
    const ev = DEBUG.event && EVENTS.find(e => e.id === DEBUG.event || e.name === DEBUG.event);
    if (ev) startEvent(ev);
    hud();
  }
  const go = () => { if (!DEBUG.frame && !DEBUG.left) DEBUG.left = DEBUG.frames; };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(go);
  setTimeout(go, 4000);
  window.shadyDebug = { get frame() { return DEBUG.frame; }, get done() { return DEBUG.done; }, advance(n) { DEBUG.left += n; DEBUG.done = false; } };
}

