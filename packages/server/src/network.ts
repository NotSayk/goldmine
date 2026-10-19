import { networkInterfaces } from 'node:os';

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 10 || (a === 192 && b === 168) || (a === 172 && b !== undefined && b >= 16 && b <= 31)
  );
}

/**
 * Adresses IPv4 privées de cette machine (réseau local), les plus probables
 * en premier : 192.168.x.x (box Internet), puis 10.x.x.x, puis 172.16-31.x.x.
 */
export function lanAddresses(): string[] {
  const found = new Set<string>();
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && isPrivateIpv4(entry.address)) {
        found.add(entry.address);
      }
    }
  }
  const rank = (ip: string): number =>
    ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : 2;
  return [...found].sort((a, b) => rank(a) - rank(b));
}

const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Vrai pour une requête faite depuis cette machine vers « localhost » : seul
 * l'hôte qui lance le serveur sur son PC a besoin de connaître l'adresse réseau.
 * Derrière un proxy, l'en-tête Host porte le nom public : rien n'est révélé.
 */
export function isLocalRequest(ip: string, hostHeader: string | undefined): boolean {
  const hostname = (hostHeader ?? '').replace(/:\d+$/, '').toLowerCase();
  return LOOPBACK_IPS.has(ip) && LOCAL_HOSTNAMES.has(hostname);
}
