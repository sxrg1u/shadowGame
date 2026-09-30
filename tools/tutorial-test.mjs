// Spielt das Tutorial einmal automatisch mit echten Tastendrücken durch und prüft, dass alle 10 Schritte klappen.
//
//   cd tools
//   npm install
//   npm run tutorial-test
//
// Der Test startet mit leerem Profil, klickt im Hauptmenü auf „Play“ (das startet beim ersten Mal das Tutorial),
// läuft per Pfeiltasten zum jeweiligen Ziel, dasht mit der Leertaste, setzt den Anker mit E, pariert mit Q und wählt am Ende ein Upgrade.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
function serve() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}
async function launch() {
  const want = process.env.SHADY_BROWSER;
  for (const ch of want ? [want] : ['chromium', 'msedge', 'chrome']) {
    try { return await chromium.launch(ch === 'chromium' ? (process.env.SHADY_EXE ? { executablePath: process.env.SHADY_EXE } : {}) : { channel: ch }); }
    catch (e) { if (want) throw e; }
  }
  throw new Error('Kein Browser gefunden.');
}

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

async function main() {
  const server = await serve(), port = server.address().port;
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 820, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.click('[data-go="scrModes"]');

  const held = new Set();
  const hold = async want => {
    for (const k of KEYS) {
      if (want.has(k) && !held.has(k)) { await page.keyboard.down(k); held.add(k); }
      if (!want.has(k) && held.has(k)) { await page.keyboard.up(k); held.delete(k); }
    }
  };
  let seen = -1, tick = 0, result = null, anchorT = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    const st = await page.evaluate(() => ({
      scr: topScr() || null, mode: S ? S.mode : null, cfg: S && S.cfg ? S.cfg.mode : null, done: !!P.tutDone, tutStat: P.stats.tutorial || 0,
      step: S && S.tut ? S.tut.step : -1, p: S ? { x: S.p.x, y: S.p.y } : null,
      target: S && S.tut && S.tut.target ? { x: S.tut.target.x, y: S.tut.target.y } : null,
      anchor: !!(S && S.anchor), shot: S ? Math.min(1e9, ...S.shots.filter(q => !q.ref).map(q => Math.hypot(q.x - S.p.x, q.y - S.p.y))) : 1e9,
    }));
    if (st.step > seen && st.cfg === 'tutorial') { seen = st.step; console.log('✓ Schritt', st.step + 1, 'erreicht'); }
    if (st.done) { result = st; break; }
    if (st.scr === 'scrPick') { await hold(new Set()); await page.click('#scrPick .card'); await page.waitForTimeout(150); continue; }
    if (st.mode === 'ready') { await page.keyboard.press('Enter'); await page.waitForTimeout(100); continue; }
    tick++;
    const want = new Set();
    let dash = false;
    if (st.step === 0) want.add(tick % 30 < 15 ? 'ArrowRight' : 'ArrowLeft');
    else if (st.step === 5) {   // Anker setzen, wegdrehen, zurückspringen
      if (!st.anchor) { await page.keyboard.press('e'); anchorT = tick; }
      else if (tick - anchorT > 12) await page.keyboard.press('e');
      else want.add('ArrowLeft');
    }
    else if (st.step === 6) { if (st.shot < 40) await page.keyboard.press('q'); }   // kurz vor dem Einschlag parieren
    else if (st.target && st.p) {
      const dx = st.target.x - st.p.x, dy = st.target.y - st.p.y, d = Math.hypot(dx, dy);
      if (dx > 6) want.add('ArrowRight'); else if (dx < -6) want.add('ArrowLeft');
      if (dy > 6) want.add('ArrowDown'); else if (dy < -6) want.add('ArrowUp');
      if (tick % 40 > 33) { want.clear(); want.add(KEYS[(tick >> 3) % 4]); }   // kurz ausweichen, falls eine Säule im Weg steht
      dash = (st.step === 4 || st.step === 7) && d < 90 && d > 12;
    } else if (st.step === 3) { want.add('ArrowRight'); dash = true; }
    await hold(want);
    if (dash) await page.keyboard.press('Space');
    await page.waitForTimeout(50);
  }
  await hold(new Set());
  const end = await page.evaluate(() => ({ scr: topScr() || null, done: !!P.tutDone, tutStat: P.stats.tutorial || 0 }));
  await browser.close(); server.close();

  const ok = result && seen === 9 && end.done && end.tutStat === 1 && end.scr === 'scrModes' && !errors.length;
  console.log(ok ? '✓ Tutorial komplett: alle 10 Schritte, danach Modusauswahl, keine Fehler.'
                 : '✗ Tutorial NICHT geschafft: letzter Schritt ' + (seen + 1) + ', Ende ' + JSON.stringify(end) + ', Fehler: ' + JSON.stringify(errors));
  process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
