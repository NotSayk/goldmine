import type { GameState, PlayerId } from '@pepite/engine';
import type { DwarfLook, RoomSettings, RoomStatus } from '@pepite/shared';
import type { SecureRng } from './secureRng';

export interface RoomPlayer {
  readonly id: PlayerId;
  name: string;
  readonly isBot: boolean;
  /** Jeton de session du joueur humain (secret, jamais diffusé). */
  sessionToken: string | null;
  connected: boolean;
  disconnectedAt: number | null;
  /** Humain remplacé par un bot (déconnexion prolongée ou départ). */
  botControlled: boolean;
  /** Humain parti définitivement pendant la partie. */
  left: boolean;
  /** Couleur, chapeau, barbe et teint choisis pour ses nains (cosmétique). */
  look: DwarfLook;
}

export interface Room {
  readonly code: string;
  hostId: PlayerId;
  status: RoomStatus;
  players: RoomPlayer[];
  settings: RoomSettings;
  game: GameState | null;
  rng: SecureRng | null;
  readonly createdAt: number;
  updatedAt: number;
}

/**
 * Stockage des salons. L'implémentation actuelle est en mémoire ; une
 * persistance (Redis, base de données) peut implémenter la même interface,
 * par exemple avec un cache mémoire et une écriture différée dans `save`.
 */
export interface RoomStore {
  get(code: string): Room | undefined;
  save(room: Room): void;
  delete(code: string): void;
  has(code: string): boolean;
  all(): Room[];
}

export class InMemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, Room>();

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  save(room: Room): void {
    this.rooms.set(room.code, room);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  has(code: string): boolean {
    return this.rooms.has(code);
  }

  all(): Room[] {
    return [...this.rooms.values()];
  }
}
