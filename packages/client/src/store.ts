import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import type { ExtractionKind, GameEvent, PlayerView } from '@pepite/engine';
import type { AutoPlay, ClientMessage, Emote, RoomView, ServerMessage } from '@pepite/shared';
import { runCues } from './director/cues';
import { Director, browserClock } from './director/director';
import {
  buildAutoPlaySequence,
  buildSequences,
  type Cue,
  type Sequence,
} from './director/sequences';
import { emitFx } from './fx/bus';
import { viewerGold, type GoldSample } from './fx/gold';
import { ERROR_MESSAGES, describeEvent, dwarfName } from './i18n/fr';
import { getPreferences, reducedMotion, subscribePreferences } from './preferences';

export type ConnectionState = 'connecting' | 'open' | 'reconnecting';

export interface LogEntry {
  readonly id: number;
  readonly round: number;
  readonly text: string;
  readonly tone: 'info' | 'danger' | 'success';
}

/** Dernière carte creusée, montrée à tous au moment de la pioche. */
export interface LastDrawn {
  readonly card: ExtractionKind;
  /** Nom de qui l'a piochée (« Vous » pour soi). */
  readonly by: string;
}

export interface Notice {
  readonly id: number;
  readonly text: string;
}

/** Réaction rapide affichée quelques secondes près du joueur qui l'a envoyée. */
export interface EmoteBubble {
  readonly id: number;
  readonly playerId: string;
  readonly emote: Emote;
}

export interface AppState {
  readonly connection: ConnectionState;
  readonly playerId: string | null;
  readonly room: RoomView | null;
  /** Dernière vue reçue : actions possibles et fenêtres de choix (jamais retardée). */
  readonly view: PlayerView | null;
  /**
   * Vue montrée sur la table : elle rattrape `view` au rythme des animations
   * (la carte piochée est retournée avant que le plateau ne change).
   */
  readonly boardView: PlayerView | null;
  readonly log: readonly LogEntry[];
  readonly notice: Notice | null;
  /** Une intention a été envoyée, la réponse du serveur est attendue. */
  readonly waiting: boolean;
  /** Séquence jouée par le réalisateur (coup mis au premier plan). */
  readonly sequence: Sequence | null;
  /** Durée réelle de la séquence en cours, en millisecondes. */
  readonly sequenceMs: number;
  /** Accélération de la séquence en cours (1 = normale). */
  readonly sequenceSpeed: number;
  /** Séquences en attente derrière celle en cours. */
  readonly queued: number;
  readonly lastDrawn: LastDrawn | null;
  /** Chrono du tour en cours, en heure locale (`null` si pas de chrono). */
  readonly turnTimer: { readonly deadline: number; readonly totalMs: number } | null;
  /** Or du joueur coup après coup (récapitulatif de fin de partie). */
  readonly goldHistory: readonly GoldSample[];
  readonly emotes: readonly EmoteBubble[];
}

/**
 * État de la table après un message du serveur, montré quand la séquence
 * correspondante le révèle. Les états sont appliqués dans l'ordre d'arrivée.
 */
interface Frame {
  readonly id: number;
  readonly view: PlayerView;
  readonly entries: readonly LogEntry[];
  /** `undefined` : dernière carte inchangée. */
  readonly lastDrawn: LastDrawn | null | undefined;
  readonly createdAt: number;
  /** Séquences de ce message pas encore terminées. */
  remaining: number;
  revealed: boolean;
}

const SESSION_KEY = 'pepite.session';
const LOG_LIMIT = 60;
/** Retard maximal de la table sur le serveur, quoi qu'il arrive aux animations. */
const MAX_BOARD_LAG_MS = 9000;
const FAST_SPEED = 1.6;
const EMOTE_MS = 2600;

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

type Screen = 'home' | 'lobby' | 'game';

function screenOf(state: AppState): Screen {
  if (!state.room) return 'home';
  return state.room.status === 'lobby' ? 'lobby' : 'game';
}

/** Repères joués selon les réglages : sans mouvement, seuls le son et la vibration restent. */
function acceptsCue(cue: Cue, urgent: boolean): boolean {
  if (cue.type === 'sound' || cue.type === 'vibrate' || cue.type === 'reveal') return true;
  if (reducedMotion()) return false;
  // Version courte quand c'est à vous de jouer : pas de travelling.
  return !(urgent && cue.type === 'camera');
}

