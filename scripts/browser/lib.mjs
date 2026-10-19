/**
 * Outils communs aux scripts navigateur (captures, partie de fumée, mesures) :
 * lancement du serveur construit, de Chromium (Playwright) et d'un joueur
 * humain simulé qui joue dès que c'est possible, sans attendre les animations.
 *
 * Prérequis : `npm run build`. Chromium : celui de Playwright, ou CHROMIUM_PATH.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** Lance le serveur construit sur un port libre ; `close()` l'arrête. */
export async function startServer(env = {}) {
  const port = await freePort();
  const child = spawn(process.execPath, ['packages/server/dist/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', LOG: '0', ...env },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(`${url}/healthz`);
      if (response.ok) break;
    } catch {
      // Pas encore prêt.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return {
    url,
    close: () =>
      new Promise((resolve) => {
        child.once('exit', resolve);
        child.kill();
      }),
  };
}

export function launchBrowser() {
  return chromium.launch({
    args: ['--no-proxy-server'],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
}

/** Ouvre une page et relève toutes les erreurs de la console. */
export async function openPage(browser, url, { viewport, reducedMotion = false, prefs } = {}) {
  const context = await browser.newContext({
    viewport: viewport ?? { width: 1280, height: 860 },
    locale: 'fr-FR',
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
    acceptDownloads: true,
  });
  if (prefs) {
    await context.addInitScript((value) => {
      localStorage.setItem('pepite.preferences', value);
    }, JSON.stringify(prefs));
  }
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  return { page, context, errors };
}

/** Crée un salon (hôte) avec `bots` bots ; retourne le code. */
export async function createRoom(page, name, bots) {
  await page.getByLabel('Votre pseudo').fill(name);
  await page.getByRole('button', { name: 'Créer un salon' }).click();
  await page.getByText('Code du salon à partager').waitFor();
  for (let i = 0; i < bots; i++) {
    await page.getByRole('button', { name: '+ Ajouter un bot' }).click();
  }
  return ((await page.locator('.room-code').textContent()) ?? '').trim();
}

export async function joinRoom(page, name, code) {
  await page.getByLabel('Votre pseudo').fill(name);
  await page.getByLabel('Code du salon').fill(code);
  await page.getByRole('button', { name: 'Rejoindre' }).click();
  await page.getByText('Code du salon à partager').waitFor();
}

export async function startGame(page, firstPlayer) {
  if (firstPlayer) await page.getByLabel(/Qui commence/).selectOption({ label: firstPlayer });
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await page.locator('.track').waitFor();
}

/**
 * Un coup du joueur humain simulé, joué dès que c'est possible (jamais
 * d'attente des animations). Retourne ce qui s'est passé.
 */
export async function step(page) {
  try {
    if (await page.locator('.final-hero').count()) return 'finished';
    // Choix d'une action Exit ou d'un nain à échanger, à la place des boutons d'action.
    const inline = page.locator('.choice-panel button.choice:not([disabled])');
    if (await inline.count()) {
      await inline.first().click({ timeout: 1000 });
      return 'choice';
    }
    const dialog = page.locator('dialog[open]');
    if (await dialog.count()) {
      const choice = dialog.locator('button.choice:not([disabled])');
      if (await choice.count()) {
        await choice.first().click({ timeout: 1000 });
        return 'choice';
      }
      const next = dialog.getByRole('button', { name: /Lancer la manche/ });
      if (await next.count()) return 'roundEnd';
      const close = dialog.getByRole('button', { name: 'Voir la table' });
      if (await close.count()) return 'roundEnd';
    }
    const dig = page.getByRole('button', { name: /Creuser/ });
    const flee = page.getByRole('button', { name: /Fuir/ });
    if ((await dig.count()) && (await dig.isEnabled())) {
      const note = (await page.locator('#action-note').textContent()) ?? '';
      const gold = Number((note.match(/(\d+) pépite/) ?? [0, 0])[1]);
      await (gold >= 5 && (await flee.isEnabled()) ? flee : dig).click({ timeout: 1000 });
      return 'played';
    }
  } catch {
    // Élément détaché pendant une animation : on réessaie au tour de boucle suivant.
  }
  return 'waiting';
}

/** Ferme la fenêtre de fin de manche : l'hôte lance la suivante, les autres reviennent à la table. */
export async function continueAfterRound(page) {
  const dialog = page.locator('dialog[open]');
  const next = dialog.getByRole('button', { name: /Lancer la manche/ });
  try {
    if (await next.count()) await next.click({ timeout: 1000 });
    else await dialog.getByRole('button', { name: 'Voir la table' }).click({ timeout: 1000 });
  } catch {
    // Fenêtre déjà fermée.
  }
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
