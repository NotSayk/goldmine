import type { GameState, GoldPile } from './types';

function clonePile(pile: GoldPile): GoldPile {
  return { extraction: [...pile.extraction], bonus: [...pile.bonus] };
}

/**
 * Copie de travail de l'état. Les cartes, la configuration, les résultats et
 * le choix en attente sont immuables : seuls les conteneurs sont copiés.
 */
export function cloneState(state: GameState): GameState {
  const piles: Record<string, GoldPile> = {};
  for (const [playerId, pile] of Object.entries(state.piles)) {
    piles[playerId] = clonePile(pile);
  }
  return {
    ...state,
    track: [...state.track],
    dwarves: state.dwarves.map((dwarf) => ({ ...dwarf, secured: clonePile(dwarf.secured) })),
    extractionDeck: [...state.extractionDeck],
    exitDeck: [...state.exitDeck],
    exitDiscard: [...state.exitDiscard],
    box: { extraction: [...state.box.extraction], exit: [...state.box.exit] },
    piles,
    ladder: [...state.ladder],
    roundResults: [...state.roundResults],
  };
}
