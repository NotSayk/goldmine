import {
  createGame,
  createSeededRng,
  reduce,
  type DeckComposition,
  type DwarfId,
  type ExitActionKind,
  type ExtractionKind,
  type GameAction,
  type GameEvent,
  type GameState,
  type PlayerInfo,
  type Rng,
} from '../src';

export function makePlayers(count: number): PlayerInfo[] {
  return Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
}

export interface NewGameOptions {
  players?: number;
  doubleDraw?: boolean;
  seed?: string;
  firstPlayerId?: string;
  decks?: DeckComposition;
}

export function newGame(options: NewGameOptions = {}): {
  state: GameState;
  rng: Rng;
  events: GameEvent[];
} {
  const rng = createSeededRng(options.seed ?? 'test');
  const players = makePlayers(options.players ?? 3);
  const created = createGame(
    {
      players,
      firstPlayerId: options.firstPlayerId ?? 'p1',
      doubleDraw: options.doubleDraw ?? false,
      ...(options.decks ? { decks: options.decks } : {}),
    },
    rng,
  );
  return { ...created, rng };
}

/** Applique une action légale ; échoue le test sinon. */
export function act(
  state: GameState,
  action: GameAction,
  rng: Rng = createSeededRng('act'),
): { state: GameState; events: GameEvent[] } {
  const result = reduce(state, action, rng);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return { state: result.state, events: result.events };
}

/** Joueur propriétaire du nain actif. */
export function currentPlayer(state: GameState): string {
  const dwarf = state.currentDwarf === null ? undefined : state.dwarves[state.currentDwarf];
  if (!dwarf) throw new Error('Aucun nain actif');
  return dwarf.ownerId;
}

export function play(
  state: GameState,
  action:
    | { type: 'drawExtraction' }
    | { type: 'drawExit' }
    | { type: 'chooseExitAction'; index: number }
    | { type: 'chooseSwapTarget'; dwarfId: DwarfId },
  rng?: Rng,
): { state: GameState; events: GameEvent[] } {
  return act(state, { ...action, playerId: currentPlayer(state) }, rng);
}

/**
 * Place des cartes Extraction des types demandés sur le dessus de la pioche,
 * en les prenant dans la pioche elle-même (aucune carte créée ni perdue).
 */
export function stackExtraction(state: GameState, kinds: readonly ExtractionKind[]): void {
  const remaining = [...state.extractionDeck];
  const top = kinds.map((kind) => {
    const index = remaining.findIndex((card) => card.kind === kind);
    if (index < 0) throw new Error(`Plus de carte ${kind} dans la pioche`);
    return remaining.splice(index, 1)[0]!;
  });
  state.extractionDeck = [...top, ...remaining];
}

/** Place des cartes Exit (identifiées par leurs actions) sur le dessus de la pioche Exit. */
export function stackExit(state: GameState, cards: readonly (readonly ExitActionKind[])[]): void {
  const remaining = [...state.exitDeck];
  const top = cards.map((actions) => {
    const index = remaining.findIndex((card) => card.actions.join('|') === actions.join('|'));
    if (index < 0) throw new Error(`Plus de carte ${actions.join('/')} dans la pioche Exit`);
    return remaining.splice(index, 1)[0]!;
  });
  state.exitDeck = [...top, ...remaining];
}

/** Déplace des nains directement (mise en situation). */
export function place(state: GameState, positions: Record<number, number>): void {
  for (const [id, position] of Object.entries(positions)) {
    const dwarf = state.dwarves[Number(id)];
    if (!dwarf) throw new Error(`Nain ${id} inconnu`);
    dwarf.position = position;
  }
}

export function eventsOfType<T extends GameEvent['type']>(
  events: readonly GameEvent[],
  type: T,
): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

/** Composition avec des cartes Exit à deux actions, pour les tests de choix. */
export const DUAL_ACTION_DECKS: DeckComposition = {
  extraction: { dragon: 8, redDoor: 20, blueDoor: 20, noDoor: 10 },
  exit: [
    { actions: ['step', 'swap'], count: 4 },
    { actions: ['goldBonus', 'doubleStep'], count: 4 },
    { actions: ['swap', 'swap'], count: 2 },
    { actions: ['allTogether'], count: 3 },
    { actions: ['step', 'step'], count: 3 },
  ],
};

/** Tous les identifiants de cartes présents dans l'état (pour la conservation). */
export function allCardIds(state: GameState): { extraction: string[]; exit: string[] } {
  const extraction = [
    ...state.extractionDeck,
    ...state.box.extraction,
    ...Object.values(state.piles).flatMap((p) => p.extraction),
    ...state.dwarves.flatMap((d) => d.secured.extraction),
  ].map((c) => c.id);
  const exit = [
    ...state.exitDeck,
    ...state.exitDiscard,
    ...state.box.exit,
    ...(state.pending ? [state.pending.card] : []),
    ...Object.values(state.piles).flatMap((p) => p.bonus),
    ...state.dwarves.flatMap((d) => d.secured.bonus),
  ].map((c) => c.id);
  return { extraction, exit };
}
