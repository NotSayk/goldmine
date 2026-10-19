/**
 * Constantes cosmétiques (apparence des nains, réactions rapides), sans
 * dépendance : le client peut les importer sans charger les schémas zod.
 */

/** Nombre de choix pour chaque élément de l'apparence. */
export const LOOK_OPTIONS = {
  /** Couleur du corps (et son symbole) : une par joueur dans un salon. */
  color: 6,
  /** Casque de mineur, capuche, casque à cornes, bonnet à pompon, couronne. */
  hat: 5,
  /** Longue, tressée, courte, moustache. */
  beard: 4,
  /** Blanche, rousse, brune, noire, blonde. */
  beardColor: 5,
  skin: 4,
} as const;

export type LookPart = keyof typeof LOOK_OPTIONS;

/** Apparence choisie par un joueur pour ses nains (purement cosmétique). */
export interface DwarfLook {
  /** Couleur de son nain, de 0 à 5, unique dans le salon. */
  readonly color: number;
  readonly hat: number;
  readonly beard: number;
  readonly beardColor: number;
  readonly skin: number;
}

/**
 * Apparence par défaut d'un nain de cette couleur : chacun a une silhouette
 * différente. Aussi utilisée pour le second nain de la variante à 2 joueurs.
 */
export function defaultLook(color: number): DwarfLook {
  const beard = (color + 1) % 3;
  return {
    color,
    hat: color % LOOK_OPTIONS.hat,
    beard,
    beardColor: beard,
    skin: color % LOOK_OPTIONS.skin,
  };
}

/** Première couleur qu'aucun joueur n'a encore prise. */
export function firstFreeColor(taken: Iterable<number>): number {
  const used = new Set(taken);
  let color = 0;
  while (used.has(color) && color < LOOK_OPTIONS.color - 1) color += 1;
  return color;
}

/** Réactions rapides envoyées pendant la partie. */
export const EMOTES = ['cheer', 'laugh', 'gasp', 'fire', 'gold', 'wave', 'cule'] as const;
export type Emote = (typeof EMOTES)[number];

/** Débit des réactions : rafale de 3, puis une toutes les 2 secondes. */
export const EMOTE_BURST = 3;
export const EMOTE_PER_SECOND = 0.5;
