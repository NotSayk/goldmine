import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PlayerView } from '@pepite/engine';
import { startServer, type RunningServer } from '../src/app';
import { createSecureRng } from '../src/secureRng';
import { TestClient, waitUntil } from './client';

let server: RunningServer;
let clients: TestClient[] = [];

beforeEach(async () => {
  server = await startServer({
    port: 0,
    host: '127.0.0.1',
    graceMs: 150,
    botDelayMs: 0,
    sweepIntervalMs: 20,
    // Les clients simulés jouent sans pause : la limite de débit est testée à part.
    rateLimit: { burst: 10_000, perSecond: 10_000 },
    logger: false,
  });
  clients = [];
});

afterEach(async () => {
  await Promise.all(clients.map((c) => c.disconnect()));
  await server.close();
});

async function client(): Promise<TestClient> {
  const c = await new TestClient(server.url).connect();
  clients.push(c);
  return c;
}

/** Crée un salon avec `count` humains ; le premier est l'hôte. */
async function lobby(count: number): Promise<TestClient[]> {
  const host = await client();
  host.send({ type: 'createRoom', name: 'Hôte' });
  await waitUntil(() => host.room !== null);
  const code = host.room!.code;
  const others: TestClient[] = [];
  for (let i = 1; i < count; i++) {
    const c = await client();
    c.send({ type: 'joinRoom', code, name: `Joueur ${i + 1}` });
    await waitUntil(() => c.room?.players.length === i + 1);
    others.push(c);
  }
  await waitUntil(() => host.room?.players.length === count);
  return [host, ...others];
}

function finished(c: TestClient): boolean {
  return c.view?.phase === 'finished';
}

/** Aucune information cachée dans le trafic reçu par un client. */
function assertNoLeak(c: TestClient): void {
  for (const raw of c.raw) {
    // Identifiants de cartes (ordre des pioches), graine et état du générateur.
    expect(raw).not.toMatch(/"[XE]\d\d"/);
    if (!raw.startsWith('{"type":"welcome"')) {
      expect(raw).not.toMatch(/"(sessionToken|key|seed|counter|rng|exitDeck|extractionDeck)":/);
    }
  }
  for (const message of c.received) {
    if (message.type !== 'game') continue;
    const view = message.view;
    for (const player of view.players) {
      if (player.id !== c.playerId) {
        expect(player.pile.gold).toBeNull();
        expect(player.pile.cards).toBeNull();
      }
    }
    for (const dwarf of view.dwarves) {
      if (dwarf.ownerId !== c.playerId) expect(dwarf.secured.gold).toBeNull();
    }
    expect(Object.keys(view.exit).sort()).toEqual(['deckCount', 'discard']);
    for (const event of message.events) {
      if (event.type === 'CardDrawn' && event.deck === 'exit') {
        const owner = view.dwarves[event.dwarfId]?.ownerId;
        if (owner !== c.playerId) expect(event.card).toBeNull();
      }
    }
  }
}

describe('parties complètes entre clients simulés', () => {
  it.each([2, 3, 4, 6])('du salon à la victoire à %i joueurs', async (count) => {
    const players = await lobby(count);
    const [host] = players;
    host!.send({ type: 'startGame' });
    await waitUntil(() => players.every((c) => c.view !== null));
    for (const [i, c] of players.entries()) c.autoplay(i % 2 ? 'random' : 'heuristic');
    await waitUntil(() => players.every(finished), 20_000);
    const winners = players.map((c) => c.view!.finalResult!.winners);
    expect(new Set(winners.map((w) => w.join()))).toHaveLength(1);
    expect(players.every((c) => c.room?.status === 'finished')).toBe(true);
    expect(players.every((c) => !c.received.some((m) => m.type === 'error'))).toBe(true);
    for (const c of players) assertNoLeak(c);
  });

  it('variante à 2 joueurs (2 nains chacun)', async () => {
    const [host, guest] = await lobby(2);
    host!.send({ type: 'updateSettings', doubleDraw: true, firstPlayer: guest!.playerId! });
    await waitUntil(() => host!.room?.settings.doubleDraw === true);
    host!.send({ type: 'startGame' });
    await waitUntil(() => host!.view !== null && guest!.view !== null);
    expect(host!.view!.dwarves).toHaveLength(4);
    expect(host!.view!.currentPlayerId).toBe(guest!.playerId);
    host!.autoplay();
    guest!.autoplay();
    await waitUntil(() => finished(host!) && finished(guest!), 20_000);
  });

  it('un joueur seul contre des bots', async () => {
    const [host] = await lobby(1);
    host!.send({ type: 'startGame' });
    await host!.expectError('NOT_ENOUGH_PLAYERS');
    for (let i = 0; i < 3; i++) host!.send({ type: 'addBot' });
    await waitUntil(() => host!.room?.players.length === 4);
    expect(host!.room!.players.filter((p) => p.isBot)).toHaveLength(3);
    host!.send({ type: 'startGame' });
    host!.autoplay();
    await waitUntil(() => finished(host!), 20_000);
    expect(host!.view!.finalResult!.standings).toHaveLength(4);
  });
});

