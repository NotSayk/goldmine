/**
 * Mesures de performance : poids du build (chemin critique en gzip), temps de
 * chargement et images par seconde pendant une partie, sur ordinateur et sur
 * un « téléphone moyen » simulé (processeur ralenti ×4, réseau 4G lente).
 *
 *   npm run build && npm run perf
 *
 * Chromium sans écran rend sans carte graphique : les chiffres sont prudents.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { ROOT, createRoom, launchBrowser, startGame, startServer, step, wait } from './lib.mjs';

const DIST = join(ROOT, 'packages/client/dist');
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} Ko`;

// ---------------------------------------------------------------------------
// Poids du build
// ---------------------------------------------------------------------------

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const assets = readdirSync(join(DIST, 'assets')).filter((f) => !f.endsWith('.map'));
const sizes = assets.map((file) => {
  const content = readFileSync(join(DIST, 'assets', file));
  return { file, raw: content.length, gzip: gzipSync(content, { level: 9 }).length };
});
const critical = sizes.filter((s) => html.includes(s.file));
const fonts = readdirSync(join(DIST, 'fonts'))
  .filter((f) => f.endsWith('.woff2'))
  .map((file) => ({ file, size: readFileSync(join(DIST, 'fonts', file)).length }));
const criticalGzip =
  critical.reduce((sum, s) => sum + s.gzip, 0) + gzipSync(Buffer.from(html)).length;
console.log('Build');
for (const s of sizes) {
  console.log(
    `  ${html.includes(s.file) ? 'critique ' : 'différé  '} ${s.file.padEnd(28)} ${kb(s.raw).padStart(10)} → ${kb(s.gzip).padStart(9)} gzip`,
  );
}
for (const f of fonts)
  console.log(`  police    ${f.file.padEnd(28)} ${kb(f.size).padStart(10)} (woff2)`);
console.log(`  Chemin critique (HTML + JS + CSS) : ${kb(criticalGzip)} gzip`);
console.log(
  `  Avec les polices préchargées : ${kb(criticalGzip + fonts.reduce((s, f) => s + f.size, 0))}`,
);

// ---------------------------------------------------------------------------
// Chargement et fluidité
// ---------------------------------------------------------------------------

const PROFILES = [
  { name: 'Ordinateur', cpu: 1, network: null, viewport: { width: 1440, height: 900 } },
  {
    name: 'Téléphone moyen simulé',
    cpu: 4,
    // 4G lente : 150 ms d'aller-retour, 1,6 Mbit/s descendant.
    network: { latency: 150, downloadThroughput: 200_000, uploadThroughput: 94_000 },
    viewport: { width: 390, height: 844 },
  },
];

const server = await startServer({ BOT_DELAY_MS: '700' });
const browser = await launchBrowser();

async function measure(profile) {
  const context = await browser.newContext({ viewport: profile.viewport, locale: 'fr-FR' });
  await context.addInitScript(() => {
    // Qualité élevée imposée : on mesure le pire cas, sans baisse automatique.
    localStorage.setItem('pepite.preferences', JSON.stringify({ quality: 'high' }));
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  if (profile.network) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...profile.network });
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const start = Date.now();
  await page.goto(server.url);
  await page.getByLabel('Votre pseudo').waitFor();
  const ready = Date.now() - start;
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint =
      performance.getEntriesByName('first-contentful-paint')[0] ??
      performance.getEntriesByName('first-paint')[0];
    return {
      fcp: paint ? Math.round(paint.startTime) : null,
      dcl: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
    };
  });
  if (profile.network) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
  }

  await createRoom(page, 'Alice', 3);
  await startGame(page, 'Alice');
  // Relevé de chaque image pendant 30 s de partie (cinématiques comprises).
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (now) => {
      window.__frames.push(now - last);
      last = now;
      if (window.__frames.length < 100_000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const until = Date.now() + 30_000;
  let dragons = 0;
  while (Date.now() < until) {
    if (await page.locator('.spotlight[data-kind="dragon"]').count()) dragons += 1;
    const result = await step(page);
    if (result === 'finished' || result === 'roundEnd') break;
    await wait(80);
  }
  const frames = await page.evaluate(() => window.__frames.slice(5));
  await context.close();
  const sorted = [...frames].sort((a, b) => a - b);
  const total = frames.reduce((s, f) => s + f, 0);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  return {
    profile: profile.name,
    ready,
    ...timing,
    avgFps: Math.round((frames.length * 1000) / total),
    fpsP5: Math.round(1000 / p95),
    slowFrames: `${((frames.filter((f) => f > 33.4).length / frames.length) * 100).toFixed(1)} %`,
    worstFrameMs: Math.round(sorted[sorted.length - 1] ?? 0),
    dragonsSeen: dragons > 0,
    errors: errors.length,
  };
}

for (const profile of PROFILES) {
  const result = await measure(profile);
  console.log(`\n${result.profile}`);
  console.log(
    `  Chargement : premier affichage ${result.fcp ?? 'n/d'} ms, DOM prêt ${result.dcl} ms, formulaire prêt ${result.ready} ms`,
  );
  console.log(
    `  Partie (30 s) : ${result.avgFps} i/s en moyenne, ${result.fpsP5} i/s au 5e centile, ` +
      `${result.slowFrames} d'images sous 30 i/s, pire image ${result.worstFrameMs} ms` +
      `${result.dragonsSeen ? ', cinématique du dragon incluse' : ''}`,
  );
  if (result.errors) console.log(`  ${result.errors} erreur(s) JavaScript`);
}

await browser.close();
await server.close();
