import type { DeckComposition, ExtractionKind } from '../types';

/** Nombre de cartes Extraction dans la boîte (livret). */
export const EXTRACTION_DECK_SIZE = 58;
/** Nombre de cartes Exit dans la boîte (livret). */
export const EXIT_DECK_SIZE = 16;

/** La composition ci-dessous est le décompte réel d'une boîte (voir `docs/DECISIONS.md`). */
export const DECKS_ARE_PROVISIONAL = false;

/** Composition réelle des paquets, comptée sur une boîte. */
export const DEFAULT_DECKS: DeckComposition = {
  extraction: {
    dragon: 9,
    redDoor: 15,
    blueDoor: 5,
    noDoor: 29,
  },
  // Les cartes à deux actions laissent le choix au joueur.
  exit: [
    { actions: ['step'], count: 3 },
    { actions: ['allTogether'], count: 2 },
    { actions: ['doubleStep'], count: 2 },
    { actions: ['step', 'goldBonus'], count: 1 },
    { actions: ['allTogether', 'swap'], count: 1 },
    { actions: ['swap', 'doubleStep'], count: 1 },
    { actions: ['step', 'swap'], count: 2 },
    { actions: ['step', 'allTogether'], count: 1 },
    { actions: ['doubleStep', 'allTogether'], count: 1 },
    { actions: ['step', 'doubleStep'], count: 2 },
  ],
};

export const EXTRACTION_KINDS: readonly ExtractionKind[] = [
  'redDoor',
  'blueDoor',
  'noDoor',
  'dragon',
];

export function extractionDeckSize(decks: DeckComposition): number {
  return EXTRACTION_KINDS.reduce((sum, kind) => sum + decks.extraction[kind], 0);
}

export function exitDeckSize(decks: DeckComposition): number {
  return decks.exit.reduce((sum, entry) => sum + entry.count, 0);
}

/** Retourne la liste des problèmes d'une composition (vide si elle est utilisable). */
export function validateDecks(decks: DeckComposition): string[] {
  const problems: string[] = [];
  for (const kind of EXTRACTION_KINDS) {
    const count = decks.extraction[kind];
    if (!Number.isInteger(count) || count < 0) {
      problems.push(`Nombre invalide de cartes Extraction « ${kind} » : ${count}`);
    }
  }
  if (extractionDeckSize(decks) - decks.extraction.dragon <= 0) {
    problems.push('La pioche Extraction doit contenir au moins une carte avec de l’or.');
  }
  for (const entry of decks.exit) {
    if (!Number.isInteger(entry.count) || entry.count < 0) {
      problems.push(`Nombre invalide de cartes Exit : ${entry.count}`);
    }
    if (entry.actions.length < 1 || entry.actions.length > 2) {
      problems.push('Une carte Exit porte une ou deux actions.');
    }
  }
  if (exitDeckSize(decks) <= 0) {
    problems.push('La pioche Exit doit contenir au moins une carte.');
  }
  return problems;
}
