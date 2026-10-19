import {
  createSeededRng,
  heuristicBot,
  randomBot,
  type BotPolicy,
  type PlayerView,
} from '@pepite/engine';
import type { ClientMessage, RoomView, ServerMessage } from '@pepite/shared';
import WebSocket from 'ws';

/** Client de test : connexion WebSocket réelle, journal de tous les messages reçus. */
export class TestClient {
  readonly received: ServerMessage[] = [];
  readonly raw: string[] = [];
  sessionToken: string | null = null;
  playerId: string | null = null;
  room: RoomView | null = null;
  view: PlayerView | null = null;
  private ws: WebSocket | null = null;
  private waiters: {
    predicate: (m: ServerMessage) => boolean;
    resolve: (m: ServerMessage) => void;
  }[] = [];
  private autoPolicy: BotPolicy | null = null;
  private readonly rng = createSeededRng(Math.random());

  constructor(private readonly url: string) {}

  async connect(token: string | null = this.sessionToken, sayHello = true): Promise<this> {
    const ws = new WebSocket(this.url.replace(/^http/, 'ws') + '/ws');
    this.ws = ws;
    ws.on('message', (data: Buffer) => this.onMessage(data.toString()));
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });
    if (!sayHello) return this;
    const welcome = this.waitFor((m) => m.type === 'welcome');
    this.send(token ? { type: 'hello', sessionToken: token } : { type: 'hello' });
    await welcome;
    return this;
  }

  send(message: ClientMessage | Record<string, unknown>): void {
    this.ws?.send(JSON.stringify(message));
  }

  onClose(listener: () => void): void {
    this.ws?.once('close', listener);
  }

  sendRaw(raw: string): void {
    this.ws?.send(raw);
  }

  async disconnect(): Promise<void> {
    const ws = this.ws;
    if (!ws || ws.readyState === WebSocket.CLOSED) return;
    await new Promise<void>((resolve) => {
      ws.once('close', () => resolve());
      ws.close();
    });
  }

  waitFor(predicate: (m: ServerMessage) => boolean, timeoutMs = 5000): Promise<ServerMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Délai dépassé en attendant un message')),
        timeoutMs,
      );
      this.waiters.push({
        predicate,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        },
      });
    });
  }

  /** Attend une erreur du serveur avec le code donné. */
  async expectError(code: string): Promise<void> {
    await this.waitFor((m) => m.type === 'error' && m.code === code);
  }

  /** Joue automatiquement dès que c'est son tour (et lance les manches s'il est l'hôte). */
  autoplay(policy: 'random' | 'heuristic' = 'heuristic'): void {
    this.autoPolicy = policy === 'random' ? randomBot : heuristicBot;
    this.maybeAct();
  }

  private onMessage(raw: string): void {
    this.raw.push(raw);
    const message = JSON.parse(raw) as ServerMessage;
    this.received.push(message);
    if (message.type === 'welcome') {
      this.sessionToken = message.sessionToken;
      this.playerId = message.playerId;
    }
    if (message.type === 'room') this.room = message.room;
    if (message.type === 'game') this.view = message.view;
    this.waiters = this.waiters.filter((waiter) => {
      if (!waiter.predicate(message)) return true;
      waiter.resolve(message);
      return false;
    });
    if (message.type === 'game') this.maybeAct();
  }

  private maybeAct(): void {
    const view = this.view;
    if (!this.autoPolicy || !view) return;
    if (view.phase === 'roundEnd') {
      if (this.room?.hostId === this.playerId) this.send({ type: 'nextRound' });
      return;
    }
    const action = this.autoPolicy(view, this.rng);
    if (action) this.send({ type: 'action', action });
  }
}

export async function waitUntil(condition: () => boolean, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('Condition non atteinte à temps');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
