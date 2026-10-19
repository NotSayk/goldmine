import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANDING } from '@pepite/shared';
import { DEFAULT_OPTIONS, startServer } from './app';

const here = dirname(fileURLToPath(import.meta.url));

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

const server = await startServer({
  port: numberFromEnv('PORT', DEFAULT_OPTIONS.port),
  host: process.env.HOST ?? DEFAULT_OPTIONS.host,
  staticDir: process.env.STATIC_DIR ?? resolve(here, '../../client/dist'),
  graceMs: numberFromEnv('GRACE_MS', DEFAULT_OPTIONS.graceMs),
  botDelayMs: numberFromEnv('BOT_DELAY_MS', DEFAULT_OPTIONS.botDelayMs),
  logger: process.env.LOG !== '0',
});

console.log(`${BRANDING.gameName} : serveur prêt sur ${server.url}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
