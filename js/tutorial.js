'use strict';
// Tutorial: eine ruhige Übungsrunde ohne Chaos-Rad, in der jeder Schritt eine Sache erklärt.

const TUT_STEPS = [
  ['Lauf herum! WASD, Pfeiltasten oder mit dem Finger aufs Feld drücken und halten.', 'Move around! WASD, arrow keys, or press and hold on the field.'],
  ['Die Sonne frisst deine Kraft (Leiste oben). Stell dich in einen Schatten!', 'The sun eats your energy (bar at the top). Step into a shadow!'],
  ['Tautropfen liegen immer in der Sonne. Schnapp dir den Tropfen!', 'Dew drops always lie in the sun. Grab the drop!'],
  ['Dash: Shift, Leertaste, Rechtsklick oder der DASH-Knopf. Probier es aus!', 'Dash: Shift, Space, right-click or the DASH button. Try it!'],
  ['Ein Lichtkäfer! Beim Dash bist du unverwundbar. Dashe durch ihn hindurch!', 'A light bug! You are invulnerable while dashing. Dash right through it!'],
  ['Schattenanker: Drück E (oder ANKER), lauf ein Stück weg und drück E nochmal. Du springst zurück zum Anker!', 'Shadow anchor: press E (or ANCHOR), walk away a bit and press E again. You jump back to the anchor!'],
  ['Spiegel: Drück Q (oder SPIEGEL) genau, bevor dich eine Lichtkugel trifft. Schlag 2 Kugeln zurück!', 'Mirror: press Q (or MIRROR) right before a light orb hits you. Send 2 orbs back!'],
  ['Bosse verletzt ein Dash. Dashe zweimal in Prisma!', 'A dash hurts bosses. Dash into Prisma twice!'],
  ['Nach jedem Boss wählst du ein Upgrade. So spielt sich jede Runde anders.', 'After every boss you pick an upgrade. That makes every run different.'],
  ['Geschafft! Jetzt kennst du alles Wichtige. Viel Glück da draußen!', 'Done! You know the essentials. Good luck out there!'],
];

