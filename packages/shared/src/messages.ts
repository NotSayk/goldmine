import { z } from 'zod';
import type { ErrorCode, GameEvent, PlayerId, PlayerView } from '@pepite/engine';

export const ROOM_CODE_LENGTH = 5;
/** Alphabet des codes de salon, sans caractères ambigus (0/O, 1/I). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PLAYER_NAME_MAX_LENGTH = 20;
/** Taille maximale d'un message entrant, en octets. */
export const MAX_MESSAGE_BYTES = 2048;

const playerName = z
  .string()
  .transform((name) => name.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(1).max(PLAYER_NAME_MAX_LENGTH));
const roomCode = z
  .string()
  .transform((code) => code.trim().toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{4,5}$/));
const sessionToken = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);
const playerId = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);

/** Intentions de jeu (le joueur est déduit de la session, jamais du message). */
export const playerActionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('drawExtraction') }),
  z.strictObject({ type: z.literal('drawExit') }),
  z.strictObject({ type: z.literal('chooseExitAction'), index: z.number().int().min(0).max(1) }),
  z.strictObject({ type: z.literal('chooseSwapTarget'), dwarfId: z.number().int().min(0).max(5) }),
]);

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('hello'), sessionToken: sessionToken.optional() }),
  z.strictObject({ type: z.literal('createRoom'), name: playerName }),
  z.strictObject({ type: z.literal('joinRoom'), code: roomCode, name: playerName }),
  z.strictObject({ type: z.literal('leaveRoom') }),
  z.strictObject({
    type: z.literal('updateSettings'),
    doubleDraw: z.boolean().optional(),
    firstPlayer: z.union([z.literal('random'), playerId]).optional(),
  }),
  z.strictObject({ type: z.literal('addBot') }),
  z.strictObject({ type: z.literal('removePlayer'), playerId }),
  z.strictObject({ type: z.literal('startGame') }),
  z.strictObject({ type: z.literal('action'), action: playerActionSchema }),
  z.strictObject({ type: z.literal('nextRound') }),
  z.strictObject({ type: z.literal('replaceWithBot'), playerId }),
  z.strictObject({ type: z.literal('skipPlayer'), playerId }),
  z.strictObject({ type: z.literal('backToLobby') }),
  z.strictObject({ type: z.literal('ping') }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ClientPlayerAction = z.infer<typeof playerActionSchema>;

export type ParseResult =
  | { readonly ok: true; readonly message: ClientMessage }
  | { readonly ok: false; readonly error: string };

/** Décode et valide un message brut reçu d'un client. */
export function parseClientMessage(raw: string): ParseResult {
  if (raw.length > MAX_MESSAGE_BYTES) return { ok: false, error: 'Message trop long.' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSON invalide.' };
  }
  const parsed = clientMessageSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Message invalide.' };
  }
  return { ok: true, message: parsed.data };
}

export type RoomStatus = 'lobby' | 'playing' | 'finished';

/** `offline` : coupure récente (délai de grâce) ; `away` : délai de grâce écoulé. */
export type ConnectionStatus = 'online' | 'offline' | 'away';

export interface RoomPlayerView {
  readonly id: PlayerId;
  readonly name: string;
  readonly isBot: boolean;
  readonly isHost: boolean;
  readonly connection: ConnectionStatus;
  /** Joueur humain temporairement remplacé par un bot. */
  readonly botControlled: boolean;
}

export interface RoomSettings {
  readonly doubleDraw: boolean;
  /** Premier joueur de la manche 1 (« le plus jeune »), ou `'random'` pour un tirage au sort. */
  readonly firstPlayer: PlayerId;
}

export interface RoomView {
  readonly code: string;
  readonly hostId: PlayerId;
  readonly status: RoomStatus;
  readonly players: readonly RoomPlayerView[];
  readonly settings: RoomSettings;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly graceMs: number;
}

export type ServerErrorCode =
  | ErrorCode
  | 'INVALID_MESSAGE'
  | 'RATE_LIMITED'
  | 'SESSION_REQUIRED'
  | 'NOT_IN_ROOM'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_IN_PROGRESS'
  | 'GAME_NOT_STARTED'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'INVALID_SETTINGS'
  | 'PLAYER_NOT_FOUND'
  | 'PLAYER_CONNECTED'
  | 'GRACE_NOT_EXPIRED'
  | 'NOT_PLAYERS_TURN';

export type ServerMessage =
  | { readonly type: 'welcome'; readonly sessionToken: string; readonly playerId: PlayerId }
  | { readonly type: 'room'; readonly room: RoomView | null; readonly you: PlayerId }
  | { readonly type: 'game'; readonly view: PlayerView; readonly events: readonly GameEvent[] }
  | { readonly type: 'error'; readonly code: ServerErrorCode; readonly message: string }
  | { readonly type: 'pong' };
