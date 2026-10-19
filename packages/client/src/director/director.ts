import type { Sequence } from './sequences';

/** Horloge injectable (minuteries factices dans les tests). */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const browserClock: Clock = {
  now: () => performance.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface DirectorSnapshot {
  readonly current: Sequence | null;
  /** Durée réelle de la séquence en cours (après accélération). */
  readonly durationMs: number;
  /** Facteur d'accélération de la séquence en cours (1 = normal). */
  readonly speed: number;
  readonly queued: number;
}

export interface DirectorHooks {
  /** Une séquence commence ; `speed` divise les instants de ses repères. */
  onStart?(sequence: Sequence, speed: number): void;
  /** Une séquence se termine (normalement ou passée). */
  onEnd?(sequence: Sequence, skipped: boolean): void;
}

export interface DirectorOptions {
  /** Taille maximale de la file : au-delà, les séquences secondaires les plus anciennes sautent. */
  readonly maxQueue: number;
  /** Accélération maximale. */
  readonly maxSpeed: number;
}

const DEFAULT_OPTIONS: DirectorOptions = { maxQueue: 8, maxSpeed: 3 };

/**
 * Réalisateur : joue les séquences une par une. Chaque séquence est passable
 * (`skip`), la file peut être vidée (`skipAll`) et s'accélère quand elle
 * s'allonge ou quand c'est au joueur de jouer. Le réalisateur ne touche jamais
 * à l'état du jeu : il ne fait qu'ordonner des effets.
 */
export class Director {
  private queue: Sequence[] = [];
  private current: {
    sequence: Sequence;
    speed: number;
    durationMs: number;
    timer: unknown;
  } | null = null;
  private readonly listeners = new Set<() => void>();
  private baseSpeed = 1;
  private urgent = false;
  private snapshotCache: DirectorSnapshot = { current: null, durationMs: 0, speed: 1, queued: 0 };
  private readonly options: DirectorOptions;

  constructor(
    private readonly hooks: DirectorHooks = {},
    private readonly clock: Clock = browserClock,
    options: Partial<DirectorOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /** Vitesse de base (réglage « animations rapides »). */
  setBaseSpeed(speed: number): void {
    this.baseSpeed = Math.max(0.25, speed);
  }

  /** Vrai quand c'est au joueur : les séquences des autres sont raccourcies. */
  setUrgent(urgent: boolean): void {
    this.urgent = urgent;
  }

  enqueue(sequences: readonly Sequence[]): void {
    if (sequences.length === 0) return;
    this.queue.push(...sequences);
    this.trim();
    if (this.current) this.notify();
    else this.startNext();
  }

  /** Passe la séquence en cours. */
  skip(): void {
    if (!this.current) return;
    this.finish(true);
  }

  /** Vide la file : on saute directement à l'état final. */
  skipAll(): void {
    const dropped = this.queue;
    this.queue = [];
    for (const sequence of dropped) this.hooks.onEnd?.(sequence, true);
    if (this.current) this.finish(true);
    else this.notify();
  }

  snapshot(): DirectorSnapshot {
    return this.snapshotCache;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Accélération selon la longueur de la file et l'urgence. */
  private speedFor(): number {
    const backlog = this.queue.length;
    const backlogFactor = backlog >= 4 ? 2 : backlog >= 2 ? 1.4 : 1;
    const urgency = this.urgent ? 1.7 : 1;
    return Math.min(this.options.maxSpeed, this.baseSpeed * backlogFactor * urgency);
  }

  private trim(): void {
    while (this.queue.length > this.options.maxQueue) {
      const index = this.queue.findIndex((sequence) => !sequence.important);
      const [dropped] = this.queue.splice(index >= 0 ? index : 0, 1);
      if (dropped) this.hooks.onEnd?.(dropped, true);
    }
  }

  private startNext(): void {
    const sequence = this.queue.shift();
    if (!sequence) {
      this.notify();
      return;
    }
    const speed = this.speedFor();
    const durationMs = Math.round(sequence.duration / speed);
    const timer = this.clock.setTimeout(() => this.finish(false), durationMs);
    this.current = { sequence, speed, durationMs, timer };
    this.notify();
    this.hooks.onStart?.(sequence, speed);
  }

  private finish(skipped: boolean): void {
    const current = this.current;
    if (!current) return;
    this.clock.clearTimeout(current.timer);
    this.current = null;
    this.hooks.onEnd?.(current.sequence, skipped);
    this.startNext();
  }

  private notify(): void {
    this.snapshotCache = {
      current: this.current?.sequence ?? null,
      durationMs: this.current?.durationMs ?? 0,
      speed: this.current?.speed ?? 1,
      queued: this.queue.length,
    };
    for (const listener of this.listeners) listener();
  }
}
