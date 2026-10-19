import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { MAX_MESSAGE_BYTES } from '@pepite/shared';
import { isLocalRequest, lanAddresses } from './network';
import { InMemoryRoomStore, type RoomStore } from './roomStore';
import { RoomManager, type Connection } from './rooms';

export interface ServerOptions {
  port: number;
  host: string;
  /** Dossier du client construit (servi en statique), `null` pour l'API seule. */
  staticDir: string | null;
  graceMs: number;
  botDelayMs: number;
  idleRoomTtlMs: number;
  sweepIntervalMs: number;
  heartbeatMs: number;
  maxConnectionsPerIp: number;
  rateLimit: { burst: number; perSecond: number };
  logger: boolean;
  store?: RoomStore;
  /** Adresses de la machine sur le réseau local (remplaçable dans les tests). */
  lanAddresses?: () => string[];
}

export const DEFAULT_OPTIONS: ServerOptions = {
  port: 3000,
  host: '0.0.0.0',
  staticDir: null,
  graceMs: 30_000,
  // Laisse le temps de voir chaque coup des bots au premier plan.
  botDelayMs: 1800,
  idleRoomTtlMs: 30 * 60_000,
  sweepIntervalMs: 1_000,
  heartbeatMs: 30_000,
  maxConnectionsPerIp: 20,
  rateLimit: { burst: 30, perSecond: 15 },
  logger: false,
};

export interface RunningServer {
  readonly app: FastifyInstance;
  readonly manager: RoomManager;
  readonly url: string;
  close(): Promise<void>;
}

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

export async function startServer(overrides: Partial<ServerOptions> = {}): Promise<RunningServer> {
  const options = { ...DEFAULT_OPTIONS, ...overrides };
  const app = Fastify({ logger: options.logger, bodyLimit: 1024 });
  const manager = new RoomManager(options.store ?? new InMemoryRoomStore(), options);

  app.addHook('onSend', async (_request, reply, payload) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) reply.header(name, value);
    return payload;
  });

  app.get('/healthz', () => ({ ok: true, rooms: manager.roomCount() }));

  // Adresse à donner aux autres joueurs quand l'hôte joue sur « localhost ».
  app.get('/api/lan', (request) => {
    if (!isLocalRequest(request.ip, request.headers.host)) return { urls: [] };
    const { port } = app.server.address() as AddressInfo;
    const addresses = (options.lanAddresses ?? lanAddresses)();
    return { urls: addresses.map((ip) => `http://${ip}:${port}`) };
  });

  const staticDir = options.staticDir;
  if (staticDir && existsSync(staticDir)) {
    await app.register(fastifyStatic, { root: staticDir, index: 'index.html', wildcard: false });
    // Application monopage : toute autre route GET renvoie index.html.
    app.setNotFoundHandler((request, reply) => {
      const path = request.url.split('?')[0] ?? '';
      // Un fichier absent (script, image…) reste une vraie 404, pas la page d'accueil.
      const looksLikeFile = path.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(path);
      if (request.method === 'GET' && !path.startsWith('/ws') && !looksLikeFile) {
        return reply.type('text/html').sendFile('index.html');
      }
      return reply.code(404).send({ error: 'Not found' });
    });
  }

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  const connectionsPerIp = new Map<string, number>();
  const alive = new WeakMap<WebSocket, boolean>();

  app.server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const path = (request.url ?? '').split('?')[0];
    const ip = request.socket.remoteAddress ?? 'unknown';
    if (path !== '/ws') {
      socket.destroy();
      return;
    }
    if ((connectionsPerIp.get(ip) ?? 0) >= options.maxConnectionsPerIp) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      connectionsPerIp.set(ip, (connectionsPerIp.get(ip) ?? 0) + 1);
      alive.set(ws, true);
      const connection: Connection = {
        send: (message) => {
          if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
        },
        close: (code, reason) => ws.close(code, reason),
      };
      manager.connect(connection);
      ws.on('pong', () => alive.set(ws, true));
      ws.on('message', (data, isBinary) => {
        if (isBinary) {
          connection.send({ type: 'error', code: 'INVALID_MESSAGE', message: 'Texte attendu.' });
          return;
        }
        const raw = Array.isArray(data)
          ? Buffer.concat(data).toString('utf8')
          : Buffer.from(data as ArrayBuffer).toString('utf8');
        manager.handle(connection, raw);
      });
      ws.on('close', () => {
        const count = (connectionsPerIp.get(ip) ?? 1) - 1;
        if (count <= 0) connectionsPerIp.delete(ip);
        else connectionsPerIp.set(ip, count);
        manager.disconnect(connection);
      });
      ws.on('error', () => ws.terminate());
    });
  });

  // Détection des connexions mortes (réseau mobile coupé sans fermeture propre).
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, options.heartbeatMs);
  const sweep = setInterval(() => manager.sweep(), options.sweepIntervalMs);
  heartbeat.unref();
  sweep.unref();

  const address = await app.listen({ port: options.port, host: options.host });
  return {
    app,
    manager,
    url: address,
    async close() {
      clearInterval(heartbeat);
      clearInterval(sweep);
      manager.close();
      for (const ws of wss.clients) ws.terminate();
      wss.close();
      await app.close();
    },
  };
}
