// Erzeugt die Screenshots für die README.
//
//   cd tools
//   npm install
//   npm run screenshots
//
// Das Skript startet einen kleinen lokalen Server für den Repo-Ordner, öffnet das Spiel mit Playwright
// über den Debug-Weg (?debug=1&…, siehe DEBUG in index.html) und speichert PNGs und ein GIF in screenshots/.
// Der Debug-Weg läuft mit festem Zufall und fester Bildrate und hält nach einer festen Zahl Bilder an,
// deshalb sehen die Bilder bei jedem Lauf gleich aus. Er speichert nichts im localStorage.
//
// Browser: Playwright-Chromium, falls installiert (npx playwright install chromium),
// sonst das installierte Microsoft Edge oder Google Chrome. SHADY_BROWSER=msedge|chrome|chromium erzwingt einen.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'screenshots');

// Sprache Deutsch, grelle Blitze an (also keine Dämpfung), damit Farbchaos in voller Stärke zu sehen ist
const BASE = 'debug=1&lang=de&flashes=1';
const SHOTS = [
  { file: 'hauptmenue.png', query: 'screen=menu&frames=40', full: true },
  { file: 'spiel-normal.png', query: 'level=3&seed=11&frames=330' },
  { file: 'farbchaos-stufe-2.png', query: 'level=2&seed=5&event=colorchaos&frames=70' },
  { file: 'farbchaos-stufe-6.png', query: 'level=6&seed=6&event=colorchaos&frames=192' },
  { file: 'farbchaos-stufe-10-boss.png', query: 'level=10&seed=10&mode=campaign&boss=core&event=colorchaos&frames=212' },
];
// Das GIF zeigt Farbchaos mit gedämpften Blitzen (weiche Übergänge), damit die README selbst nicht flackert.
const GIF = { file: 'farbchaos.gif', query: 'debug=1&lang=de&flashes=0&level=8&seed=8&event=colorchaos&frames=40', frames: 36, step: 5, size: 320 };

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json' };
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
  const tries = want ? [want] : ['chromium', 'msedge', 'chrome'];
  for (const ch of tries) {
    try { return await chromium.launch(ch === 'chromium' ? {} : { channel: ch }); }
    catch (e) { if (want) throw e; }
  }
  throw new Error('Kein Browser gefunden. Entweder „npx playwright install chromium“ ausführen oder Edge/Chrome installieren.');
}

// Warten, bis der Debug-Lauf seine Bilder gezeichnet hat und stehen bleibt
async function settle(page) {
  await page.waitForFunction(() => window.shadyDebug && window.shadyDebug.done, null, { timeout: 60000 });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

// Ausschnitt: HUD, Gegnerleiste und Spielfeld
async function gameClip(page) {
  return page.evaluate(() => {
    const boxes = ['.hud', '.stage', '.touchbar'].map(s => document.querySelector(s)).filter(el => el && el.offsetParent).map(el => el.getBoundingClientRect());
    const x = Math.min(...boxes.map(b => b.left)), y = Math.min(...boxes.map(b => b.top));
    const r = Math.max(...boxes.map(b => b.right)), b = Math.max(...boxes.map(b => b.bottom)), m = 12;
    return { x: Math.max(0, x - m), y: Math.max(0, y - m), width: r - x + 2 * m, height: b - y + 2 * m };
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve(), port = server.address().port;
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 820, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'no-preference' });
  const page = await context.newPage();
  page.on('pageerror', e => console.error('Fehler im Spiel:', e.message));
  const url = q => `http://127.0.0.1:${port}/index.html?${q}`;

  for (const s of SHOTS) {
    await page.goto(url(BASE + '&' + s.query));
    await settle(page);
    const file = path.join(OUT, s.file);
    await page.screenshot(s.full ? { path: file } : { path: file, clip: await gameClip(page) });
    console.log('✓', path.relative(ROOT, file));
  }

  // GIF aus mehreren Bildern des Spielfelds
  await page.goto(url(GIF.query));
  await settle(page);
  const gif = GIFEncoder();
  for (let i = 0; i < GIF.frames; i++) {
    const rgba = Uint8Array.from(await page.evaluate(size => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'); g.drawImage(document.getElementById('game'), 0, 0, size, size);
      return Array.from(g.getImageData(0, 0, size, size).data);
    }, GIF.size));
    const palette = quantize(rgba, 256), index = applyPalette(rgba, palette);
    gif.writeFrame(index, GIF.size, GIF.size, { palette, delay: Math.round(GIF.step * 1000 / 60) });
    await page.evaluate(n => window.shadyDebug.advance(n), GIF.step);
    await settle(page);
  }
  gif.finish();
  fs.writeFileSync(path.join(OUT, GIF.file), gif.bytes());
  console.log('✓', path.join('screenshots', GIF.file));

  await browser.close();
  server.close();
}

main().catch(e => { console.error(e); process.exit(1); });
