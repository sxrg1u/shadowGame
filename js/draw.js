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
function shadeRegion(build, alpha) {
  ctx.save(); ctx.globalAlpha = alpha ?? 1; ctx.beginPath(); build(); ctx.clip();
  ctx.fillStyle = COL.shade; ctx.fillRect(0, 0, W, H);
  tiles(COL.shadeTile);
  ctx.restore();
}
function pillarShadows(az) {
  const d = dirOf(az), L = shadowLen(), vx = d.x * L, vy = d.y * L;
  return () => {
    for (const r of S.pillars) {
      if (r.glass > 0) continue;
      const c = pillarOutline(r);
      const h = hull(c.concat(c.map(q => [q[0] + vx, q[1] + vy])));
      ctx.moveTo(h[0][0], h[0][1]);
      for (let i = 1; i < h.length; i++) ctx.lineTo(h[i][0], h[i][1]);
      ctx.closePath();
    }
  };
}
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

function draw() {
  const flashes = P.settings.flashes;
  ctx.save();
  if (S.shake > 0 && P.settings.shake) ctx.translate(fx(-1, 1) * S.shake * 9, fx(-1, 1) * S.shake * 9);
  if (S.map.dark) {
    ctx.fillStyle = COL.shade; ctx.fillRect(-10, -10, W + 20, H + 20);
    tiles(COL.shadeTile);
    drawTorchLight();
  } else {
    ctx.fillStyle = COL.lit; ctx.fillRect(-10, -10, W + 20, H + 20);
    tiles(COL.tile);
    if (sun2On()) { shadeRegion(pillarShadows(S.az), 0.5); shadeRegion(pillarShadows(az2()), 0.5); }
    else shadeRegion(pillarShadows(S.az), 1);
    if (S.clouds.length) shadeRegion(() => { for (const c of S.clouds) { ctx.moveTo(c.x + c.rx, c.y); ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, TAU); } });
  }
  drawDeco();
  if (S.puddles.length) shadeRegion(() => {
    for (const q of S.puddles) {
      const max = q.max || 8, r = q.r * Math.min(1, (max - q.life) * 4) * Math.min(1, q.life);
      if (r > 0.5) { ctx.moveTo(q.x + r, q.y); ctx.arc(q.x, q.y, r, 0, TAU); }
    }
  });

  // Honig
  for (const h of S.honey) {
    ctx.globalAlpha = Math.min(1, h.life) * 0.85;
    ctx.fillStyle = COL.honey;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU, rr = h.r * (0.85 + 0.15 * Math.sin(i * 2.3 + h.x)); ctx.lineTo(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr * 0.8); }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(h.x - h.r * 0.3, h.y - h.r * 0.25, h.r * 0.25, h.r * 0.12, -0.4, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Heiße Fliesen
  for (const h of S.hot) {
    const x = h.gx * CELL, y = h.gy * CELL;
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
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(S.t * 3);
      ctx.globalAlpha = Pp.life < 2 && Math.floor(Pp.life * 8) % 2 === 0 ? 0.3 : 1;
      ctx.scale(1.3, 1.3); icon(ctx, 'portal'); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Brennglas
  if (S.lens) {
    const Ln = S.lens, a = Ln.warn > 0 ? 0.35 + 0.3 * Math.sin(S.t * 20) : Math.min(1, Ln.life);
    ctx.globalAlpha = a;
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
  for (const m of S.meteors) {
    const k = Math.max(0, Math.min(1, m.warn / 1.3));
    ctx.strokeStyle = COL.warn; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(232,102,79,.25)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * (1 - k), 0, TAU); ctx.fill();
  }

  // Tau und Hilfsmittel
  for (const w of S.dews) { ctx.globalAlpha = Math.min(1, w.life); dropShape(ctx, w.x, w.y, 1 + Math.sin(S.t * 6 + w.x) * 0.12, COL.dew); }
  ctx.globalAlpha = 1;
  for (const it of S.items) {
    if (it.life < 2 && Math.floor(it.life * 8) % 2 === 0) continue;
    const bob = Math.sin(S.t * 4 + it.x) * 2;
    ctx.fillStyle = 'rgba(20,24,33,.25)'; ctx.beginPath(); ctx.ellipse(it.x, it.y + 12, 9, 3, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(it.x, it.y + bob); icon(ctx, it.kind); ctx.restore();
  }

  // Säulen
  for (const r of S.pillars) drawPillar(r);
  drawTorches();

  // Aura des Schattenfressers und Lichtflecken des Nachtmahrs
  const E = eaterAura();
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
  for (const sp of S.spots) {
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
  for (const L of S.lasers) {
    const len = L.warn > 0 ? L.len : rayLen(L.x, L.y, L.a, L.len);
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
  for (const q of S.parts) {
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
    drawCreature(ctx, O.dx, O.dy, PR, { skin: O.skin, hat: O.hat, t: S.t + 1.3, alpha: 0.42, eyeAlpha: 0.6 });
    ctx.globalAlpha = 0.85;
    textOut(O.name, O.dx, O.dy - 24, '#E9E3FF', '700 10px "JetBrains Mono", monospace', 'center');
    ctx.globalAlpha = 1;
  }

  // Spielfigur
  if (S.mode !== 'ready') {
    const p = S.p, R = pr();
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
    drawCreature(ctx, p.x, p.y, R, { skin: P.equip.skin, hat: P.equip.hat, t: S.t, alpha, eyeAlpha: 1,
      tint: on('invert') ? COL.shroom : null, eyes: S.burn > 0 ? 'burn' : on('invert') ? 'dizzy' : S.mode === 'over' && S.won ? 'happy' : 'open' });
  }

  // Käfer
  for (const b of S.bugs) {
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
  for (const g of S.magpies) {
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
    ctx.save(); ctx.translate(D.x, D.y + Math.sin(S.t * 6) * 1.5);
    if (D.life < 1.5 && Math.floor(D.life * 10) % 2) ctx.globalAlpha = 0.3;
    ctx.scale(0.95, 0.95); icon(ctx, 'decoy'); ctx.restore(); ctx.globalAlpha = 1;
  }

  // Sägeblätter
  for (const s of S.saws) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(S.t * 14);
    if (s.life < 1) ctx.globalAlpha = s.life;
    ctx.scale(1.1, 1.1); icon(ctx, 'saw'); ctx.restore(); ctx.globalAlpha = 1;
  }

  // Suchraketen
  for (const m of S.missiles) {
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a + 0.6);
    icon(ctx, 'missile'); ctx.restore();
  }

  // Lichtkugeln
  for (const s of S.shots) {
    ctx.fillStyle = 'rgba(255,227,107,.45)'; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFF6D0'; ctx.strokeStyle = COL.sun; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, TAU); ctx.fill(); ctx.stroke();
  }

  // Boss
  if (S.boss) {
    const B = S.boss;
    if (B.state === 'aim' && B.enter <= 0) {
      ctx.strokeStyle = 'rgba(232,64,64,' + (0.4 + 0.4 * Math.sin(S.t * 25)) + ')'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
      ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(B.tx, B.ty); ctx.stroke(); ctx.setLineDash([]);
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
  for (const m of S.meteors) {
    if (m.warn > 0.8) continue;
    const k = m.warn / 0.8, mx = m.x + 160 * k, my = m.y - 220 * k;
    ctx.strokeStyle = 'rgba(255,176,32,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 24, my - 32); ctx.stroke();
    ctx.fillStyle = COL.hot; ctx.beginPath(); ctx.arc(mx, my, 7, 0, TAU); ctx.fill();
  }

  // Wolken
  const d = dirOf(S.az);
  for (const c of S.clouds) {
    const cx = c.x - d.x * 26, cy = c.y - d.y * 26;
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, c.rx * 0.75, c.ry * 0.7, 0, 0, TAU);
    ctx.ellipse(cx - c.rx * 0.45, cy + 4, c.rx * 0.45, c.ry * 0.5, 0, 0, TAU);
    ctx.ellipse(cx + c.rx * 0.45, cy + 2, c.rx * 0.5, c.ry * 0.55, 0, 0, TAU);
    ctx.fill();
  }

  // Sonne(n)
  if (!on('eclipse') && !S.map.dark && !duskDark()) { drawSun(S.az, on('noon') ? 1.6 : 1); if (sun2On()) drawSun(az2(), 1); }
  if (duskDark()) drawDarkness();

  // Überblendungen
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
    textOut(tr('Stufe ', 'Level ') + (S.level + 1) + tag, 12, 22, COL.white, MONO);
    if (S.energy < 20) textOut(tr('Letzte Kraft: Zeitlupe', 'Last stand: slow motion'), W - 12, H - 32, COL.warn, MONO, 'right');
    const ready = S.charges > 0;
    textOut(ready ? (maxCharges() > 1 ? 'Dash ×' + S.charges : tr('Dash bereit', 'Dash ready')) : 'Dash ' + S.dashCd.toFixed(1) + ' s', W - 12, H - 14, ready ? '#FFFFFF' : '#98A1B4', MONO, 'right');
    if (S.boss) {
      const B = S.boss, bw = 220, bx = (W - bw) / 2, by = 30;
      textOut(bossLabel(B.type) + (B.state === 'stun' ? tr(' · benommen', ' · dazed') : ''), W / 2, 24, '#F4CF63', '800 12px "Unbounded", "Arial Black", sans-serif', 'center');
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
                  dashy: [tr('Dauerdash', 'Dash frenzy'), '#3FC7C4'], spikes: [tr('Stacheln', 'Spikes'), '#B8C0CF'] };
    for (const k in lab) if (on(k)) list.push([lab[k][0] + ' ' + S.E[k].toFixed(1) + ' s', lab[k][1]]);
    if (S.bubble > 0) list.push([tr('Schild ×', 'Shield ×') + S.bubble, '#6FC3FF']);
    if (S.decoy) list.push([tr('Klon ', 'Clone ') + S.decoy.life.toFixed(1) + ' s', '#C9B8FF']);
    if (S.lucky > 0) list.push([tr('Glück ×', 'Luck ×') + S.lucky, '#5FBE90']);
    if (S.combo > 1) list.push([tr('Kombo ×', 'Combo ×') + S.combo, COL.dew]);
    list.forEach((f, i) => textOut(f[0], 12, H - 14 - i * 18, f[1], MONO));
  }
  if (S.mode === 'count') {
    const n = Math.ceil(S.countT), k = S.countT - Math.floor(S.countT);
    ctx.globalAlpha = 0.35 + 0.65 * k;
    textOut(n > 0 ? String(n) : tr('LOS!', 'GO!'), W / 2, H / 2 + 26, '#F4CF63', '800 ' + Math.round(56 + (1 - k) * 18) + 'px "Unbounded", "Arial Black", sans-serif', 'center');
    ctx.globalAlpha = 1;
    textOut(tr('Duell gegen ', 'Duel against ') + (Net.opp ? Net.opp.name : '…'), W / 2, H / 2 - 50, '#FFFFFF', '800 15px "Unbounded", "Arial Black", sans-serif', 'center');
  }
  if (S.msg) {
    ctx.globalAlpha = Math.min(1, S.msg.t * 2);
    textOut(S.msg.text, W / 2, S.boss && S.mode === 'play' ? 72 : 56, S.msg.color, '800 18px "Unbounded", "Arial Black", sans-serif', 'center');
    ctx.globalAlpha = 1;
  }
  if (S.banner) {
    const b = S.banner, k = Math.min(1, b.t * 2, (2.2 - b.t) * 6);
    ctx.globalAlpha = Math.max(0, k);
    ctx.fillStyle = 'rgba(20,24,33,.85)'; ctx.fillRect(0, H / 2 - 38, W, 64);
    ctx.fillStyle = b.good ? '#5FBE90' : COL.warn; ctx.fillRect(0, H / 2 - 38, W, 3); ctx.fillRect(0, H / 2 + 23, W, 3);
    textOut(b.head || tr('CHAOS-RAD', 'CHAOS WHEEL'), W / 2, H / 2 - 16, '#98A1B4', '700 11px "JetBrains Mono", monospace', 'center');
    textOut(b.text, W / 2, H / 2 + 12, b.good ? '#5FBE90' : '#F4CF63', '800 24px "Unbounded", "Arial Black", sans-serif', 'center');
    ctx.globalAlpha = 1;
  }
  if (S.cfg.mode === 'tutorial') tutDraw();
}
