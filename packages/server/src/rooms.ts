import { randomBytes } from 'node:crypto';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  createGame,
  createSeededRng,
  filterEventsFor,
  heuristicBot,
  randomInt,
  reduce,
  viewFor,
  type GameAction,
  type GameEvent,
  type Rng,
} from '@pepite/engine';
import {
  EMOTE_BURST,
  EMOTE_PER_SECOND,
  LOOK_VARIANTS,
  PACE,
  animationMs,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  parseClientMessage,
  type DwarfLook,
  type Emote,
  type AutoPlay,
  type ClientMessage,
  type ClientPlayerAction,
  type ConnectionStatus,
  type RoomView,
  type ServerErrorCode,
  type ServerMessage,
} from '@pepite/shared';
import { TokenBucket } from './rateLimit';
import type { Room, RoomPlayer, RoomStore } from './roomStore';
import { createSecureRng } from './secureRng';
import { MIN_CHOICE_MS, pickTimeoutMove } from './turnTimer';

/** Connexion WebSocket vue par le gestionnaire (indépendante de la bibliothèque). */
export interface Connection {
  send(message: ServerMessage): void;
  close(code: number, reason: string): void;
}

export interface RoomManagerOptions {
  /** Délai avant de pouvoir remplacer ou passer un joueur déconnecté. */
  graceMs: number;
  /** Pause avant chaque coup d'un bot (lisibilité côté client). */
  botDelayMs: number;
  /** Durée de vie d'un salon sans aucun humain connecté. */
  idleRoomTtlMs: number;
  /** Temps pour jouer un tour (joueurs humains), 0 pour désactiver le chrono. */
  turnTimeMs: number;
  /** Bots et chrono attendent la fin des animations du coup précédent (désactivé en test). */
  paceAnimations?: boolean;
  /** Limitation de débit par connexion : rafale maximale et messages par seconde. */
  rateLimit: { burst: number; perSecond: number };
  now?: () => number;
}

interface Session {
  readonly token: string;
  readonly playerId: string;
  roomCode: string | null;
}

interface ConnectionState {
  session: Session | null;
  readonly bucket: TokenBucket;
  dropped: number;
  lastRateLimitNotice: number;
}

const BOT_NAMES = ['Silex', 'Quartz', 'Mica', 'Onyx', 'Jaspe', 'Ambre', 'Agate', 'Opale'];

