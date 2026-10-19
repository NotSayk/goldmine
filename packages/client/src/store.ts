import { useSyncExternalStore } from 'react';
import type { GameEvent, PlayerView } from '@pepite/engine';
import type { ClientMessage, RoomView, ServerMessage } from '@pepite/shared';
import { ERROR_MESSAGES, describeEvent } from './i18n/fr';
import { buildHighlights, highlightDuration, type Highlight } from './spotlight';

export type ConnectionState = 'connecting' | 'open' | 'reconnecting';

export interface LogEntry {
  readonly id: number;
  readonly round: number;
  readonly text: string;
  readonly tone: 'info' | 'danger' | 'success';
}

/** Effet visuel éphémère déclenché par un événement du moteur. */
export interface Effect {
  readonly id: number;
  readonly kind: 'flame' | 'eliminated' | 'exited' | 'blocked';
  readonly position: number;
  readonly dwarfId: number | null;
  readonly color: number | null;
}

export interface Notice {
  readonly id: number;
  readonly text: string;
}

export interface AppState {
  readonly connection: ConnectionState;
  readonly playerId: string | null;
  readonly room: RoomView | null;
  readonly view: PlayerView | null;
  readonly log: readonly LogEntry[];
  readonly effects: readonly Effect[];
  readonly notice: Notice | null;
  /** Une intention a été envoyée, la réponse du serveur est attendue. */
  readonly waiting: boolean;
  /** Coups à montrer au premier plan, dans l'ordre (le premier est affiché). */
  readonly highlights: readonly Highlight[];
  /** Durée d'affichage du coup en cours, en millisecondes. */
  readonly highlightMs: number;
}

const SESSION_KEY = 'pepite.session';
const LOG_LIMIT = 60;
const EFFECT_MS = 1200;
const HIGHLIGHT_LIMIT = 8;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée) : la reconnexion ne sera pas possible.
  }
}

let nextId = 1;

/** Connexion au serveur et état de l'application (aucune règle du jeu ici). */
class GameClient {
  private state: AppState = {
    connection: 'connecting',
    playerId: null,
    room: null,
    view: null,
    log: [],
    effects: [],
    notice: null,
    waiting: false,
    highlights: [],
    highlightMs: 0,
  };
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<() => void>();
  private socket: WebSocket | null = null;
  private retries = 0;
  private outbox: ClientMessage[] = [];

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getState = (): AppState => this.state;

