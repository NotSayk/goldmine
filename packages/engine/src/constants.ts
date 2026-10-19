/** Nombre de cartes Mine formant la piste. */
export const TRACK_LENGTH = 9;
/** Index de la carte Sortie (extrémité gauche). */
export const EXIT_POSITION = 0;
/** Index du Wagon, point de départ de tous les nains. */
export const WAGON_POSITION = 4;
/** Index initial du dragon (extrémité droite). */
export const DRAGON_START_POSITION = 8;
/** Le dragon arrive « juste à côté de la Sortie » : la manche s'arrête. */
export const DRAGON_FINAL_POSITION = 1;
/** Déplacements nécessaires au dragon pour atteindre la Sortie. */
export const DRAGON_MOVES_TO_EXIT = DRAGON_START_POSITION - DRAGON_FINAL_POSITION;

export const TOTAL_ROUNDS = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
/** Disques Nain disponibles dans la boîte. */
export const MAX_DWARVES = 6;
/** Nains par joueur dans la variante « Double pioche ». */
export const DOUBLE_DRAW_DWARVES_PER_PLAYER = 2;

/** Grosses pépites dans la boîte : 2 manches × (3 + 2 + 1). */
export const BIG_NUGGETS_TOTAL = 12;
/** Grosses pépites distribuées aux trois plus riches en manches 1 et 2. */
export const ROUND_AWARDS: readonly number[] = [3, 2, 1];
/** Valeur d'une carte Bonus d'or au décompte. */
export const GOLD_BONUS_VALUE = 3;
