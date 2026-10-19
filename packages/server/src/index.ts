import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRANDING } from '@pepite/shared';
import { DEFAULT_OPTIONS, startServer } from './app';
import { lanAddresses } from './network';

const here = dirname(fileURLToPath(import.meta.url));

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

const host = process.env.HOST ?? DEFAULT_OPTIONS.host;
const server = await startServer({
  port: numberFromEnv('PORT', DEFAULT_OPTIONS.port),
  host,
  staticDir: process.env.STATIC_DIR ?? resolve(here, '../../client/dist'),
  graceMs: numberFromEnv('GRACE_MS', DEFAULT_OPTIONS.graceMs),
  botDelayMs: numberFromEnv('BOT_DELAY_MS', DEFAULT_OPTIONS.botDelayMs),
  turnTimeMs: numberFromEnv('TURN_TIME_MS', DEFAULT_OPTIONS.turnTimeMs),
  paceAnimations: process.env.PACE_ANIMATIONS !== '0',
  logger: process.env.LOG !== '0',
});

const port = new URL(server.url).port;
const lines = [
  `${BRANDING.gameName} : serveur prêt.`,
  `  Sur ce PC           : http://localhost:${port}`,
];
if (host === '0.0.0.0' || host === '::') {
  const addresses = lanAddresses();
  for (const ip of addresses) lines.push(`  Sur le réseau local : http://${ip}:${port}`);
  if (addresses.length === 0) lines.push('  Aucune adresse de réseau local détectée.');
} else {
  lines.push(`  Accessible seulement via ${host} (HOST=0.0.0.0 pour le réseau local).`);
}
console.log(lines.join('\n'));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