class RequestError extends Error {
  constructor(
    readonly code: ServerErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function fail(code: ServerErrorCode, message: string): never {
  throw new RequestError(code, message);
}

/** Apparence par défaut selon la place dans le salon : chacun a une silhouette différente. */
function defaultLook(seat: number): DwarfLook {
  return { hat: seat % LOOK_VARIANTS, beard: (seat + 1) % LOOK_VARIANTS };
}

function randomId(prefix: string): string {
  return `${prefix}${randomBytes(6).toString('base64url')}`;
}

/**
 * Logique des salons, indépendante du transport. Le serveur est autoritaire :
 * il valide chaque intention avec le moteur et n'envoie à chaque joueur que sa
 * vue filtrée (`viewFor`).
 */
export class RoomManager {
  private readonly sessions = new Map<string, Session>();
  private readonly connections = new Map<Connection, ConnectionState>();
  private readonly connectionBySession = new Map<string, Connection>();
  private readonly botTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Chrono du tour en cours par salon (clé : manche et numéro de tour). */
  private readonly turnClocks = new Map<
    string,
    { key: string; deadline: number; timer: ReturnType<typeof setTimeout> }
  >();
  private readonly lastStatuses = new Map<string, string>();
  /** Fin prévue des animations du dernier coup, par salon (rythme des bots et du chrono). */
  private readonly animationEnds = new Map<string, number>();
  /** Débit des réactions, par joueur. */
  private readonly emoteBuckets = new WeakMap<RoomPlayer, TokenBucket>();
  private readonly botRng: Rng = createSeededRng(randomBytes(16).toString('hex'));
  private readonly now: () => number;

  constructor(
    private readonly store: RoomStore,
    private readonly options: RoomManagerOptions,
  ) {
    this.now = options.now ?? Date.now;
  }

  // -------------------------------------------------------------------------
  // Connexions
  // -------------------------------------------------------------------------

  connect(connection: Connection): void {
    this.connections.set(connection, {
      session: null,
      bucket: new TokenBucket(
        this.options.rateLimit.burst,
        this.options.rateLimit.perSecond,
        this.now,
      ),
      dropped: 0,
      lastRateLimitNotice: 0,
    });
  }

  disconnect(connection: Connection): void {
    const state = this.connections.get(connection);
    this.connections.delete(connection);
    const session = state?.session;
    if (!session || this.connectionBySession.get(session.token) !== connection) return;
    this.connectionBySession.delete(session.token);
    const room = session.roomCode ? this.store.get(session.roomCode) : undefined;
    const player = room?.players.find((p) => p.id === session.playerId);
    if (room && player) {
      player.connected = false;
      player.disconnectedAt = this.now();
      this.touch(room);
      this.broadcastRoom(room);
    }
  }

  handle(connection: Connection, raw: string): void {
    const state = this.connections.get(connection);
    if (!state) return;
    if (!state.bucket.take()) {
      state.dropped += 1;
      if (state.dropped > 200) {
        connection.close(1008, 'Trop de messages');
        return;
      }
      if (this.now() - state.lastRateLimitNotice > 1000) {
        state.lastRateLimitNotice = this.now();
        this.sendError(connection, 'RATE_LIMITED', 'Trop de messages, ralentissez.');
      }
      return;
    }
    const parsed = parseClientMessage(raw);
    if (!parsed.ok) {
      this.sendError(connection, 'INVALID_MESSAGE', parsed.error);
      return;
    }
    try {
      this.dispatch(connection, state, parsed.message);
    } catch (error) {
      if (error instanceof RequestError) {
        this.sendError(connection, error.code, error.message);
      } else {
        throw error;
      }
    }
  }

  private dispatch(connection: Connection, state: ConnectionState, message: ClientMessage): void {
    if (message.type === 'ping') {
      connection.send({ type: 'pong' });
      return;
    }
    if (message.type === 'hello') {
      this.hello(connection, state, message.sessionToken);
      return;
    }
    const session = state.session ?? fail('SESSION_REQUIRED', 'Envoyez d’abord « hello ».');
    switch (message.type) {
      case 'createRoom':
        return this.createRoom(session, message.name);
      case 'joinRoom':
        return this.joinRoom(session, message.code, message.name);
      case 'leaveRoom':
        return this.leaveRoom(session);
      case 'updateSettings':
        return this.updateSettings(session, message);
      case 'addBot':
        return this.addBot(session);
      case 'removePlayer':
        return this.removePlayer(session, message.playerId);
      case 'startGame':
        return this.startGame(session);
      case 'action':
        return this.playerAction(session, message.action);
      case 'nextRound':
        return this.nextRound(session);
      case 'replaceWithBot':
        return this.replaceWithBot(session, message.playerId);
      case 'skipPlayer':
        return this.skipPlayer(session, message.playerId);
      case 'backToLobby':
        return this.backToLobby(session);
      case 'setLook':
        return this.setLook(session, { hat: message.hat, beard: message.beard });
      case 'emote':
        return this.emote(session, message.emote);
    }
  }

  private hello(connection: Connection, state: ConnectionState, token: string | undefined): void {
    let session = token ? this.sessions.get(token) : undefined;
    if (!session) {
      session = {
        token: randomBytes(24).toString('base64url'),
        playerId: randomId('p_'),
        roomCode: null,
      };
      this.sessions.set(session.token, session);
    }
    // Une seule connexion par session : l'ancienne (onglet fermé, réseau coupé) est remplacée.
    const previous = this.connectionBySession.get(session.token);
    if (previous && previous !== connection) {
      const previousState = this.connections.get(previous);
      if (previousState) previousState.session = null;
      previous.close(4000, 'Session reprise ailleurs');
    }
    if (state.session && state.session !== session) {
      this.connectionBySession.delete(state.session.token);
    }
    state.session = session;
    this.connectionBySession.set(session.token, connection);
    connection.send({ type: 'welcome', sessionToken: session.token, playerId: session.playerId });

    const room = session.roomCode ? this.store.get(session.roomCode) : undefined;
    const player = room?.players.find((p) => p.id === session.playerId);
    if (!room || !player) {
      session.roomCode = null;
      connection.send({ type: 'room', room: null, you: session.playerId });
      return;
    }
    player.connected = true;
    player.disconnectedAt = null;
    // Le joueur reprend la main sur son nain.
    player.botControlled = false;
    this.touch(room);
    this.broadcastRoom(room);
    if (this.updateTurnClock(room)) {
      this.broadcastGame(room, []);
    } else if (room.game) {
      connection.send(this.gameMessage(room, player.id, []));
    }
  }

  // -------------------------------------------------------------------------
  // Salon
  // -------------------------------------------------------------------------

  private createRoom(session: Session, name: string): void {
    this.leaveCurrentRoom(session);
    const room: Room = {
      code: this.generateCode(),
      hostId: session.playerId,
      status: 'lobby',
      players: [this.humanPlayer(session, name)],
      settings: { doubleDraw: false, firstPlayer: 'random' },
      game: null,
      rng: null,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.store.save(room);
    session.roomCode = room.code;
    this.broadcastRoom(room);
  }

  private joinRoom(session: Session, code: string, name: string): void {
    const room = this.store.get(code) ?? fail('ROOM_NOT_FOUND', `Aucun salon « ${code} ».`);
    if (session.roomCode === room.code && room.players.some((p) => p.id === session.playerId)) {
      this.broadcastRoom(room);
      return;
    }
    if (room.status !== 'lobby') fail('GAME_IN_PROGRESS', 'La partie a déjà commencé.');
    if (room.players.length >= MAX_PLAYERS) fail('ROOM_FULL', 'Le salon est complet (6 joueurs).');
    this.leaveCurrentRoom(session);
    room.players.push(this.humanPlayer(session, this.uniqueName(room, name), room.players.length));
    session.roomCode = room.code;
    this.touch(room);
    this.broadcastRoom(room);
  }

  private leaveRoom(session: Session): void {
    if (!session.roomCode) fail('NOT_IN_ROOM', 'Vous n’êtes dans aucun salon.');
    this.leaveCurrentRoom(session);
    this.sendTo(session, { type: 'room', room: null, you: session.playerId });
  }

  private leaveCurrentRoom(session: Session): void {
    const room = session.roomCode ? this.store.get(session.roomCode) : undefined;
    session.roomCode = null;
    if (!room) return;
    const player = room.players.find((p) => p.id === session.playerId);
    if (!player) return;
    if (room.status === 'lobby') {
      room.players = room.players.filter((p) => p !== player);
    } else {
      // En cours de partie, un bot prend définitivement sa place.
      player.left = true;
      player.botControlled = true;
      player.connected = false;
      player.sessionToken = null;
      player.disconnectedAt = this.now();
    }
    this.afterPlayerLeft(room);
  }

  private afterPlayerLeft(room: Room): void {
    const humans = room.players.filter((p) => !p.isBot && !p.left);
    if (humans.length === 0) {
      this.deleteRoom(room);
      return;
    }
    if (!humans.some((p) => p.id === room.hostId)) room.hostId = humans[0]!.id;
    if (
      room.settings.firstPlayer !== 'random' &&
      !room.players.some((p) => p.id === room.settings.firstPlayer)
    ) {
      room.settings = { ...room.settings, firstPlayer: 'random' };
    }
    this.touch(room);
    this.broadcastRoom(room);
    this.scheduleBot(room);
  }

  private updateSettings(
    session: Session,
    message: Extract<ClientMessage, { type: 'updateSettings' }>,
  ): void {
    const room = this.requireHostRoom(session);
    if (room.status !== 'lobby')
      fail('GAME_IN_PROGRESS', 'Réglages modifiables dans le salon uniquement.');
    if (
      message.firstPlayer !== undefined &&
      message.firstPlayer !== 'random' &&
      !room.players.some((p) => p.id === message.firstPlayer)
    ) {
      fail('INVALID_SETTINGS', 'Ce joueur n’est pas dans le salon.');
    }
    room.settings = {
      doubleDraw: message.doubleDraw ?? room.settings.doubleDraw,
      firstPlayer: message.firstPlayer ?? room.settings.firstPlayer,
    };
    this.touch(room);
    this.broadcastRoom(room);
  }

  private addBot(session: Session): void {
    const room = this.requireHostRoom(session);
    if (room.status !== 'lobby') fail('GAME_IN_PROGRESS', 'La partie a déjà commencé.');
    if (room.players.length >= MAX_PLAYERS) fail('ROOM_FULL', 'Le salon est complet (6 joueurs).');
    const taken = new Set(room.players.map((p) => p.name));
    const base = BOT_NAMES.find((n) => !taken.has(`Bot ${n}`)) ?? 'Mineur';
    room.players.push({
      id: randomId('b_'),
      name: this.uniqueName(room, `Bot ${base}`),
      isBot: true,
      sessionToken: null,
      connected: true,
      disconnectedAt: null,
      botControlled: true,
      left: false,
      look: defaultLook(room.players.length),
    });
    this.touch(room);
    this.broadcastRoom(room);
  }

  // -------------------------------------------------------------------------
  // Apparence et réactions (cosmétique, sans effet sur la partie)
  // -------------------------------------------------------------------------

  private setLook(session: Session, look: DwarfLook): void {
    const room = this.requireRoom(session);
    if (room.status !== 'lobby') fail('GAME_IN_PROGRESS', 'L’apparence se choisit dans le salon.');
    const player = room.players.find((p) => p.id === session.playerId);
    if (!player) fail('NOT_IN_ROOM', 'Vous n’êtes dans aucun salon.');
    player.look = look;
    this.touch(room);
    this.broadcastRoom(room);
  }

  private emote(session: Session, emote: Emote): void {
    const room = this.requireRoom(session);
    const player = room.players.find((p) => p.id === session.playerId);
    if (!player) fail('NOT_IN_ROOM', 'Vous n’êtes dans aucun salon.');
    let bucket = this.emoteBuckets.get(player);
    if (!bucket) {
      bucket = new TokenBucket(EMOTE_BURST, EMOTE_PER_SECOND, this.now);
      this.emoteBuckets.set(player, bucket);
    }
    if (!bucket.take()) fail('RATE_LIMITED', 'Une réaction à la fois !');
    for (const member of room.players) {
      if (!member.sessionToken) continue;
      const target = this.sessions.get(member.sessionToken);
      if (target?.roomCode === room.code) {
        this.sendTo(target, { type: 'emote', playerId: player.id, emote });
      }
    }
  }

  private removePlayer(session: Session, playerId: string): void {
    const room = this.requireHostRoom(session);
    if (room.status !== 'lobby') fail('GAME_IN_PROGRESS', 'La partie a déjà commencé.');
    if (playerId === session.playerId)
      fail('INVALID_SETTINGS', 'Utilisez « Quitter » pour partir.');
    const player =
      room.players.find((p) => p.id === playerId) ??
      fail('PLAYER_NOT_FOUND', 'Joueur introuvable.');
    room.players = room.players.filter((p) => p !== player);
    if (player.sessionToken) {
      const kicked = this.sessions.get(player.sessionToken);
      if (kicked) {
        kicked.roomCode = null;
        this.sendTo(kicked, { type: 'room', room: null, you: kicked.playerId });
      }
    }
    this.afterPlayerLeft(room);
  }

  private startGame(session: Session): void {
    const room = this.requireHostRoom(session);
    if (room.status !== 'lobby') fail('GAME_IN_PROGRESS', 'La partie a déjà commencé.');
    if (room.players.length < MIN_PLAYERS) {
      fail('NOT_ENOUGH_PLAYERS', `Il faut au moins ${MIN_PLAYERS} joueurs (ajoutez un bot).`);
    }
    const rng = createSecureRng();
    const players = room.players.map((p) => ({ id: p.id, name: p.name }));
    const chosen = room.settings.firstPlayer;
    const firstPlayerId =
      chosen !== 'random' && players.some((p) => p.id === chosen)
        ? chosen
        : players[randomInt(rng, players.length)]!.id;
    const { state, events } = createGame(
      {
        players,
        firstPlayerId,
        doubleDraw: room.settings.doubleDraw && players.length === 2,
      },
      rng,
    );
    room.game = state;
    room.rng = rng;
    room.status = 'playing';
    this.touch(room);
    this.broadcastRoom(room);
    this.noteAnimation(room, events);
    this.updateTurnClock(room);
    this.broadcastGame(room, events);
    this.scheduleBot(room);
  }

  private backToLobby(session: Session): void {
    const room = this.requireHostRoom(session);
    if (room.status !== 'finished') fail('GAME_IN_PROGRESS', 'La partie n’est pas terminée.');
    room.players = room.players.filter((p) => !p.left);
    for (const player of room.players) if (!player.isBot) player.botControlled = false;
    room.status = 'lobby';
    room.game = null;
    room.rng = null;
    this.clearTurnClock(room.code);
    this.touch(room);
    this.broadcastRoom(room);
  }

  // -------------------------------------------------------------------------
  // Partie
  // -------------------------------------------------------------------------

  private playerAction(session: Session, action: ClientPlayerAction): void {
    const room = this.requireRoom(session);
    if (!room.game || !room.rng) fail('GAME_NOT_STARTED', 'La partie n’a pas commencé.');
    this.apply(room, { ...action, playerId: session.playerId });
  }

  private nextRound(session: Session): void {
    const room = this.requireHostRoom(session);
    if (!room.game) fail('GAME_NOT_STARTED', 'La partie n’a pas commencé.');
    this.apply(room, { type: 'startNextRound' });
  }

  private replaceWithBot(session: Session, playerId: string): void {
    const room = this.requireHostRoom(session);
    if (!room.game) fail('GAME_NOT_STARTED', 'La partie n’a pas commencé.');
    const player = this.requireAwayPlayer(room, playerId);
    player.botControlled = true;
    this.touch(room);
    this.broadcastRoom(room);
    if (this.updateTurnClock(room)) this.broadcastGame(room, []);
    this.scheduleBot(room);
  }

  private skipPlayer(session: Session, playerId: string): void {
    const room = this.requireHostRoom(session);
    const game = room.game ?? fail('GAME_NOT_STARTED', 'La partie n’a pas commencé.');
    this.requireAwayPlayer(room, playerId);
    const current = game.currentDwarf === null ? undefined : game.dwarves[game.currentDwarf];
    if (current?.ownerId !== playerId)
      fail('NOT_PLAYERS_TURN', 'Ce n’est pas le tour de ce joueur.');
    this.apply(room, { type: 'skipTurn' });
  }

  /** Applique une action via le moteur, puis diffuse les vues filtrées. */
  private apply(room: Room, action: GameAction, autoPlay?: AutoPlay): void {
    if (!room.game || !room.rng) fail('GAME_NOT_STARTED', 'La partie n’a pas commencé.');
    const result = reduce(room.game, action, room.rng);
    if (!result.ok) fail(result.error.code, result.error.message);
    room.game = result.state;
    const statusBefore = room.status;
    if (result.state.phase === 'finished') room.status = 'finished';
    this.touch(room);
    if (room.status !== statusBefore) this.broadcastRoom(room);
    this.noteAnimation(room, result.events, autoPlay !== undefined);
    this.updateTurnClock(room);
    this.broadcastGame(room, result.events, autoPlay);
    this.scheduleBot(room);
  }

  /** Retient quand les joueurs auront fini de voir ce coup. */
  private noteAnimation(room: Room, events: readonly GameEvent[], autoPlay = false): void {
    this.animationEnds.set(room.code, this.now() + animationMs(events, autoPlay));
  }

  /** Temps d'animation encore à voir chez les joueurs. */
  private animationLeft(room: Room): number {
    if (this.options.paceAnimations === false) return 0;
    return Math.max(0, (this.animationEnds.get(room.code) ?? 0) - this.now());
  }

  // -------------------------------------------------------------------------
  // Chrono du tour
  // -------------------------------------------------------------------------

  /**
   * Démarre, prolonge ou arrête le chrono selon le tour en cours. Un humain a
   * `turnTimeMs` par tour ; s'il pioche une carte Exit à choisir, il garde au
   * moins `MIN_CHOICE_MS`. Les bots ne sont pas chronométrés. Retourne vrai si
   * le chrono a changé (les clients doivent alors en être informés).
   */
  private updateTurnClock(room: Room): boolean {
    const game = room.game;
    const total = this.options.turnTimeMs;
    const existing = this.turnClocks.get(room.code);
    if (
      !game ||
      total <= 0 ||
      game.phase !== 'playing' ||
      game.currentDwarf === null ||
      this.botActor(room)
    ) {
      if (!existing) return false;
      this.clearTurnClock(room.code);
      return true;
    }
    const now = this.now();
    const key = `${game.round}:${game.turn}`;
    // Le chrono ne mange pas le temps des animations du coup précédent.
    let deadline =
      existing?.key === key ? existing.deadline : now + total + this.animationLeft(room);
    if (game.pending) deadline = Math.max(deadline, now + Math.min(MIN_CHOICE_MS, total));
    if (existing?.key === key && existing.deadline === deadline) return false;
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => this.onTurnTimeout(room.code, key), deadline - now);
    this.turnClocks.set(room.code, { key, deadline, timer });
    return true;
  }

  private clearTurnClock(code: string): void {
    const clock = this.turnClocks.get(code);
    if (clock) clearTimeout(clock.timer);
    this.turnClocks.delete(code);
  }

  /** Temps écoulé : pile ou face, et le coup est joué pour le joueur. */
  private onTurnTimeout(code: string, key: string): void {
    const clock = this.turnClocks.get(code);
    if (clock?.key !== key) return;
    this.turnClocks.delete(code);
    const room = this.store.get(code);
    if (!room?.game) return;
    const move = pickTimeoutMove(room.game, this.botRng);
    if (!move) return;
    try {
      this.apply(room, move.action, move.autoPlay);
    } catch (error) {
      if (!(error instanceof RequestError)) throw error;
      // Ne devrait jamais arriver : le coup est choisi parmi les actions légales.
      if (room.game.phase === 'playing') this.apply(room, { type: 'skipTurn' });
    }
  }

  /** Joueur que le serveur doit faire jouer (bot ou humain remplacé), sinon `null`. */
  private botActor(room: Room): RoomPlayer | null {
    const game = room.game;
    if (!game || game.phase !== 'playing' || game.currentDwarf === null) return null;
    const ownerId = game.dwarves[game.currentDwarf]?.ownerId;
    const player = room.players.find((p) => p.id === ownerId);
    return player && (player.isBot || player.botControlled) ? player : null;
  }

  /**
   * Un bot joue une fois le coup précédent montré à tous (même rythme qu'un
   * joueur), et jamais avant `botDelayMs` ; `botDelayMs` à 0 le fait jouer
   * aussitôt (tests).
   */
  private scheduleBot(room: Room): void {
    if (this.botTimers.has(room.code) || !this.botActor(room)) return;
    const delay =
      this.options.botDelayMs <= 0
        ? 0
        : Math.max(this.options.botDelayMs, this.animationLeft(room) + PACE.botThinkMs);
    const timer = setTimeout(() => {
      this.botTimers.delete(room.code);
      this.playBot(room.code);
    }, delay);
    this.botTimers.set(room.code, timer);
  }

  private playBot(code: string): void {
    const room = this.store.get(code);
    if (!room?.game) return;
    const actor = this.botActor(room);
    if (!actor) return;
    const intent = heuristicBot(viewFor(room.game, actor.id), this.botRng);
    try {
      this.apply(room, intent ? { ...intent, playerId: actor.id } : { type: 'skipTurn' });
    } catch (error) {
      if (!(error instanceof RequestError)) throw error;
      // Ne devrait jamais arriver : le bot ne propose que des actions légales.
      this.apply(room, { type: 'skipTurn' });
    }
  }

  // -------------------------------------------------------------------------
  // Maintenance périodique
  // -------------------------------------------------------------------------

  /** Fin des délais de grâce, transfert d'hôte, ménage des salons abandonnés. */
  sweep(): void {
    const now = this.now();
    for (const room of this.store.all()) {
      const humans = room.players.filter((p) => !p.isBot && !p.left);
      if (!humans.some((p) => p.connected) && now - room.updatedAt > this.options.idleRoomTtlMs) {
        this.deleteRoom(room);
        continue;
      }
      const host = room.players.find((p) => p.id === room.hostId);
      if (host && this.connectionStatus(host) === 'away') {
        const replacement = humans.find((p) => p.connected);
        if (replacement) room.hostId = replacement.id;
      }
      const signature = room.hostId + room.players.map((p) => this.connectionStatus(p)).join(',');
      if (this.lastStatuses.get(room.code) !== signature) {
        this.lastStatuses.set(room.code, signature);
        this.broadcastRoom(room);
      }
    }
  }

  close(): void {
    for (const timer of this.botTimers.values()) clearTimeout(timer);
    this.botTimers.clear();
    for (const code of [...this.turnClocks.keys()]) this.clearTurnClock(code);
  }

  roomCount(): number {
    return this.store.all().length;
  }

  // -------------------------------------------------------------------------
  // Outils
  // -------------------------------------------------------------------------

  private deleteRoom(room: Room): void {
    const timer = this.botTimers.get(room.code);
    if (timer) clearTimeout(timer);
    this.botTimers.delete(room.code);
    this.clearTurnClock(room.code);
    this.lastStatuses.delete(room.code);
    this.animationEnds.delete(room.code);
    for (const player of room.players) {
      const session = player.sessionToken ? this.sessions.get(player.sessionToken) : undefined;
      if (session?.roomCode === room.code) session.roomCode = null;
    }
    this.store.delete(room.code);
  }

  private humanPlayer(session: Session, name: string, seat = 0): RoomPlayer {
    return {
      id: session.playerId,
      name,
      isBot: false,
      sessionToken: session.token,
      connected: this.connectionBySession.has(session.token),
      disconnectedAt: null,
      botControlled: false,
      left: false,
      look: defaultLook(seat),
    };
  }

  private uniqueName(room: Room, name: string): string {
    const taken = new Set(room.players.map((p) => p.name));
    if (!taken.has(name)) return name;
    for (let i = 2; ; i++) {
      const candidate = `${name.slice(0, 16)} (${i})`;
      if (!taken.has(candidate)) return candidate;
    }
  }

  private generateCode(): string {
    for (;;) {
      const bytes = randomBytes(ROOM_CODE_LENGTH);
      const code = [...bytes]
        .map((b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length])
        .join('');
      if (!this.store.has(code)) return code;
    }
  }

  private requireRoom(session: Session): Room {
    const room = session.roomCode ? this.store.get(session.roomCode) : undefined;
    if (!room || !room.players.some((p) => p.id === session.playerId)) {
      fail('NOT_IN_ROOM', 'Vous n’êtes dans aucun salon.');
    }
    return room;
  }

  private requireHostRoom(session: Session): Room {
    const room = this.requireRoom(session);
    if (room.hostId !== session.playerId) fail('NOT_HOST', 'Seul l’hôte peut faire cela.');
    return room;
  }

  private requireAwayPlayer(room: Room, playerId: string): RoomPlayer {
    const player =
      room.players.find((p) => p.id === playerId && !p.isBot) ??
      fail('PLAYER_NOT_FOUND', 'Joueur introuvable.');
    if (player.connected) fail('PLAYER_CONNECTED', 'Ce joueur est connecté.');
    if (this.connectionStatus(player) !== 'away') {
      fail('GRACE_NOT_EXPIRED', 'Laissez-lui le temps de se reconnecter.');
    }
    return player;
  }

  private connectionStatus(player: RoomPlayer): ConnectionStatus {
    if (player.isBot || player.connected) return 'online';
    const since = player.disconnectedAt ?? 0;
    return this.now() - since >= this.options.graceMs ? 'away' : 'offline';
  }

  private touch(room: Room): void {
    room.updatedAt = this.now();
    this.store.save(room);
  }

  roomView(room: Room): RoomView {
    return {
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        isHost: p.id === room.hostId,
        connection: this.connectionStatus(p),
        botControlled: !p.isBot && p.botControlled,
        look: p.look,
      })),
      settings: room.settings,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      graceMs: this.options.graceMs,
    };
  }

  private sendTo(session: Session, message: ServerMessage): void {
    this.connectionBySession.get(session.token)?.send(message);
  }

  private sendError(connection: Connection, code: ServerErrorCode, message: string): void {
    connection.send({ type: 'error', code, message });
  }

  private broadcastRoom(room: Room): void {
    const view = this.roomView(room);
    for (const player of room.players) {
      if (!player.sessionToken) continue;
      const session = this.sessions.get(player.sessionToken);
      if (session?.roomCode === room.code)
        this.sendTo(session, { type: 'room', room: view, you: player.id });
    }
  }

  private gameMessage(
    room: Room,
    playerId: string,
    events: readonly GameEvent[],
    autoPlay?: AutoPlay,
  ): ServerMessage {
    const game = room.game;
    if (!game) throw new Error('Aucune partie en cours.');
    const clock = this.turnClocks.get(room.code);
    return {
      type: 'game',
      view: viewFor(game, playerId),
      events: filterEventsFor(events, game, playerId),
      turnTimer: clock
        ? {
            remainingMs: Math.max(0, clock.deadline - this.now()),
            totalMs: this.options.turnTimeMs,
          }
        : null,
      ...(autoPlay ? { autoPlay } : {}),
    };
  }

  private broadcastGame(room: Room, events: readonly GameEvent[], autoPlay?: AutoPlay): void {
    if (!room.game) return;
    for (const player of room.players) {
      if (!player.sessionToken) continue;
      const session = this.sessions.get(player.sessionToken);
      if (session?.roomCode !== room.code) continue;
      this.sendTo(session, this.gameMessage(room, player.id, events, autoPlay));
    }
  }
}