function playCue(cue: Cue): void {
  switch (cue.type) {
    case 'sound':
      // Repère sonore conservé pour brancher un moteur audio plus tard (pas de son pour l'instant).
      return;
    case 'vibrate':
      if (getPreferences().vibration && typeof navigator.vibrate === 'function') {
        navigator.vibrate([...cue.pattern]);
      }
      return;
    case 'shake':
      emitFx({ type: 'shake', strength: cue.strength });
      return;
    case 'burst':
      emitFx({
        type: 'burst',
        effect: cue.effect,
        anchor: cue.anchor,
        count: cue.count,
        ...(cue.target ? { target: cue.target } : {}),
      });
      return;
    case 'camera':
      emitFx({ type: 'camera', position: cue.position, duration: cue.duration });
      return;
    case 'flameSweep':
      emitFx({ type: 'flameSweep', from: cue.from, to: cue.to });
      return;
    case 'reveal':
      return;
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
    boardView: null,
    log: [],
    notice: null,
    waiting: false,
    sequence: null,
    sequenceMs: 0,
    sequenceSpeed: 1,
    queued: 0,
    lastDrawn: null,
    turnTimer: null,
    goldHistory: [],
    emotes: [],
  };
  private readonly listeners = new Set<() => void>();
  private socket: WebSocket | null = null;
  private retries = 0;
  private outbox: ClientMessage[] = [];

  private frames: Frame[] = [];
  /** Message d'origine de chaque séquence en file. */
  private readonly frameOf = new Map<number, number>();
  /** Arrêt des repères de la séquence en cours. */
  private readonly stopCues = new Map<number, () => void>();
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private urgent = false;

  private readonly director = new Director({
    onStart: (sequence, speed) => {
      const urgent = this.urgent;
      this.stopCues.set(
        sequence.id,
        runCues(
          sequence,
          speed,
          {
            accepts: (cue) => acceptsCue(cue, urgent),
            onCue: (cue) => {
              if (cue.type === 'reveal') this.revealUpTo(this.frameOf.get(sequence.id));
              else playCue(cue);
            },
          },
          browserClock,
        ),
      );
    },
    onEnd: (sequence) => {
      // Arrêter les repères joue tout de suite un « reveal » encore à venir.
      this.stopCues.get(sequence.id)?.();
      this.stopCues.delete(sequence.id);
      const frameId = this.frameOf.get(sequence.id);
      this.frameOf.delete(sequence.id);
      const frame = this.frames.find((f) => f.id === frameId);
      if (frame) frame.remaining -= 1;
      this.flushFrames();
    },
  });

  constructor() {
    this.director.subscribe(() => {
      const snapshot = this.director.snapshot();
      this.set({
        sequence: snapshot.current,
        sequenceMs: snapshot.durationMs,
        sequenceSpeed: snapshot.speed,
        queued: snapshot.queued,
      });
    });
    const applySpeed = (): void =>
      this.director.setBaseSpeed(getPreferences().animationSpeed === 'fast' ? FAST_SPEED : 1);
    applySpeed();
    subscribePreferences(applySpeed);
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getState = (): AppState => this.state;

  private set(patch: Partial<AppState>): void {
    const before = screenOf(this.state);
    this.state = { ...this.state, ...patch };
    const notify = (): void => {
      for (const listener of this.listeners) listener();
    };
    // Changement d'écran : fondu enchaîné natif quand le navigateur le permet.
    if (
      screenOf(this.state) !== before &&
      typeof document.startViewTransition === 'function' &&
      !reducedMotion()
    ) {
      document.startViewTransition(() => flushSync(notify));
      return;
    }
    notify();
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
    // Le joueur agit : on saute à l'état final pour qu'il joue sur la table à jour.
    if (message.type === 'action') this.director.skipAll();
    this.socket.send(JSON.stringify(message));
    if (message.type === 'action') this.set({ waiting: true });
  }

  dismissNotice(): void {
    this.set({ notice: null });
  }

  /** Passe la séquence en cours (clic, Échap). */
  skipSequence(): void {
    this.director.skip();
  }

  /** Passe toutes les séquences en attente. */
  skipAllSequences(): void {
    this.director.skipAll();
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
        const leftGame = message.room === null || message.room.status === 'lobby';
        if (leftGame) this.resetTable();
        this.set({
          room: message.room,
          playerId: message.you,
          ...(leftGame
            ? {
                view: null,
                boardView: null,
                log: [],
                lastDrawn: null,
                turnTimer: null,
                goldHistory: [],
              }
            : {}),
        });
        // Un lien d'invitation (?salon=CODE) reste dans l'adresse tant qu'on n'a pas rejoint.
        if (message.room || wasInRoom) syncUrl(message.room?.code ?? null);
        break;
      }
      case 'game':
        this.set({
          turnTimer: message.turnTimer
            ? {
                deadline: Date.now() + message.turnTimer.remainingMs,
                totalMs: message.turnTimer.totalMs,
              }
            : null,
        });
        this.applyGame(message.view, message.events, message.autoPlay);
        break;
      case 'error': {
        const notice = { id: nextId++, text: ERROR_MESSAGES[message.code] ?? message.message };
        this.set({ waiting: false, notice });
        setTimeout(() => {
          if (this.state.notice?.id === notice.id) this.set({ notice: null });
        }, 6000);
        break;
      }
      case 'emote':
        this.showEmote(message.playerId, message.emote);
        break;
      case 'pong':
        break;
    }
  }

  private showEmote(playerId: string, emote: Emote): void {
    // Réactions des autres masquées si le joueur les a désactivées.
    if (!getPreferences().emotes && playerId !== this.state.playerId) return;
    const bubble = { id: nextId++, playerId, emote };
    this.set({ emotes: [...this.state.emotes.filter((e) => e.playerId !== playerId), bubble] });
    setTimeout(() => {
      this.set({ emotes: this.state.emotes.filter((e) => e.id !== bubble.id) });
    }, EMOTE_MS);
  }

  private applyGame(view: PlayerView, events: readonly GameEvent[], autoPlay?: AutoPlay): void {
    const entries: LogEntry[] = [];
    let lastDrawn: LastDrawn | null | undefined = undefined;
    for (const event of events) {
      if (event.type === 'RoundStarted') lastDrawn = null;
      if (event.type === 'CardDrawn' && event.deck === 'extraction') {
        lastDrawn = { card: event.card, by: dwarfName(view, event.dwarfId) };
      }
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
    }
    const sequences = [
      // Temps écoulé : la pièce tourne d'abord, puis le coup joué d'office.
      ...(autoPlay ? [buildAutoPlaySequence(autoPlay, view)] : []),
      ...buildSequences(events, view),
    ];

    // Nouvelle vue au milieu d'une séquence : la table saute à son état final.
    const current = this.director.snapshot().current;
    if (current) this.revealUpTo(this.frameOf.get(current.id));

    const frame: Frame = {
      id: nextId++,
      view,
      entries,
      lastDrawn,
      createdAt: Date.now(),
      remaining: sequences.length,
      revealed: false,
    };
    this.frames.push(frame);
    for (const sequence of sequences) this.frameOf.set(sequence.id, frame.id);
    this.urgent = view.legal.yourTurn;
    this.director.setUrgent(this.urgent);
    this.set({ view, waiting: false, ...(this.state.boardView ? {} : { boardView: view }) });
    this.director.enqueue(sequences);
    this.flushFrames();
    this.armWatchdog();
  }

  /** Montre sur la table l'état de ce message et de tous les précédents. */
  private revealUpTo(frameId: number | undefined): void {
    if (frameId === undefined) return;
    for (const frame of this.frames) if (frame.id <= frameId) frame.revealed = true;
    this.flushFrames();
  }

  private flushFrames(): void {
    let applied: Frame | null = null;
    let log = this.state.log;
    let lastDrawn = this.state.lastDrawn;
    while (this.frames[0] && (this.frames[0].revealed || this.frames[0].remaining <= 0)) {
      const frame = this.frames.shift()!;
      applied = frame;
      if (frame.entries.length > 0) log = [...log, ...frame.entries].slice(-LOG_LIMIT);
      if (frame.lastDrawn !== undefined) lastDrawn = frame.lastDrawn;
    }
    if (!applied) return;
    // Courbe d'or du joueur, pour le récapitulatif.
    let goldHistory = this.state.goldHistory;
    const gold = viewerGold(applied.view);
    const last = goldHistory[goldHistory.length - 1];
    if (gold !== null && (!last || last.gold !== gold || last.round !== applied.view.round)) {
      goldHistory = [...goldHistory, { round: applied.view.round, gold }];
    }
    this.set({ boardView: applied.view, log, lastDrawn, goldHistory });
  }

  /** Garde-fou : la table ne reste jamais longtemps en retard sur le serveur. */
  private armWatchdog(): void {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => {
      const oldest = this.frames[0];
      if (!oldest) {
        if (this.watchdog) clearInterval(this.watchdog);
        this.watchdog = null;
        return;
      }
      if (Date.now() - oldest.createdAt > MAX_BOARD_LAG_MS) this.revealUpTo(oldest.id);
    }, 500);
  }

  private resetTable(): void {
    this.frames = [];
    this.director.skipAll();
    this.frameOf.clear();
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