describe('salons', () => {
  it('erreurs : salon introuvable, complet, partie en cours, non-hôte', async () => {
    const players = await lobby(6);
    const late = await client();
    late.send({ type: 'joinRoom', code: 'ZZZZZ', name: 'Retard' });
    await late.expectError('ROOM_NOT_FOUND');
    late.send({ type: 'joinRoom', code: players[0]!.room!.code, name: 'Retard' });
    await late.expectError('ROOM_FULL');
    players[1]!.send({ type: 'startGame' });
    await players[1]!.expectError('NOT_HOST');
    players[0]!.send({ type: 'removePlayer', playerId: players[5]!.playerId! });
    await waitUntil(() => players[0]!.room?.players.length === 5);
    expect(players[5]!.room).toBeNull();
    players[0]!.send({ type: 'startGame' });
    await waitUntil(() => players[0]!.room?.status === 'playing');
    late.send({ type: 'joinRoom', code: players[0]!.room!.code, name: 'Retard' });
    await late.expectError('GAME_IN_PROGRESS');
  });

  it('noms uniques, départ de l’hôte, retour au salon après la partie', async () => {
    const [host, guest] = await lobby(2);
    expect(guest!.room!.players.map((p) => p.name)).toEqual(['Hôte', 'Joueur 2']);
    const twin = await client();
    twin.send({ type: 'joinRoom', code: host!.room!.code, name: 'Hôte' });
    await waitUntil(() => twin.room?.players.length === 3);
    expect(twin.room!.players[2]!.name).toBe('Hôte (2)');
    host!.send({ type: 'leaveRoom' });
    await waitUntil(() => guest!.room?.players.length === 2);
    expect(guest!.room!.hostId).toBe(guest!.playerId);
    expect(host!.room).toBeNull();
  });

  it('valide les messages entrants', async () => {
    const c = await client();
    c.sendRaw('pas du json');
    await c.expectError('INVALID_MESSAGE');
    c.sendRaw(JSON.stringify({ type: 'action', action: { type: 'drawExit', playerId: 'autre' } }));
    await c.expectError('INVALID_MESSAGE');
    c.send({ type: 'action', action: { type: 'drawExit' } });
    await c.expectError('NOT_IN_ROOM');
  });

  it('limite le débit puis ferme une connexion abusive', async () => {
    const limited = await startServer({ port: 0, host: '127.0.0.1', logger: false });
    const c = await new TestClient(limited.url).connect();
    for (let i = 0; i < 80; i++) c.send({ type: 'ping' });
    await c.expectError('RATE_LIMITED');
    expect(c.received.filter((m) => m.type === 'pong').length).toBeLessThan(80);
    const closed = new Promise<void>((resolve) => c.onClose(resolve));
    for (let i = 0; i < 400; i++) c.send({ type: 'ping' });
    await closed;
    await limited.close();
  });

  it('exige « hello » avant toute autre demande', async () => {
    const silent = new TestClient(server.url);
    clients.push(silent);
    await silent.connect(null, false);
    silent.send({ type: 'createRoom', name: 'Pressé' });
    await silent.expectError('SESSION_REQUIRED');
    silent.send({ type: 'hello', sessionToken: 'jeton-inconnu-123456' });
    await silent.waitFor((m) => m.type === 'welcome');
    expect(silent.sessionToken).not.toBe('jeton-inconnu-123456');
  });
});

