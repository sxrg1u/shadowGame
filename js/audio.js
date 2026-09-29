'use strict';
// ---------- Sound und Musik (Web Audio, alles synthetisch) ----------
const Sound = (() => {
  let ac = null, musG, sfxG, nbuf, cur = null, want = null, step = 0, nextT = 0, level = 0;
  const lastPlay = {};
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ac = new AC(); } catch (e) { return; }
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
      const master = ac.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ac.destination);
      musG = ac.createGain(); sfxG = ac.createGain(); musG.gain.value = 0; sfxG.gain.value = 0;
      musG.connect(master); sfxG.connect(master);
      nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      volumes();
      setInterval(sched, 25);
      if (want) { const w = want; want = null; music(w); }
    }
    if (ac.state === 'suspended') ac.resume();
  }
  function volumes() {
    if (!ac) return;
    const s = P.settings, m = s.muted ? 0 : 1;
    musG.gain.setTargetAtTime(s.music * 0.5 * m, ac.currentTime, 0.05);
    sfxG.gain.setTargetAtTime(s.sfx * 0.9 * m, ac.currentTime, 0.05);
  }
  function env(g, t0, v, a, d) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(d, a + 0.01));
  }
  function tone(o) {
    const t0 = o.at ?? (ac.currentTime + (o.t || 0));
    const osc = ac.createOscillator(); osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.gl || o.d));
    if (o.det) osc.detune.setValueAtTime(o.det, t0);
    const g = ac.createGain(); env(g, t0, o.v ?? 0.2, o.a ?? 0.005, o.d);
    let n = osc;
    if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t0); f.Q.value = o.q ?? 0.7; osc.connect(f); n = f; }
    n.connect(g); g.connect(o.bus || sfxG);
    osc.start(t0); osc.stop(t0 + o.d + 0.05);
  }
  function noise(o) {
    const t0 = o.at ?? (ac.currentTime + (o.t || 0));
    const src = ac.createBufferSource(); src.buffer = nbuf;
    const f = ac.createBiquadFilter(); f.type = o.ft || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1200, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.d);
    f.Q.value = o.q ?? 1;
    const g = ac.createGain(); env(g, t0, o.v ?? 0.2, o.a ?? 0.003, o.d);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxG);
    src.start(t0, Math.random() * 1.2); src.stop(t0 + o.d + 0.05);
  }
  const arp = (notes, gap, o) => notes.forEach((n, i) => tone({ f: mtof(n), t: i * gap, ...o }));
  const FX = {
    click() { tone({ f: 760, type: 'triangle', d: 0.07, v: 0.1 }); },
    deny() { tone({ f: 220, to: 150, type: 'square', d: 0.16, v: 0.07, lp: 900 }); },
    dash() { noise({ f: 500, to: 3200, d: 0.2, v: 0.26, q: 1.2 }); tone({ f: 260, to: 720, type: 'sine', d: 0.16, v: 0.07 }); },
    dew(c) { const n = [79, 81, 83, 86, 88, 91, 93, 95][Math.min(7, (c || 1) - 1)]; tone({ f: mtof(n), type: 'triangle', d: 0.2, v: 0.13 }); tone({ f: mtof(n + 12), type: 'sine', d: 0.25, v: 0.05, t: 0.05 }); },
    gold() { arp([84, 88, 91, 96], 0.05, { type: 'triangle', d: 0.18, v: 0.11 }); },
    pickup() { tone({ f: 523, to: 1046, type: 'square', d: 0.14, v: 0.06, lp: 2400 }); tone({ f: 1568, type: 'sine', d: 0.18, v: 0.05, t: 0.07 }); },
    trap() { tone({ f: 420, to: 110, type: 'sawtooth', d: 0.35, v: 0.09, lp: 1400 }); tone({ f: 440, to: 115, type: 'sawtooth', d: 0.35, v: 0.05, lp: 1400, det: 30 }); },
    hurt() { tone({ f: 200, to: 60, type: 'square', d: 0.22, v: 0.14, lp: 900 }); noise({ ft: 'lowpass', f: 600, d: 0.14, v: 0.22 }); },
    block() { tone({ f: 1320, to: 880, type: 'sine', d: 0.22, v: 0.11 }); tone({ f: 1980, type: 'sine', d: 0.1, v: 0.05 }); },
    boss() { tone({ f: 55, type: 'sawtooth', d: 1.1, v: 0.16, lp: 500, a: 0.05 }); tone({ f: 58.3, type: 'sawtooth', d: 1.1, v: 0.12, lp: 500, a: 0.05 }); tone({ f: 110, to: 82, type: 'square', d: 0.9, v: 0.05, lp: 700, t: 0.15 }); noise({ ft: 'lowpass', f: 300, d: 0.7, v: 0.28 }); },
    bossHit() { tone({ f: 520, to: 140, type: 'square', d: 0.16, v: 0.12, lp: 2000 }); noise({ f: 2400, d: 0.08, v: 0.18, q: 2 }); },
    bossDown() { noise({ ft: 'lowpass', f: 1400, to: 80, d: 0.9, v: 0.42 }); tone({ f: 110, to: 40, type: 'sine', d: 0.6, v: 0.28 }); arp([72, 76, 79, 84, 88], 0.08, { type: 'triangle', d: 0.3, v: 0.11, t: 0.25 }); },
    phase() { tone({ f: 70, to: 140, type: 'sawtooth', d: 0.6, v: 0.12, lp: 900 }); noise({ ft: 'lowpass', f: 900, to: 150, d: 0.5, v: 0.25 }); },
    level() { arp([72, 79, 84], 0.07, { type: 'sine', d: 0.2, v: 0.09 }); },
    wheel(good) {
      for (let i = 0; i < 6; i++) noise({ ft: 'highpass', f: 5000, d: 0.03, v: 0.09, t: i * 0.045 + i * i * 0.006 });
      if (good) arp([79, 83, 86], 0.08, { type: 'triangle', d: 0.3, v: 0.11, t: 0.42 });
      else { tone({ f: mtof(63), to: mtof(58), type: 'sawtooth', d: 0.45, v: 0.08, lp: 1600, t: 0.42 }); tone({ f: mtof(57), to: mtof(52), type: 'sawtooth', d: 0.45, v: 0.06, lp: 1600, t: 0.42 }); }
    },
    laser() { tone({ f: 1800, to: 260, type: 'sawtooth', d: 0.28, v: 0.05, lp: 3500 }); },
    boom(big) { noise({ ft: 'lowpass', f: big ? 1600 : 1000, to: 70, d: big ? 0.8 : 0.45, v: big ? 0.42 : 0.28 }); tone({ f: 95, to: 38, type: 'sine', d: 0.4, v: big ? 0.28 : 0.18 }); },
    revive() { arp([60, 64, 67, 72, 76, 79], 0.06, { type: 'sine', d: 0.3, v: 0.1 }); },
    over() { arp([67, 63, 60, 55], 0.22, { type: 'triangle', d: 0.4, v: 0.12 }); tone({ f: mtof(43), type: 'sine', d: 1.2, v: 0.14, t: 0.66 }); },
    victory() {
      [[72, 0, 0.15], [72, 0.15, 0.15], [72, 0.3, 0.15], [76, 0.45, 0.45], [74, 0.9, 0.15], [77, 1.05, 0.15], [76, 1.2, 0.15], [79, 1.35, 0.8]].forEach(([n, t, d]) => {
        tone({ f: mtof(n), type: 'square', d: d + 0.05, v: 0.06, lp: 2600, t }); tone({ f: mtof(n - 12), type: 'triangle', d: d + 0.05, v: 0.08, t });
      });
    },
    card() { tone({ f: 880, type: 'sine', d: 0.18, v: 0.09 }); tone({ f: 1320, type: 'sine', d: 0.25, v: 0.06, t: 0.06 }); },
    deal() { for (let i = 0; i < 3; i++) noise({ f: 2500, to: 1200, d: 0.07, v: 0.08, q: 0.8, t: i * 0.07 }); },
    ach() { [79, 84, 88, 91].forEach((n, i) => { tone({ f: mtof(n), type: 'sine', d: 0.5, v: 0.07, t: i * 0.09 }); tone({ f: mtof(n + 12), type: 'triangle', d: 0.25, v: 0.025, t: i * 0.09 }); }); },
    buy() { arp([76, 80, 83, 88], 0.06, { type: 'triangle', d: 0.25, v: 0.1 }); },
    beat() { tone({ f: 62, to: 45, type: 'sine', d: 0.14, v: 0.32 }); tone({ f: 58, to: 42, type: 'sine', d: 0.14, v: 0.22, t: 0.17 }); },
    sizzle() { noise({ ft: 'highpass', f: 4500, d: 0.16, v: 0.045 }); },
    count() { tone({ f: 440, type: 'square', d: 0.12, v: 0.07, lp: 2000 }); },
    go() { tone({ f: 880, type: 'square', d: 0.3, v: 0.08, lp: 2600 }); },
    alarm() { for (let i = 0; i < 3; i++) { tone({ f: 988, type: 'square', d: 0.09, v: 0.05, lp: 2500, t: i * 0.2 }); tone({ f: 740, type: 'square', d: 0.09, v: 0.05, lp: 2500, t: i * 0.2 + 0.1 }); } },
    portal() { tone({ f: 300, to: 1400, type: 'sine', d: 0.25, v: 0.11 }); tone({ f: 1400, to: 300, type: 'sine', d: 0.25, v: 0.05, t: 0.1 }); },
    thunder() { noise({ ft: 'lowpass', f: 3000, to: 100, d: 0.7, v: 0.42 }); tone({ f: 70, to: 35, type: 'sawtooth', d: 0.5, v: 0.1, lp: 300 }); },
    chirp() { tone({ f: 2100, to: 2700, type: 'sine', d: 0.06, v: 0.05 }); tone({ f: 2300, to: 2900, type: 'sine', d: 0.06, v: 0.05, t: 0.08 }); },
    flash() { noise({ ft: 'highpass', f: 2000, d: 0.35, v: 0.18 }); tone({ f: 2400, to: 1200, type: 'sine', d: 0.3, v: 0.04 }); },
    join() { arp([67, 72, 76], 0.07, { type: 'triangle', d: 0.2, v: 0.09 }); },
    heal() { tone({ f: 660, to: 990, type: 'sine', d: 0.2, v: 0.08 }); },
    pop() { noise({ f: 3000, d: 0.05, v: 0.14, q: 2 }); tone({ f: 900, to: 300, type: 'triangle', d: 0.09, v: 0.08 }); },
  };
  const GAP = { laser: 0.12, hurt: 0.1, sizzle: 0.35, dew: 0.03, boom: 0.06, click: 0.03, bossHit: 0.05, block: 0.08, chirp: 0.3, pickup: 0.05 };
  function sfx(name, arg) {
    if (!ac || ac.state !== 'running' || P.settings.muted || !P.settings.sfx) return;
    const now = ac.currentTime;
    if (GAP[name] && lastPlay[name] && now - lastPlay[name] < GAP[name]) return;
    lastPlay[name] = now;
    try { FX[name](arg); } catch (e) {}
  }

  // ---------- Musik: kleiner Sequencer mit drei Stücken ----------
  const CH = { m: [0, 3, 7], M: [0, 4, 7] };
  const kick = t => tone({ at: t, f: 150, to: 45, gl: 0.12, type: 'sine', d: 0.22, v: 0.45, bus: musG });
  const snare = (t, v) => { noise({ at: t, f: 1800, d: 0.14, v, q: 0.8, bus: musG }); tone({ at: t, f: 220, to: 160, type: 'triangle', d: 0.08, v: v * 0.4, bus: musG }); };
  const hat = (t, v) => noise({ at: t, ft: 'highpass', f: 7000, d: 0.04, v, bus: musG });
  const MEL = [
    { 0: [76, 3], 4: [72, 2], 6: [74, 2], 8: [76, 4], 12: [81, 2], 14: [79, 2] },
    { 0: [77, 4], 4: [76, 2], 6: [72, 2], 8: [69, 6] },
    { 0: [79, 3], 4: [76, 2], 6: [79, 2], 8: [84, 4], 12: [83, 2], 14: [79, 2] },
    { 0: [74, 4], 4: [71, 2], 6: [74, 2], 8: [79, 6] },
  ];
  const TR = {
    menu: { bpm: 80, step(i, t, sd) {
      const bar = (i >> 4) & 3, s = i & 15;
      const c = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [52, 55, 59, 62]][bar];
      if (s === 0) { for (const n of c) tone({ at: t, f: mtof(n), type: 'sine', d: sd * 16, v: 0.03, a: 0.5, bus: musG }); tone({ at: t, f: mtof(c[0] - 12), type: 'triangle', d: sd * 8, v: 0.08, a: 0.02, bus: musG }); }
      if (s === 10) tone({ at: t, f: mtof(c[0] - 12), type: 'triangle', d: sd * 5, v: 0.06, bus: musG });
      if (s % 2 === 0) { const n = c[[0, 1, 2, 3, 2, 1, 3, 2][(s / 2) % 8]] + 12; tone({ at: t, f: mtof(n), type: 'triangle', d: sd * 2.5, v: 0.04, bus: musG }); }
      if (s === 6 || s === 14) hat(t, 0.018);
    } },
    game: { bpm: 108, ramp: 1.5, step(i, t, sd, lv) {
      const bar = (i >> 4) & 3, s = i & 15, loop = i >> 6;
      const r = [45, 41, 48, 43][bar], tri = [CH.m, CH.M, CH.M, CH.M][bar];
      if (s === 0 || s === 8 || (lv >= 3 && s === 11)) kick(t);
      if (s === 4 || s === 12) snare(t, 0.14);
      if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.05 : 0.03); else if (lv >= 5) hat(t, 0.018);
      if ([1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0][s]) tone({ at: t, f: mtof(r + (s === 8 || s === 14 ? 12 : 0)), type: 'square', d: sd * 1.8, v: 0.08, lp: 420 + Math.min(lv, 10) * 30, bus: musG });
      if (s % 2 === 0) tone({ at: t, f: mtof(r + 24 + [tri[0], tri[1], tri[2], 12][(s / 2) % 4]), type: 'triangle', d: sd * 1.8, v: 0.04, bus: musG });
      if (loop % 2 === 1 || lv >= 4) { const m = MEL[bar][s]; if (m) tone({ at: t, f: mtof(m[0]), type: 'square', d: sd * m[1], v: 0.035, lp: 2200, bus: musG }); }
    } },
    boss: { bpm: 138, step(i, t, sd) {
      const bar = (i >> 4) & 3, s = i & 15;
      const r = [40, 41, 40, 38][bar], tri = [CH.m, CH.M, CH.m, CH.M][bar];
      if (s % 4 === 0) kick(t);
      if (s === 4 || s === 12) snare(t, 0.18);
      hat(t, s % 2 ? 0.02 : 0.045);
      tone({ at: t, f: mtof(r + (s % 2 ? 12 : 0)), type: 'sawtooth', d: sd * 0.9, v: 0.055, lp: 650, bus: musG });
      if (s % 2 === 0) tone({ at: t, f: mtof(r + 36 + tri[(s / 2) % 3]), type: 'square', d: sd * 0.9, v: 0.022, lp: 3000, bus: musG });
      if (s === 0) for (const k of tri) tone({ at: t, f: mtof(r + 24 + k), type: 'sawtooth', d: sd * 3, v: 0.028, lp: 1800, bus: musG });
    } },
  };
  function sched() {
    if (!ac || !cur || ac.state !== 'running') return;
    const tr = TR[cur], sd = 60 / (tr.bpm + (tr.ramp ? Math.min(level, 16) * tr.ramp : 0)) / 4;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.12) { try { tr.step(step, nextT, sd, level); } catch (e) {} nextT += sd; step++; }
  }
  function music(name) {
    if (!ac) { want = name; return; }
    if (cur === name) return;
    cur = name; step = 0; nextT = ac.currentTime + 0.08;
  }
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });
  return { init, sfx, music, volumes, setLevel: l => { level = l; } };
})();
