/**
 * Cas que le livret ne tranche pas (`docs/REGLES.md`, section 8) et autres
 * décisions d'implémentation. Chaque règle est isolée dans une fonction pour
 * pouvoir être changée en une ligne. Voir aussi `docs/DECISIONS.md`.
 */
import { MAX_DWARVES } from '../constants';
import type { DwarfState, PlayerId } from '../types';

/**
 * Cas n° 1 : un nain juste à gauche du dragon pioche une carte « porte rouge ».
 * Défaut : le déplacement est ignoré (il reste sur place), l'or est quand même pris.
 * Retourne la position d'arrivée.
 */
export function resolveMoveTowardDragon(position: number, dragonPosition: number): number {
  const target = position + 1;
  return target >= dragonPosition ? position : target;
}

/**
 * Cas n° 2 : cibles de l'échange.
 * Défaut : seuls les nains encore sur la piste sont ciblables (pas ceux sur la Sortie).
 * Un nain sur la même carte reste une cible valide (l'échange ne change alors rien).
 */
export function isSwapTargetAllowed(actor: DwarfState, target: DwarfState): boolean {
  return target.id !== actor.id && target.status === 'mine';
}

/**
 * Cas n° 3 : « Tous ensemble ».
 * Défaut : seuls les nains encore sur la piste avancent.
 */
export function isMovedByAllTogether(dwarf: DwarfState): boolean {
  return dwarf.status === 'mine';
}

/**
 * Cas n° 4 : pioche Extraction vide en cours de manche.
 * Défaut : fin immédiate de la manche, décompte normal.
 */
export function endsRoundWhenExtractionDeckEmpty(): boolean {
  return true;
}

/**
 * Cas n° 5 : personne n'a gagné la manche (aucun nain sorti avec de l'or).
 * Défaut : pas de Grosses pépites ; le prochain premier joueur est le joueur
 * qui suit (sens horaire) le premier joueur de la manche précédente.
 */
export function nextFirstPlayerWithoutWinner(
  seating: readonly PlayerId[],
  previousFirstPlayer: PlayerId,
): PlayerId {
  const index = seating.indexOf(previousFirstPlayer);
  return seating[(index + 1) % seating.length] ?? previousFirstPlayer;
}

/**
 * Cas n° 6 : égalité en manche 3 entre un joueur sorti et un joueur éliminé.
 * Défaut : le joueur sorti l'emporte. Retourne un nombre négatif si `a` passe devant.
 */
export function compareExitedWithEliminatedOnFinalTie(
  aBestLadderSlot: number | null,
  bBestLadderSlot: number | null,
): number {
  if (aBestLadderSlot !== null && bBestLadderSlot === null) return -1;
  if (aBestLadderSlot === null && bBestLadderSlot !== null) return 1;
  return 0;
}

/**
 * Cas n° 7 : égalité en manche 3 entre deux joueurs éliminés (aucun sur l'échelle).
 * Défaut : victoire partagée (0 = pas de départage).
 */
export function compareEliminatedOnFinalTie(): number {
  return 0;
}

/**
 * Cas n° 8 : cartes Bonus d'or d'un nain éliminé dont l'or est perdu.
 * Défaut : elles vont dans la défausse Exit (et pourront revenir après un remélange).
 */
export function bonusCardsOfEliminatedGoTo(): 'exitDiscard' | 'box' {
  return 'exitDiscard';
}

/**
 * Cas n° 9 : place sur l'échelle de la Sortie.
 * Impossible de manquer de place : 6 emplacements pour 6 nains au maximum.
 */
export function assertLadderHasRoom(ladderLength: number): void {
  if (ladderLength >= MAX_DWARVES) {
    throw new Error('Échelle de la Sortie pleine : plus de 6 nains en jeu.');
  }
}

/**
 * Décision A : carte Extraction avec déplacement.
 * Défaut : la carte rejoint la pile d'or avant le déplacement ; un nain qui sort
 * grâce à elle l'emporte donc sur sa carte Nain (seul effet visible : la variante
 * à 2 nains, où l'équipier encore dans la mine repart sinon avec cette carte).
 */
export function addsGoldBeforeMoving(): boolean {
  return true;
}

/**
 * Décision B : nombre de cibles d'échange à partir duquel le joueur doit choisir.
 * Défaut : avec une seule cible possible, l'échange est appliqué directement.
 */
export function swapNeedsExplicitTarget(targetCount: number): boolean {
  return targetCount > 1;
}

/**
 * Décision C : visibilité de l'or des autres joueurs.
 * Le livret pose les cartes Extraction face cachée (jeu de mémoire). À la
 * demande du commanditaire, l'or de chacun est visible de tous en ligne.
 * Retourner `false` pour revenir aux piles cachées (seul le nombre de cartes reste public).
 */
export function pileValuesArePublic(): boolean {
  return true;
}
