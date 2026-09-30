// Bewegung Bild fuer Bild pruefen: spielt kleine Szenarien mit verlangsamter Zeit ab und speichert jedes Bild.
//
//   cd tools
//   npm install
//   npm run motion-check                # alle Szenarien, Faktor 0.1
//   npm run motion-check -- screens     # nur ein Szenario (screens, toast, cards, game)
//   npm run motion-check -- --rate 0.05 # noch langsamer
//
// CSS-Animationen und Uebergaenge laufen ueber das DevTools-Protokoll (Animation.setPlaybackRate) langsamer,
// das Spiel selbst ueber ?slow=… (siehe SLOW in js/data.js). Die Bilder landen in tools/out/motion/,
// dazu ein Kontaktbogen index.html, der sie nebeneinander zeigt. Mit --reduced laeuft alles mit "weniger Bewegung".

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'out', 'motion');
const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
const RATE = parseFloat(opt('rate', '0.1'));
const REDUCED = args.includes('--reduced');
const only = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--') || ['screens', 'toast', 'cards', 'game'].includes(a)).filter(a => ['screens', 'toast', 'cards', 'game'].includes(a));

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
  throw new Error('Kein Browser gefunden. „npx playwright install chromium“ ausfuehren oder Edge/Chrome installieren.');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const SCENARIOS = {
  // Bildschirme kommen und gehen: Menue -> Spielen -> zurueck
  async screens(shot, page) {
    await shot('menue');
    await page.click('[data-go="scrModes"]');
    await shot('spielen-rein', 10, 40);
    await page.click('#scrModes [data-back]');
    await shot('spielen-raus', 10, 40);
  },
  // Hinweise: zwei kurz hintereinander, der erste geht, waehrend der zweite noch kommt
  async toast(shot, page) {
    await page.evaluate(() => { toast('Erfolg freigeschaltet', 'Kaeferschreck', 'trophy'); setTimeout(() => toast('Neuer Hut', 'Zylinder', 'hat'), 400); });
    await shot('kommen', 8, 60);
    await sleep(3000);
    await shot('gehen', 10, 40);
  },
  // Upgrade-Karten werden ausgeteilt
  async cards(shot, page) {
    await page.evaluate(() => { startRun({ mode: 'endless', diff: 'normal', map: 'yard' }); openPick(); });
    await shot('karten', 12, 40);
  },
  // Spielmoment: Anker, Dash, Spiegel mit verlangsamtem Spiel
  async game(shot, page) {
    await page.click('[data-go="scrModes"]');
    await page.click('[data-mode="endless"]');
    await sleep(800);
    await shot('start', 3, 100);
    await page.keyboard.press('e'); await shot('anker-setzen', 4, 100);
    await page.keyboard.down('d'); await page.keyboard.press('Space'); await shot('dash', 6, 80); await page.keyboard.up('d');
    await page.keyboard.press('e'); await shot('anker-sprung', 6, 80);
    await page.keyboard.press('q'); await shot('spiegel', 5, 80);
  },
};

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const server = await serve(), port = server.address().port, browser = await launch();
  const names = only.length ? only : Object.keys(SCENARIOS), sheet = [];
  for (const name of names) {
    const ctx = await browser.newContext({ viewport: { width: 820, height: 900 }, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
    // Tutorial ueberspringen, sonst startet "Spielen" das Tutorial
    await ctx.addInitScript(() => { try { localStorage.setItem('schattenfaenger-profil-v2', JSON.stringify({ v: 2, tutDone: true, settings: { lang: 'de' } })); } catch (e) {} });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.error('Fehler im Spiel:', e.message));
    await page.goto(`http://127.0.0.1:${port}/index.html?slow=${name === 'game' ? Math.max(RATE, 0.2) : 1}`);
    await page.evaluate(() => document.fonts.ready); await sleep(600);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: RATE });
    const frames = []; let n = 0;
    const shot = async (label, count = 1, gap = 0) => {
      for (let i = 0; i < count; i++) {
        const file = `${name}-${String(++n).padStart(2, '0')}-${label}.png`;
        await page.screenshot({ path: path.join(OUT, file) });
        frames.push({ file, label: `${label} ${count > 1 ? i + 1 + '/' + count : ''}` });
        if (gap) await sleep(gap);
      }
    };
    try { await SCENARIOS[name](shot, page); console.log('✓', name, frames.length, 'Bilder'); }
    catch (e) { console.error('✗', name, e.message); }
    sheet.push({ name, frames });
    await ctx.close();
  }
  const html = `<!doctype html><meta charset="utf-8"><title>Shady Bewegung (Faktor ${RATE}${REDUCED ? ', weniger Bewegung' : ''})</title>
<style>body{font:14px system-ui;margin:16px;background:#111;color:#eee}h2{margin:24px 0 8px}div.r{display:flex;flex-wrap:wrap;gap:8px}figure{margin:0;width:240px}img{width:100%;border:1px solid #444}figcaption{font-size:12px;color:#aaa}</style>
${sheet.map(s => `<h2>${s.name}</h2><div class="r">${s.frames.map(f => `<figure><img src="${f.file}" loading="lazy"><figcaption>${f.label}</figcaption></figure>`).join('')}</div>`).join('')}`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  console.log('Kontaktbogen:', path.relative(ROOT, path.join(OUT, 'index.html')));
  await browser.close(); server.close();
}
main().catch(e => { console.error(e); process.exit(1); });
