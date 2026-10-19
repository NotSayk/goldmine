import { GOLD_BONUS_VALUE } from '../constants';
import type { ExtractionCard, ExtractionKind, GoldPile } from '../types';

export interface ExtractionEffect {
  /** Pépites rapportées par la carte. */
  readonly gold: number;
  /** -1 : 1 pas vers la Sortie, +1 : 1 pas vers le dragon, 0 : sur place. */
  readonly move: -1 | 0 | 1;
}

/** Effet de chaque type de carte Extraction (`docs/REGLES.md`, section 4A). */
export const EXTRACTION_EFFECTS: Readonly<Record<ExtractionKind, ExtractionEffect>> = {
  redDoor: { gold: 2, move: 1 },
  blueDoor: { gold: 1, move: -1 },
  noDoor: { gold: 1, move: 0 },
  dragon: { gold: 0, move: 0 },
};

export function extractionGold(cards: readonly ExtractionCard[]): number {
  return cards.reduce((sum, card) => sum + EXTRACTION_EFFECTS[card.kind].gold, 0);
}

export function pileValue(pile: GoldPile): {
  extractionGold: number;
  bonusCount: number;
  total: number;
} {
  const gold = extractionGold(pile.extraction);
  return {
    extractionGold: gold,
    bonusCount: pile.bonus.length,
    total: gold + pile.bonus.length * GOLD_BONUS_VALUE,
  };
}

export function emptyPile(): GoldPile {
  return { extraction: [], bonus: [] };
}