describe('triche', () => {
  it('refuse une action hors de son tour, sans rien changer', async () => {
    const [host, guest] = await lobby(2);
    host!.send({ type: 'updateSettings', firstPlayer: host!.playerId! });
    await waitUntil(() => host!.room?.settings.firstPlayer === host!.playerId);
    host!.send({ type: 'startGame' });
    await waitUntil(() => guest!.view !== null);
    const before = guest!.view;
    guest!.send({ type: 'action', action: { type: 'drawExtraction' } });
    await guest!.expectError('NOT_YOUR_TURN');
    guest!.send({ type: 'nextRound' });
    await guest!.expectError('NOT_HOST');
    expect(guest!.view).toBe(before);
    expect(host!.view!.extraction.count).toBe(58);
  });

  it('ne divulgue ni la pioche Exit ni les piles adverses', async () => {
    const [host, guest] = await lobby(2);
    host!.send({ type: 'startGame' });
    await waitUntil(() => host!.view !== null && guest!.view !== null);
    host!.autoplay();
    guest!.autoplay();
    await waitUntil(() => finished(host!) && finished(guest!), 20_000);
    assertNoLeak(host!);
    assertNoLeak(guest!);
  });

  it('le générateur du serveur est rejouable mais imprévisible sans sa clé', () => {
    const a = createSecureRng();
    const values = Array.from({ length: 20 }, () => a.next());
    const saved = a.snapshot();
    const b = createSecureRng({ ...saved, counter: 0, offset: 8 });
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(values);
    const resumed = createSecureRng(saved);
    const c = createSecureRng({ ...saved, counter: 0, offset: 8 });
    for (let i = 0; i < 20; i++) c.next();
    expect(resumed.next()).toBe(c.next());
    expect(createSecureRng().next()).not.toBe(values[0]);
  });
});

describe('déconnexion et reconnexion', () => {
  async function startedGame(): Promise<TestClient[]> {
    const players = await lobby(3);
    players[0]!.send({ type: 'updateSettings', firstPlayer: players[0]!.playerId! });
    await waitUntil(() => players[0]!.room?.settings.firstPlayer === players[0]!.playerId);
    players[0]!.send({ type: 'startGame' });
    await waitUntil(() => players.every((c) => c.view !== null));
    return players;
  }

  it('une reconnexion en cours de manche rend la même vue', async () => {
    const [host, second, third] = await startedGame();
    host!.send({ type: 'action', action: { type: 'drawExtraction' } });
    await waitUntil(() => second!.view?.currentPlayerId === second!.playerId);
    const before: PlayerView = second!.view!;
    await second!.disconnect();
    await waitUntil(() => host!.room?.players[1]?.connection === 'offline');
    const back = new TestClient(server.url);
    clients.push(back);
    await back.connect(second!.sessionToken);
    await waitUntil(() => back.view !== null);
    expect(back.playerId).toBe(second!.playerId);
    expect(back.view).toEqual(before);
    await waitUntil(() => third!.room?.players[1]?.connection === 'online');
  });

  it('après le délai de grâce, l’hôte peut passer le tour puis remplacer par un bot', async () => {
    const [host, second, third] = await startedGame();
    host!.send({ type: 'action', action: { type: 'drawExtraction' } });
    await waitUntil(() => second!.view?.currentPlayerId === second!.playerId);
    await second!.disconnect();
    await waitUntil(() => host!.room?.players[1]?.connection === 'offline');
    host!.send({ type: 'skipPlayer', playerId: second!.playerId! });
    await host!.expectError('GRACE_NOT_EXPIRED');
    await waitUntil(() => host!.room?.players[1]?.connection === 'away');
    host!.send({ type: 'skipPlayer', playerId: second!.playerId! });
    await waitUntil(() => host!.view?.currentPlayerId !== second!.playerId);
    expect(host!.view!.currentDwarfId).toBe(2);
    host!.send({ type: 'replaceWithBot', playerId: second!.playerId! });
    await waitUntil(() => host!.room?.players[1]?.botControlled === true);
    // Le bot joue désormais pour lui : la partie avance sans lui.
    host!.autoplay();
    third!.autoplay();
    await waitUntil(() => finished(host!), 20_000);
  });

  it('l’hôte déconnecté trop longtemps est remplacé', async () => {
    const [host, second] = await startedGame();
    await host!.disconnect();
    await waitUntil(() => second!.room?.hostId === second!.playerId);
    expect(second!.room!.players[0]!.connection).toBe('away');
  });

  it('quitter en cours de partie laisse un bot à sa place', async () => {
    const [host, second, third] = await startedGame();
    third!.send({ type: 'leaveRoom' });
    await waitUntil(() => third!.room === null);
    await waitUntil(() => host!.room?.players[2]?.botControlled === true);
    host!.autoplay();
    second!.autoplay();
    await waitUntil(() => finished(host!) && finished(second!), 20_000);
    host!.send({ type: 'backToLobby' });
    await waitUntil(() => host!.room?.status === 'lobby');
    expect(host!.room!.players).toHaveLength(2);
  });
});

describe('HTTP', () => {
  it('répond sur /healthz avec les en-têtes de sécurité', async () => {
    const response = await fetch(`${server.url}/healthz`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, rooms: 0 });
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
