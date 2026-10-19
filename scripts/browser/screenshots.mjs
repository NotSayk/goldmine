/**
 * Captures des écrans clés (accueil, salon, table, dragon, fin de manche,
 * fin de partie) sur téléphone, tablette et ordinateur, avec et sans
 * mouvement réduit, rangées dans docs/screenshots/.
 *
 *   npm run build && npm run screenshots
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT,
  continueAfterRound,
  createRoom,
  launchBrowser,
  openPage,
  startGame,
  startServer,
  step,
  wait,
} from './lib.mjs';

const OUT = join(ROOT, 'docs/screenshots');
const DEVICES = [
  { name: 'telephone', viewport: { width: 390, height: 844 } },
  { name: 'tablette', viewport: { width: 820, height: 1180 } },
  { name: 'ordinateur', viewport: { width: 1440, height: 900 } },
];
const MOTIONS = [
  { name: 'animations', reduced: false },
  { name: 'mouvement-reduit', reduced: true },
];

mkdirSync(OUT, { recursive: true });
const server = await startServer({ BOT_DELAY_MS: '300', PACE_ANIMATIONS: '0' });
const browser = await launchBrowser();

async function capture(device, motion) {
  const { page, context, errors } = await openPage(browser, server.url, {
    viewport: device.viewport,
    reducedMotion: motion.reduced,
  });
  const shot = async (screen, options = {}) => {
    await page.screenshot({
      path: join(OUT, `${screen}-${device.name}-${motion.name}.jpg`),
      type: 'jpeg',
      quality: 72,
      ...options,
    });
  };
  await wait(600);
  await shot('1-accueil');
  await createRoom(page, 'Alice', 3);
  await page.getByRole('group', { name: 'Couleur' }).getByRole('button', { name: 'Prune' }).click();
  await wait(150);
  await page
    .getByRole('group', { name: 'Chapeau' })
    .getByRole('button', { name: 'Couronne' })
    .click();
  await page.getByRole('button', { name: 'Bravo !' }).click();
  await wait(500);
  await shot('2-salon');
  await startGame(page, 'Alice');
  // Table une fois la distribution et l'annonce de la manche passées.
  await page
    .locator('.spotlight')
    .waitFor({ state: 'detached', timeout: 10_000 })
    .catch(() => {});
  await wait(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('3-table');

  const taken = new Set();
  const deadline = Date.now() + 8 * 60_000;
  while (Date.now() < deadline) {
    if (!taken.has('dragon') && (await page.locator('.spotlight[data-kind="dragon"]').count())) {
      await wait(motion.reduced ? 200 : 500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await shot('4-dragon');
      taken.add('dragon');
    }
    const result = await step(page);
    if (result === 'roundEnd') {
      if (!taken.has('round')) {
        await wait(3600);
        await shot('5-fin-de-manche');
        taken.add('round');
      }
      await continueAfterRound(page);
    }
    if (result === 'finished') break;
    await wait(50);
  }
  await wait(4500);
  await page.locator('.final-hero').scrollIntoViewIfNeeded();
  await shot('6-fin-de-partie');
  await context.close();
  return errors;
}

let failed = false;
for (const motion of MOTIONS) {
  // Les trois tailles d'écran jouent en parallèle, chacune dans son salon.
  const results = await Promise.all(DEVICES.map((device) => capture(device, motion)));
  results.forEach((errors, i) => {
    const label = `${DEVICES[i].name} / ${motion.name}`;
    console.log(`${errors.length === 0 ? 'OK ' : 'ÉCHEC'} ${label} (${errors.length} erreur(s))`);
    for (const error of errors) console.log(`   ${error}`);
    failed ||= errors.length > 0;
  });
}

await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
