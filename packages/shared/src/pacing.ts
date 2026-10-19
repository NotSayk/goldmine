import type { GameEvent } from '@pepite/engine';

/**
 * Rythme des animations, partagé entre le client (durées des séquences du
 * réalisateur) et le serveur (pause des bots) : un bot ne joue qu'une fois le
 * coup précédent montré, si bien que ses coups défilent exactement au même
 * rythme que ceux des joueurs. Durées en millisecondes, à vitesse normale.
 */
export const PACE = {
  /** Pioche : la carte vole depuis la pioche… */
  flyMs: 750,
  /** …marque une pause de suspense, identique pour toutes les cartes… */
  suspenseMs: 750,
  /** …puis se retourne… */
  flipMs: 380,
  /** …et reste lisible avant de rejoindre la pile ou la défausse. */
  readMs: 1800,
  /** Carte Exit d'un autre joueur, de dos, pendant qu'il choisit. */
  exitPendingMs: 2000,
  /** Action Exit choisie après coup (carte déjà piochée). */
  exitChosenMs: 2600,
  dragonMs: 2800,
  dragonStepMs: 700,
  dragonMaxMs: 4800,
  eliminationMs: 3800,
  exitedMs: 2800,
  roundMs: 2800,
  coinMs: 3400,
  skippedMs: 1600,
  /** Un bond du nain d'une carte à la suivante. */
  hopMs: 440,
  /** Réflexion d'un bot, après les animations du coup précédent. */
  botThinkMs: 900,
} as const;

/** Instant du retournement de la carte piochée. */
export const DRAW_FLIP_AT = PACE.flyMs + PACE.suspenseMs;
/** Instant où la carte est lisible et la table mise à jour. */
export const DRAW_REVEAL_AT = DRAW_FLIP_AT + PACE.flipMs;
/** Durée totale d'une pioche montrée au premier plan. */
export const DRAW_MS = DRAW_REVEAL_AT + PACE.readMs;

/**
 * Durée (à vitesse normale) des séquences que ces événements déclenchent chez
 * les joueurs. Estimation prudente, utilisée pour rythmer les bots.
 */
export function animationMs(events: readonly GameEvent[], autoPlay = false): number {
  let total = autoPlay ? PACE.coinMs : 0;
  let dragonSteps = 0;
  let eliminations = 0;
  events.forEach((event, index) => {
    switch (event.type) {
      case 'RoundStarted':
        total += PACE.roundMs;
        return;
      case 'CardDrawn': {
        if (event.deck === 'extraction') {
          total += DRAW_MS;
          return;
        }
        const played = events
          .slice(index + 1)
          .some(
            (e) =>
              (e.type === 'ExitActionPlayed' || e.type === 'ExitCardWasted') &&
              e.dwarfId === event.dwarfId,
          );
        total += played ? DRAW_MS : PACE.exitPendingMs;
        return;
      }
      case 'ExitActionPlayed': {
        const drawnHere = events
          .slice(0, index)
          .some((e) => e.type === 'CardDrawn' && e.deck === 'exit' && e.dwarfId === event.dwarfId);
        if (!drawnHere) total += PACE.exitChosenMs;
        return;
      }
      case 'DragonMoved':
        dragonSteps += 1;
        return;
      case 'DwarfEliminated':
        eliminations += 1;
        return;
      case 'TurnSkipped':
        total += PACE.skippedMs;
        return;
      default:
        return;
    }
  });
  if (dragonSteps > 0) {
    total += Math.min(PACE.dragonMaxMs, PACE.dragonMs + (dragonSteps - 1) * PACE.dragonStepMs);
  }
  // Les éliminations d'un même coup partagent une seule annonce.
  if (eliminations > 0) total += PACE.eliminationMs;
  return total;
}
