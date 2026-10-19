import type { PlayerView } from '@pepite/engine';

/** Or du joueur (en jeu + à l'abri), relevé après chaque coup montré sur la table. */
export interface GoldSample {
  readonly round: number;
  readonly gold: number;
}

/** Or du spectateur dans une vue : pile en jeu et or mis à l'abri par ses nains sortis. */
export function viewerGold(view: PlayerView): number | null {
  const me = view.players.find((p) => p.id === view.viewerId);
  if (!me) return null;
  const secured = view.dwarves
    .filter((d) => d.ownerId === me.id && d.status === 'exit')
    .reduce((sum, d) => sum + (d.secured.gold ?? 0), 0);
  return (me.pile.gold ?? 0) + secured;
}
