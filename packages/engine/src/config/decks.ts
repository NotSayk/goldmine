import type { DeckComposition, ExtractionKind } from '../types';

/** Nombre de cartes Extraction dans la boîte (livret). */
export const EXTRACTION_DECK_SIZE = 58;
/** Nombre de cartes Exit dans la boîte (livret). */
export const EXIT_DECK_SIZE = 16;

/**
 * PROVISIONAL : le livret ne donne pas la répartition des cartes par type.
 * Cette composition est une hypothèse de travail, à remplacer par le décompte
 * réel d'une boîte. C'est le seul endroit où elle est définie.
 */
export const DECKS_ARE_PROVISIONAL = true;

/** PROVISIONAL : composition par défaut des paquets (voir `docs/DECISIONS.md`). */
export const DEFAULT_DECKS: DeckComposition = {
  extraction: {
    dragon: 8,
    redDoor: 20,
    blueDoor: 20,
    noDoor: 10,
  },
  exit: [
    { actions: ['step'], count: 4 },
    { actions: ['doubleStep'], count: 3 },
    { actions: ['allTogether'], count: 3 },
    { actions: ['swap'], count: 3 },
    { actions: ['goldBonus'], count: 3 },
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
