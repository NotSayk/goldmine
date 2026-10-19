/**
 * Partie de fumée : parties complètes à 2, 4 et 6 joueurs (humains simulés et
 * bots) dans Chromium. Échoue s'il y a une erreur dans la console, si une
 * partie ne se termine pas, ou si un joueur reste bloqué par une animation.
 *
 *   npm run build && npm run smoke
 *
 * Par défaut les bots jouent vite (PACE_ANIMATIONS=0) : les humains simulés
 * jouent alors pendant les animations, ce qui vérifie qu'elles ne bloquent
 * jamais. SMOKE_PACED=1 garde le vrai rythme (parties bien plus longues).
 */
import {
  continueAfterRound,
  createRoom,
  joinRoom,
  launchBrowser,
  openPage,
  startGame,
  startServer,
  step,
  wait,
} from './lib.mjs';

const GAMES = [
  { label: '2 joueurs (1 humain, 1 bot)', humans: 1, bots: 1 },
  { label: '4 joueurs (2 humains, 2 bots)', humans: 2, bots: 2 },
  { label: '6 joueurs (1 humain, 5 bots)', humans: 1, bots: 5 },
];
const PACED = process.env.SMOKE_PACED === '1';
const GAME_TIMEOUT_MS = (PACED ? 30 : 8) * 60_000;

const server = await startServer({ BOT_DELAY_MS: '250', PACE_ANIMATIONS: PACED ? '1' : '0' });
const browser = await launchBrowser();
let failed = false;

for (const game of GAMES) {
  const started = Date.now();
  const players = [];
  for (let i = 0; i < game.humans; i++) {
    players.push(
      await openPage(browser, server.url, {
        viewport: i === 0 ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      }),
    );
  }
  const [host, ...guests] = players;
  const code = await createRoom(host.page, 'Alice', game.bots);
  for (const [i, guest] of guests.entries()) await joinRoom(guest.page, `Invité ${i + 2}`, code);
  await startGame(host.page, 'Alice');

  let moves = 0;
  let rounds = 0;
  const done = new Set();
  while (done.size < players.length && Date.now() - started < GAME_TIMEOUT_MS) {
    for (const [index, player] of players.entries()) {
      if (done.has(index)) continue;
      const result = await step(player.page);
      if (result === 'played' || result === 'choice') moves += 1;
      if (result === 'finished') done.add(index);
      if (result === 'roundEnd') {
        if (index === 0) rounds += 1;
        await continueAfterRound(player.page);
      }
    }
    await wait(60);
  }

  const errors = players.flatMap((player) => player.errors);
  const ok = done.size === players.length && errors.length === 0;
  failed ||= !ok;
  console.log(
    `${ok ? 'OK ' : 'ÉCHEC'} ${game.label} : ${moves} coups humains, ${rounds} fins de manche, ` +
      `${Math.round((Date.now() - started) / 1000)} s, ${errors.length} erreur(s) console`,
  );
  for (const error of errors) console.log(`   ${error}`);
  for (const player of players) await player.context.close();
}

await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