function startTutorial() {
  startRun({ mode: 'tutorial', diff: 'easy', map: 'yard', seed: 424242 });
  S.tut = { step: 0, t: 0, moved: 0, last: { x: S.p.x, y: S.p.y }, shade: 0, d0: 0, b0: 0, target: null, seek: 0 };
  S.grace = 0; S.energy = 70;
}
function tutNext() {
  const T = S.tut;
  T.step++; T.t = 0; T.target = null;
  T.d0 = P.stats.dashes || 0; T.b0 = P.stats.bugsDashed || 0; T.j0 = S.run.jumps; T.p0 = S.run.parries;
  Sound.sfx('level');
}
function tutFinish(skipped) {
  P.tutDone = true;
  if (!skipped) stat('tutorial');
  checkAch(); save();
  toMenu();
  open('scrModes');
  if (!skipped) toast(tr('Tutorial geschafft', 'Tutorial complete'), tr('Du bist bereit. Wähl einen Modus!', 'You are ready. Pick a mode!'), 'calendar');
}
// Nächster Schattenpunkt, damit der Zeiger im zweiten Schritt irgendwohin zeigen kann
function nearestShade() {
  let best = null, bd = 1e9;
  for (let x = 20; x < W; x += 20) for (let y = 20; y < H; y += 20) {
    if (inPillar(x, y, 12) || !inShadow(x, y)) continue;
    const d = Math.hypot(x - S.p.x, y - S.p.y);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
function tutUpdate(dt) {
  const T = S.tut;
  if (!T) return;
  T.t += dt;
  switch (T.step) {
    case 0:
      T.moved += Math.hypot(S.p.x - T.last.x, S.p.y - T.last.y); T.last = { x: S.p.x, y: S.p.y };
      if (T.moved > 150) tutNext();
      break;
    case 1:
      T.seek -= dt;
      if (T.seek <= 0) { T.target = nearestShade(); T.seek = 0.4; }
      T.shade = inShadow(S.p.x, S.p.y) ? T.shade + dt : 0;
      if (T.shade > 1.2) tutNext();
      break;
    case 2:
      if (!T.dew) { const s = freeSpot(110, true) || { x: 60, y: 60 }; T.dew = { x: s.x, y: s.y, life: 1e9 }; S.dews.push(T.dew); }
      T.target = T.dew;
      if (T.dew.life <= 0) { T.dew = null; tutNext(); }
      break;
    case 3:
      if ((P.stats.dashes || 0) > T.d0) tutNext();
      break;
    case 4:
      if (!T.bug || T.bug.life <= 0) {
        if ((P.stats.bugsDashed || 0) > T.b0) { T.bug = null; tutNext(); break; }
        const e = edgePoint(); T.bug = { x: e.x, y: e.y, life: 1e9, ph: 1, tame: true }; S.bugs.push(T.bug);
      }
      T.target = T.bug;
      break;
    case 5:
      if (S.run.jumps > T.j0) tutNext();
      break;
    case 6:
      // Eine langsame Lichtkugel nach der anderen, jeweils von einer Seite auf die Figur gezielt
      T.shotIn = (T.shotIn ?? 0.8) - dt;
      if (T.shotIn <= 0 && !S.shots.some(q => !q.ref)) {
        const e = edgePoint(), dx = S.p.x - e.x, dy = S.p.y - e.y, d = Math.hypot(dx, dy) || 1;
        S.shots.push({ x: e.x, y: e.y, vx: dx / d * 120, vy: dy / d * 120, life: 8 });
        T.shotIn = 1;
      }
      if (S.run.parries - T.p0 >= 2) { S.shots = []; tutNext(); }
      break;
    case 7:
      if (!T.boss) {
        T.boss = true;
        spawnBoss(BOSSES[0]);
        Object.assign(S.boss, { hp: 2, maxHp: 2, time: Infinity, maxTime: Infinity, tame: true });
      }
      T.target = S.boss;
      if (!S.boss && S.pickT > 0) tutNext();
      break;
    case 8:
      if (S.upList.length) tutNext();
      break;
    case 9:
      if (T.t > 3.2) tutFinish(false);
      break;
  }
}
function wrapText(text, maxW) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function tutDraw() {
  const T = S.tut;
  if (!T || S.mode === 'ready') return;
  // Zeiger aufs Ziel
  const tg = T.target;
  if (tg && S.mode === 'play') {
    const pulse = 0.5 + 0.5 * Math.sin(S.t * 6);
    ctx.strokeStyle = 'rgba(244,207,99,' + (0.55 + pulse * 0.4) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(tg.x, tg.y, 18 + pulse * 6 + (tg === S.boss ? 16 : 0), 0, TAU); ctx.stroke();
    const dx = tg.x - S.p.x, dy = tg.y - S.p.y, d = Math.hypot(dx, dy);
    if (d > 60) {
      const ux = dx / d, uy = dy / d, ax = S.p.x + ux * 30, ay = S.p.y + uy * 30;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(uy, ux));
      ctx.fillStyle = COL.gold; ctx.strokeStyle = COL.body; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -7); ctx.lineTo(-1, 0); ctx.lineTo(-4, 7); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.restore();
    }
  }
  if (T.step === 0 && S.mode === 'play') {
    ctx.fillStyle = 'rgba(244,207,99,' + (0.5 + 0.4 * Math.sin(S.t * 5)) + ')';
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.translate(S.p.x, S.p.y); ctx.rotate(i * Math.PI / 2); ctx.translate(26 + Math.sin(S.t * 5) * 2, 0);
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-2, -5); ctx.lineTo(-2, 5); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  // Hinweisfeld
  const pw = 400, px = (W - pw) / 2, py = S.boss ? 52 : 38;
  ctx.font = '700 15px "Atkinson Hyperlegible", "Segoe UI", sans-serif';
  const txt = TUT_STEPS[T.step];
  const lines = wrapText(tr(txt[0], txt[1]), pw - 36);
  const ph = 36 + lines.length * 20;
  ctx.fillStyle = 'rgba(20,24,33,.9)'; ctx.strokeStyle = COL.gold; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#98A1B4'; ctx.font = '700 10px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
  ctx.fillText(tr('TUTORIAL · SCHRITT ', 'TUTORIAL · STEP ') + (T.step + 1) + '/' + TUT_STEPS.length, px + 18, py + 20);
  for (let i = 0; i < TUT_STEPS.length; i++) {
    ctx.fillStyle = i < T.step ? COL.gold : i === T.step ? '#FFFFFF' : 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.arc(px + pw - 18 - (TUT_STEPS.length - 1 - i) * 11, py + 17, 3, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#F2F4F8'; ctx.font = '700 15px "Atkinson Hyperlegible", "Segoe UI", sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, px + 18, py + 42 + i * 20));
}