  private set(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  connect(): void {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${location.host}/ws`);
    this.socket = socket;
    socket.addEventListener('open', () => {
      this.retries = 0;
      const token = readStorage(SESSION_KEY);
      socket.send(
        JSON.stringify(token ? { type: 'hello', sessionToken: token } : { type: 'hello' }),
      );
    });
    socket.addEventListener('message', (event: MessageEvent<string>) => {
      this.receive(JSON.parse(event.data) as ServerMessage);
    });
    socket.addEventListener('close', () => {
      if (this.socket !== socket) return;
      this.set({ connection: 'reconnecting', waiting: false });
      const delay = Math.min(5000, 400 * 2 ** this.retries);
      this.retries += 1;
      setTimeout(() => this.connect(), delay);
    });
  }

  send(message: ClientMessage): void {
    if (this.state.connection !== 'open' || this.socket?.readyState !== WebSocket.OPEN) {
      this.outbox.push(message);
      return;
    }
    this.socket.send(JSON.stringify(message));
    if (message.type === 'action') this.set({ waiting: true });
  }

  dismissNotice(): void {
    this.set({ notice: null });
  }

  /** Passe au coup suivant (clic sur la carte mise en avant). */
  dismissHighlight(): void {
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
    this.highlightTimer = null;
    this.set({ highlights: this.state.highlights.slice(1) });
    this.pumpHighlights();
  }

  /** Affiche les coups l'un après l'autre, plus vite quand la file s'allonge. */
  private pumpHighlights(): void {
    if (this.highlightTimer || this.state.highlights.length === 0) return;
    const duration = highlightDuration(this.state.highlights.length);
    this.set({ highlightMs: duration });
    this.highlightTimer = setTimeout(() => {
      this.highlightTimer = null;
      this.set({ highlights: this.state.highlights.slice(1) });
      this.pumpHighlights();
    }, duration);
  }

  private clearHighlights(): void {
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
    this.highlightTimer = null;
  }

  private receive(message: ServerMessage): void {
    switch (message.type) {
      case 'welcome': {
        writeStorage(SESSION_KEY, message.sessionToken);
        this.set({ connection: 'open', playerId: message.playerId });
        const pending = this.outbox;
        this.outbox = [];
        for (const queued of pending) this.send(queued);
        break;
      }
      case 'room': {
        const wasInRoom = this.state.room !== null;
        if (message.room === null || message.room.status === 'lobby') this.clearHighlights();
        this.set({
          room: message.room,
          playerId: message.you,
          ...(message.room === null || message.room.status === 'lobby'
            ? { view: null, log: [], effects: [], highlights: [] }
            : {}),
        });
        // Un lien d'invitation (?salon=CODE) reste dans l'adresse tant qu'on n'a pas rejoint.
        if (message.room || wasInRoom) syncUrl(message.room?.code ?? null);
        break;
      }
      case 'game':
        this.applyGame(message.view, message.events);
        break;
      case 'error': {
        const notice = { id: nextId++, text: ERROR_MESSAGES[message.code] ?? message.message };
        this.set({ waiting: false, notice });
        setTimeout(() => {
          if (this.state.notice?.id === notice.id) this.set({ notice: null });
        }, 6000);
        break;
      }
      case 'pong':
        break;
    }
  }

  private applyGame(view: PlayerView, events: readonly GameEvent[]): void {
    const entries: LogEntry[] = [];
    const effects: Effect[] = [];
    for (const event of events) {
      const text = describeEvent(event, view);
      if (text) {
        const tone =
          event.type === 'DwarfEliminated' || event.type === 'DragonMoved'
            ? 'danger'
            : event.type === 'DwarfExited' || event.type === 'GameEnded'
              ? 'success'
              : 'info';
        entries.push({ id: nextId++, round: view.round, text, tone });
      }
      const effect = effectFor(event, view);
      if (effect) effects.push(effect);
    }
    this.set({
      view,
      waiting: false,
      log: [...this.state.log, ...entries].slice(-LOG_LIMIT),
      effects: [...this.state.effects, ...effects],
      highlights: queueHighlights(this.state.highlights, buildHighlights(events, view)),
    });
    this.pumpHighlights();
    if (effects.length > 0) {
      const ids = new Set(effects.map((e) => e.id));
      setTimeout(
        () => this.set({ effects: this.state.effects.filter((e) => !ids.has(e.id)) }),
        EFFECT_MS,
      );
    }
  }
}

/** Ajoute des coups à la file en gardant celui affiché ; les plus anciens en attente sautent. */
function queueHighlights(
  queue: readonly Highlight[],
  added: readonly Highlight[],
): readonly Highlight[] {
  const merged = [...queue, ...added];
  if (merged.length <= HIGHLIGHT_LIMIT) return merged;
  return [merged[0]!, ...merged.slice(-(HIGHLIGHT_LIMIT - 1))];
}

function effectFor(event: GameEvent, view: PlayerView): Effect | null {
  const color = (dwarfId: number): number | null => view.dwarves[dwarfId]?.color ?? null;
  switch (event.type) {
    case 'DragonMoved':
      return { id: nextId++, kind: 'flame', position: event.to, dwarfId: null, color: null };
    case 'DwarfEliminated':
      return event.cause === 'dragon'
        ? {
            id: nextId++,
            kind: 'eliminated',
            position: event.position,
            dwarfId: event.dwarfId,
            color: color(event.dwarfId),
          }
        : null;
    case 'DwarfExited':
      return {
        id: nextId++,
        kind: 'exited',
        position: 0,
        dwarfId: event.dwarfId,
        color: color(event.dwarfId),
      };
    case 'DwarfMoveBlocked':
      return {
        id: nextId++,
        kind: 'blocked',
        position: event.position,
        dwarfId: event.dwarfId,
        color: color(event.dwarfId),
      };
    default:
      return null;
  }
}

/** Garde le code du salon dans l'adresse pour pouvoir la partager. */
function syncUrl(code: string | null): void {
  const url = new URL(location.href);
  if (code) url.searchParams.set('salon', code);
  else url.searchParams.delete('salon');
  if (url.href !== location.href) history.replaceState(null, '', url);
}

export const client = new GameClient();

/** Code de salon présent dans l'adresse au chargement (lien d'invitation). */
export const INVITE_CODE = new URLSearchParams(location.search).get('salon')?.toUpperCase() ?? '';

export function useAppState(): AppState {
  return useSyncExternalStore(client.subscribe, client.getState);
}
