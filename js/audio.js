'use strict';
// ---------- Sound und Musik ----------
// Alles wird mit der Web Audio API erzeugt. Liegen echte Musikdateien in assets/music/ und stehen in tracks.json,
// spielt das Spiel diese stattdessen ab (nur wenn die Seite über http(s) läuft, z. B. auf GitHub Pages).
const Sound = (() => {
  let ac = null, musG, sfxG, fileG, leadBus, nbuf, cur = null, want = null, step = 0, nextT = 0, level = 0;
  let fileNow = null, fileSrc = null;
  const buffers = {}, lastPlay = {};
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function impulse(sec, decay) {
    const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function init() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ac = new AC(); } catch (e) { return; }
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
      const master = ac.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ac.destination);
      // Hall für Musik und (weniger) für Effekte
      const verb = ac.createConvolver(); verb.buffer = impulse(2.4, 3.2);
      const verbOut = ac.createGain(); verbOut.gain.value = 0.9; verb.connect(verbOut); verbOut.connect(master);
      musG = ac.createGain(); sfxG = ac.createGain(); fileG = ac.createGain();
      musG.gain.value = sfxG.gain.value = fileG.gain.value = 0;
      musG.connect(master); sfxG.connect(master); fileG.connect(master);
      const musSend = ac.createGain(); musSend.gain.value = 0.32; musG.connect(musSend); musSend.connect(verb);
      const sfxSend = ac.createGain(); sfxSend.gain.value = 0.12; sfxG.connect(sfxSend); sfxSend.connect(verb);
      // Echo für Melodien
      leadBus = ac.createGain(); leadBus.connect(musG);
      const dly = ac.createDelay(1); dly.delayTime.value = 0.33;
      const fb = ac.createGain(); fb.gain.value = 0.32;
      const dlyF = ac.createBiquadFilter(); dlyF.type = 'lowpass'; dlyF.frequency.value = 2600;
      leadBus.connect(dly); dly.connect(dlyF); dlyF.connect(fb); fb.connect(dly); dlyF.connect(musG);
      nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      volumes();
      setInterval(sched, 25);
      loadFiles();
      if (want) { const w = want; want = null; music(w); }
    }
    if (ac.state === 'suspended') ac.resume();
  }
  function volumes() {
    if (!ac) return;
    const s = P.settings, m = s.muted ? 0 : 1;
    musG.gain.setTargetAtTime(s.music * 0.5 * m, ac.currentTime, 0.05);
    fileG.gain.setTargetAtTime(s.music * 0.8 * m, ac.currentTime, 0.05);
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
    let lfo = null;
    if (o.vib) { lfo = ac.createOscillator(); lfo.frequency.value = 5.2; const lg = ac.createGain(); lg.gain.value = o.f * 0.012; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0 + 0.12); lfo.stop(t0 + o.d + 0.05); }
    const g = ac.createGain(); env(g, t0, o.v ?? 0.2, o.a ?? 0.005, o.d);
    let n = osc;
    if (o.lp) {
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t0); f.Q.value = o.q ?? 0.7;
      if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t0 + o.d);
      osc.connect(f); n = f;
    }
    n.connect(g); g.connect(o.bus || sfxG);
    osc.start(t0); osc.stop(t0 + o.d + 0.05);
  }
  function noise(o) {
    const t0 = o.at ?? (ac.currentTime + (o.t || 0));
    const src = ac.createBufferSource(); src.buffer = nbuf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.ft || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1200, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.gl || o.d));
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
    anchor() { tone({ f: 180, to: 90, type: 'sine', d: 0.3, v: 0.14 }); tone({ f: 720, type: 'triangle', d: 0.12, v: 0.05, t: 0.04 }); },
    parryUp() { noise({ ft: 'highpass', f: 5000, d: 0.06, v: 0.08 }); tone({ f: 1100, type: 'triangle', d: 0.06, v: 0.05 }); },
    parry() { tone({ f: 1760, to: 2640, type: 'triangle', d: 0.14, v: 0.12 }); tone({ f: 880, type: 'sine', d: 0.3, v: 0.08 }); noise({ f: 6000, d: 0.05, v: 0.12, q: 3 }); },
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
    gulpWarn() { tone({ f: 120, to: 260, type: 'sawtooth', d: 0.8, v: 0.07, lp: 700, vib: true }); },
    gulp() { tone({ f: 190, to: 55, type: 'sine', d: 0.35, v: 0.3 }); noise({ ft: 'lowpass', f: 700, to: 120, d: 0.3, v: 0.2 }); },
    whoosh() { noise({ f: 350, to: 2200, gl: 0.25, d: 0.5, v: 0.14, q: 1.5 }); },
  };
  const GAP = { laser: 0.12, hurt: 0.1, sizzle: 0.35, dew: 0.03, boom: 0.06, click: 0.03, bossHit: 0.05, block: 0.08, parry: 0.05, deny: 0.15, chirp: 0.3, pickup: 0.05, pop: 0.03, whoosh: 0.1 };
  function sfx(name, arg) {
    if (!ac || ac.state !== 'running' || P.settings.muted || !P.settings.sfx) return;
    const now = ac.currentTime;
    if (GAP[name] && lastPlay[name] && now - lastPlay[name] < GAP[name]) return;
    lastPlay[name] = now;
    try { FX[name](arg); } catch (e) {}
  }


  // ---------- Musik: Sequencer mit Stücken für Menü, jede Karte, Bosse und Endboss ----------
  const CH = { m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11] };
  const M = () => musG;
  const kick = (t, v = 0.45) => tone({ at: t, f: 150, to: 42, gl: 0.12, type: 'sine', d: 0.24, v, bus: M() });
  const tom = (t, f, v = 0.3) => tone({ at: t, f, to: f * 0.55, gl: 0.2, type: 'sine', d: 0.3, v, bus: M() });
  const snare = (t, v) => { noise({ at: t, f: 1900, d: 0.16, v, q: 0.7, bus: M() }); tone({ at: t, f: 210, to: 150, type: 'triangle', d: 0.1, v: v * 0.45, bus: M() }); };
  const hat = (t, v, open) => noise({ at: t, ft: 'highpass', f: 7500, d: open ? 0.16 : 0.04, v, bus: M() });
  const rim = (t, v) => noise({ at: t, f: 3200, d: 0.03, v, q: 3, bus: M() });
  const bass = (t, n, d, v = 0.08, lp = 520, type = 'square') => tone({ at: t, f: mtof(n), type, d, v, lp, bus: M() });
  // Gezupft: Sägezahn mit schnell schließendem Filter
  const pluck = (t, n, d, v = 0.05, bus) => { tone({ at: t, f: mtof(n), type: 'sawtooth', d, v, lp: 3200, lpTo: 380, bus: bus || M() }); tone({ at: t, f: mtof(n), type: 'sawtooth', d, v: v * 0.6, det: 9, lp: 2800, lpTo: 360, bus: bus || M() }); };
  // Flächen: zwei leicht verstimmte Sägezähne, weich eingeblendet
  const pad = (t, notes, d, v = 0.018, lp = 1100) => { for (const n of notes) { tone({ at: t, f: mtof(n), type: 'sawtooth', d, v, a: Math.min(0.6, d * 0.3), lp, det: -8, bus: M() }); tone({ at: t, f: mtof(n), type: 'sawtooth', d, v, a: Math.min(0.6, d * 0.3), lp, det: 8, bus: M() }); } };
  const bell = (t, n, v = 0.04, bus) => { tone({ at: t, f: mtof(n), type: 'sine', d: 0.9, v, bus: bus || M() }); tone({ at: t, f: mtof(n) * 2.76, type: 'sine', d: 0.25, v: v * 0.35, bus: bus || M() }); };
  const lead = (t, n, d, v = 0.035, type = 'square', vib) => tone({ at: t, f: mtof(n), type, d, v, lp: type === 'square' ? 2400 : undefined, a: vib ? 0.04 : 0.008, vib, bus: leadBus });
  const MEL = [
    { 0: [76, 3], 4: [72, 2], 6: [74, 2], 8: [76, 4], 12: [81, 2], 14: [79, 2] },
    { 0: [77, 4], 4: [76, 2], 6: [72, 2], 8: [69, 6] },
    { 0: [79, 3], 4: [76, 2], 6: [79, 2], 8: [84, 4], 12: [83, 2], 14: [79, 2] },
    { 0: [74, 4], 4: [71, 2], 6: [74, 2], 8: [79, 6] },
  ];
  const GARDEN_MEL = [
    { 0: [79, 2], 2: [81, 2], 4: [84, 4], 10: [81, 2], 12: [79, 4] },
    { 0: [76, 4], 6: [79, 2], 8: [81, 6] },
    { 0: [84, 2], 2: [86, 2], 4: [88, 4], 10: [86, 2], 12: [84, 4] },
    { 0: [81, 3], 4: [79, 2], 6: [76, 2], 8: [79, 8] },
  ];
  const TR = {
    menu: { bpm: 76, step(i, t, sd) {
      const bar = (i >> 4) & 3, s = i & 15;
      const c = [[57, 60, 64, 67, 71], [53, 57, 60, 64], [48, 55, 59, 64], [55, 59, 62, 64]][bar];
      if (s === 0) { pad(t, c.slice(0, 4), sd * 16, 0.012, 900); bass(t, c[0] - 12, sd * 7, 0.07, 400, 'triangle'); }
      if (s === 8) bass(t, c[0] - 12, sd * 6, 0.05, 400, 'triangle');
      if (s % 2 === 0) bell(t, c[[0, 2, 1, 3, 2, 4 % c.length, 3, 1][(s / 2) % 8] % c.length] + 12, 0.028, leadBus);
      if (s % 4 === 2) hat(t, 0.012);
    } },
    yard: { bpm: 108, ramp: 1.5, step(i, t, sd, lv) {
      const bar = (i >> 4) & 3, s = i & 15, loop = i >> 6;
      const r = [45, 41, 48, 43][bar], tri = [CH.m, CH.M, CH.M, CH.M][bar];
      if (s === 0 || s === 8 || (lv >= 3 && s === 11)) kick(t);
      if (s === 4 || s === 12) snare(t, 0.13);
      if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.045 : 0.028, s === 14); else if (lv >= 5) hat(t, 0.016);
      if ([1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0][s]) bass(t, r + (s === 8 || s === 14 ? 12 : 0), sd * 1.8, 0.08, 420 + Math.min(lv, 10) * 30);
      if (s % 2 === 0) pluck(t, r + 24 + [tri[0], tri[1], tri[2], 12][(s / 2) % 4], sd * 2.2, 0.03);
      if (s === 0 && lv >= 2) pad(t, tri.map(k => r + 12 + k), sd * 15, 0.01, 800);
      if (loop % 2 === 1 || lv >= 4) { const m = MEL[bar][s]; if (m) lead(t, m[0], sd * m[1], 0.032); }
    } },
    garden: { bpm: 100, ramp: 1.2, step(i, t, sd, lv) {
      const bar = (i >> 4) & 3, s = i & 15, loop = i >> 6;
      const r = [48, 45, 41, 43][bar], tri = [CH.M, CH.m, CH.M, CH.M][bar];
      if (s === 0 || s === 10 || (lv >= 3 && s === 7)) kick(t, 0.35);
      if (s === 4 || s === 12) rim(t, 0.08);
      hat(t, s % 2 ? 0.012 : 0.022);
      if (s === 0 || s === 6 || s === 8 || s === 14) bass(t, r - 12 + (s === 8 ? 7 : 0), sd * 2.5, 0.07, 500, 'triangle');
      if ([1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1][s]) bell(t, r + 24 + [0, tri[1], 7, 12, 14][(s * 3) % 5], 0.024);
      if (s === 0) pad(t, tri.map(k => r + 12 + k), sd * 16, 0.009, 1300);
      if (loop % 2 === 1 || lv >= 3) { const m = GARDEN_MEL[bar][s]; if (m) lead(t, m[0], sd * m[1], 0.05, 'sine', true); }
    } },
    roof: { bpm: 112, ramp: 1.2, step(i, t, sd, lv) {
      const bar = (i >> 4) & 3, s = i & 15, loop = i >> 6;
      const r = [50, 55, 50, 48][bar], c = [[0, 3, 7, 10], [0, 4, 7, 9], [0, 3, 7, 10], [0, 4, 7, 11]][bar];
      if (s === 0 || (s === 10 && lv >= 2)) kick(t, 0.4);
      if (s === 8) snare(t, 0.15);
      if (s % 2 === 0) hat(t, 0.02, s === 6);
      if (bar === 0 && s === 0) noise({ at: t, f: 400, to: 2400, gl: sd * 16, d: sd * 30, v: 0.05, a: sd * 8, q: 3, bus: M() });
      if (s === 0) pad(t, c.map(k => r + 12 + k), sd * 16, 0.014, 1400);
      if (s % 2 === 0) pluck(t, r + 24 + [0, 7, 12, 14, 12, 7, 10, 7][(s / 2) % 8], sd * 1.6, 0.028);
      if (s === 0 || s === 3 || s === 8 || s === 11) bass(t, r - 12, sd * 2.4, 0.07, 480, 'sawtooth');
      if ((loop % 2 === 1 || lv >= 4) && s % 8 === 4) lead(t, r + 36 + c[(bar + s / 4) % 4], sd * 3.5, 0.03, 'triangle', true);
    } },
    cellar: { bpm: 88, ramp: 1, step(i, t, sd, lv) {
      const bar = (i >> 4) & 3, s = i & 15, loop = i >> 6;
      const r = [38, 34, 43, 45][bar], q = [CH.m, CH.M, CH.m, CH.M][bar];
      if (s === 0) { tone({ at: t, f: mtof(r - 12), type: 'sawtooth', d: sd * 16, v: 0.05, a: 0.4, lp: 260, bus: M() }); pad(t, q.map(k => r + 12 + k), sd * 16, 0.011, 700); }
      if (s === 0 || s === 6 || s === 10 || (lv >= 3 && s === 14)) tom(t, s === 0 ? 70 : 95, 0.28);
      if (s === 12) snare(t, 0.08);
      if (s % 4 === 2) hat(t, 0.01);
      const drip = [0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0][(s + bar * 5) % 16];
      if (drip) bell(t, r + 36 + [0, 3, 7, 10, 12][(s + bar) % 5], 0.02, leadBus);
      if (loop % 2 === 1 && s === 8) lead(t, r + 24 + q[1], sd * 7, 0.03, 'triangle', true);
    } },
    boss: { bpm: 138, step(i, t, sd) {
      const bar = (i >> 4) & 3, s = i & 15;
      const r = [40, 41, 40, 38][bar], tri = [CH.m, CH.M, CH.m, CH.M][bar];
      if (s % 4 === 0) kick(t);
      if (s === 4 || s === 12) snare(t, 0.17);
      hat(t, s % 2 ? 0.018 : 0.04);
      bass(t, r + (s % 2 ? 12 : 0), sd * 0.9, 0.055, 650, 'sawtooth');
      if (s % 2 === 0) pluck(t, r + 36 + tri[(s / 2) % 3], sd * 1.2, 0.022);
      if (s === 0) pad(t, tri.map(k => r + 24 + k), sd * 4, 0.02, 1800);
    } },
    final: { bpm: 150, step(i, t, sd) {
      const bar = (i >> 4) & 3, s = i & 15;
      const r = [40, 36, 45, 47][bar], tri = [CH.m, CH.M, CH.m, CH.M][bar];
      if (s % 4 === 0 || s === 14) kick(t, 0.5);
      if (s === 4 || s === 12 || (bar === 3 && s >= 13)) snare(t, 0.17);
      hat(t, s % 2 ? 0.022 : 0.045, s % 8 === 6);
      bass(t, r - 12 + (s % 4 === 3 ? 12 : 0), sd * 0.9, 0.06, 700, 'sawtooth');
      if (s === 0 || s === 8) pad(t, tri.map(k => r + 24 + k), sd * 7, 0.018, 2200);
      const hm = [0, 3, 7, 11, 12, 11, 7, 3];
      pluck(t, r + 36 + (bar === 3 ? [0, 4, 7, 11, 12, 11, 7, 4] : hm)[s % 8], sd * 0.9, 0.018);
      if (s % 8 === 0) lead(t, r + 48 + (bar === 3 ? 4 : 3), sd * 4, 0.025);
    } },
  };

  // ---------- Musikdateien (optional) ----------
  async function loadFiles() {
    if (!/^https?:$/.test(location.protocol)) return;
    let list = {};
    try { const r = await fetch('assets/music/tracks.json', { cache: 'no-cache' }); if (r.ok) list = await r.json(); } catch (e) { return; }
    for (const name in list) {
      if (!TR[name] || typeof list[name] !== 'string' || !/^[\w.-]+$/.test(list[name])) continue;
      try {
        const r = await fetch('assets/music/' + list[name]);
        if (!r.ok) continue;
        buffers[name] = await ac.decodeAudioData(await r.arrayBuffer());
        if (cur === name && !fileNow) startFile(name);
      } catch (e) {}
    }
  }
  function startFile(name) {
    stopFile();
    const src = ac.createBufferSource(); src.buffer = buffers[name]; src.loop = true;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(1, ac.currentTime + 0.8);
    src.connect(g); g.connect(fileG); src.start();
    fileSrc = { src, g }; fileNow = name;
  }
  function stopFile() {
    if (!fileSrc) return;
    const { src, g } = fileSrc;
    g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.25); try { src.stop(ac.currentTime + 1.2); } catch (e) {}
    fileSrc = null; fileNow = null;
  }

  function sched() {
    if (!ac || !cur || fileNow || ac.state !== 'running') return;
    const tr = TR[cur]; if (!tr) return;
    const sd = 60 / (tr.bpm + (tr.ramp ? Math.min(level, 16) * tr.ramp : 0)) / 4;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.12) { try { tr.step(step, nextT, sd, level); } catch (e) {} nextT += sd; step++; }
  }
  function music(name) {
    if (!ac) { want = name; return; }
    if (cur === name) return;
    cur = name; step = 0; nextT = ac.currentTime + 0.08;
    if (name && buffers[name]) startFile(name); else stopFile();
  }
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });
  return { init, sfx, music, volumes, setLevel: l => { level = l; } };
})();
