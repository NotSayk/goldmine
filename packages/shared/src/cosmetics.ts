/**
 * Constantes cosmétiques (apparence des nains, réactions rapides), sans
 * dépendance : le client peut les importer sans charger les schémas zod.
 */

/** Nombre de variantes de chaque accessoire du nain (chapeau, barbe). */
export const LOOK_VARIANTS = 3;

/** Apparence choisie par un joueur pour ses nains (purement cosmétique). */
export interface DwarfLook {
  /** 0 : casque de mineur, 1 : capuche, 2 : casque à cornes. */
  readonly hat: number;
  /** 0 : longue barbe, 1 : barbe tressée, 2 : barbe courte. */
  readonly beard: number;
}

/** Réactions rapides envoyées pendant la partie. */
export const EMOTES = ['cheer', 'laugh', 'gasp', 'fire', 'gold', 'wave', 'cule'] as const;
export type Emote = (typeof EMOTES)[number];

/** Débit des réactions : rafale de 3, puis une toutes les 2 secondes. */
export const EMOTE_BURST = 3;
export const EMOTE_PER_SECOND = 0.5;
