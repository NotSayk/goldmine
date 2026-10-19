import { DRAGON_FINAL_POSITION, EXIT_POSITION, TOTAL_ROUNDS } from './constants';
import { cloneState } from './clone';
import { activeDwarf, validateAction } from './legal';
import { EXTRACTION_EFFECTS, emptyPile, pileValue } from './rules/cards';
import {
  addsGoldBeforeMoving,
  assertLadderHasRoom,
  bonusCardsOfEliminatedGoTo,
  dragonActsWhenDrawn,
  endsRoundWhenExtractionDeckEmpty,
  isMovedByAllTogether,
  isSwapTargetAllowed,
  nextFirstPlayerWithoutWinner,
  resolveMoveTowardDragon,
  swapNeedsExplicitTarget,
} from './rules/houseRules';
import { shuffle, type Rng } from './rng';
import { awardBigNuggets, computeFinalResult, rankExitedDwarves } from './scoring';
import { startRound } from './setup';
import type {
  DwarfState,
  EliminationCause,
  ExitActionKind,
  ExitCard,
  GameAction,
  GameEvent,
  GameState,
  GoldPile,
  MoveCause,
  PlayerId,
  ReduceResult,
  RoundEndCause,
  RoundResult,
} from './types';

/**
 * Applique une action à l'état. Fonction déterministe : l'état reçu n'est jamais
 * modifié et le seul effet de bord est l'avancement du générateur injecté.
 * Une action illégale est rejetée avec un code d'erreur, sans toucher au générateur.
 */
export function reduce(state: GameState, action: GameAction, rng: Rng): ReduceResult {
  const error = validateAction(state, action);
  if (error) return { ok: false, error };
  const next = cloneState(state);
  const events: GameEvent[] = [];
  switch (action.type) {
    case 'startNextRound':
      startNextRound(next, rng, events);
      break;
    case 'skipTurn':
      skipTurn(next, events);
      break;
    case 'drawExtraction':
      drawExtraction(next, requireActiveDwarf(next), events);
      break;
    case 'drawExit':
      drawExit(next, requireActiveDwarf(next), events);
      break;
    case 'chooseExitAction':
      chooseExitAction(next, action.index, events);
      break;
    case 'chooseSwapTarget':
      chooseSwapTarget(next, action.dwarfId, events);
      break;
  }
  if (next.phase === 'playing') refillExitDeck(next, rng, events);
  return { ok: true, state: next, events };
}

/**
 * Pioche Exit vide : la défausse est remélangée dès la fin de l'action qui l'a
 * vidée. L'ordre des cartes est donc toujours fixé avant qu'un joueur pioche ;
 * aucune carte n'est tirée au hasard au moment de la pioche.
 */
function refillExitDeck(state: GameState, rng: Rng, events: GameEvent[]): void {
  if (state.exitDeck.length > 0 || state.exitDiscard.length === 0) return;
  state.exitDeck = shuffle(state.exitDiscard, rng);
  state.exitDiscard = [];
  events.push({ type: 'ExitDeckReshuffled', count: state.exitDeck.length });
}

function requireActiveDwarf(state: GameState): DwarfState {
  const dwarf = activeDwarf(state);
  if (!dwarf) throw new Error('Aucun nain actif.');
  return dwarf;
}

function pileOf(state: GameState, playerId: PlayerId): GoldPile {
  const pile = state.piles[playerId];
  if (!pile) throw new Error(`Pile d'or introuvable pour ${playerId}.`);
  return pile;
}

function hasDwarfInMine(state: GameState, playerId: PlayerId): boolean {
  return state.dwarves.some((d) => d.ownerId === playerId && d.status === 'mine');
}

// ---------------------------------------------------------------------------
// A. Carte Extraction
// ---------------------------------------------------------------------------

function drawExtraction(state: GameState, dwarf: DwarfState, events: GameEvent[]): void {
  const card = state.extractionDeck.shift();
  if (!card) throw new Error('Pioche Extraction vide.');
  const effect = EXTRACTION_EFFECTS[card.kind];
  events.push({
    type: 'CardDrawn',
    deck: 'extraction',
    dwarfId: dwarf.id,
    card: card.kind,
    gold: effect.gold,
  });

  // Dragon pioché (pioche cachée, décision E) : il fait seulement avancer Dragobert.
  if (card.kind === 'dragon') {
    state.box.extraction.push(card);
    if (state.dragonPosition > DRAGON_FINAL_POSITION) moveDragon(state, events);
    finishTurn(state, events);
    return;
  }
  const goldFirst = addsGoldBeforeMoving();
  if (goldFirst) pileOf(state, dwarf.ownerId).extraction.push(card);

  if (effect.move < 0) {
    moveTowardExit(state, dwarf, 1, 'extraction', events);
  } else if (effect.move > 0) {
    const to = resolveMoveTowardDragon(dwarf.position, state.dragonPosition);
    if (to === dwarf.position) {
      events.push({ type: 'DwarfMoveBlocked', dwarfId: dwarf.id, position: dwarf.position });
    } else {
      events.push({
        type: 'DwarfMoved',
        dwarfId: dwarf.id,
        from: dwarf.position,
        to,
        cause: 'extraction',
      });
      dwarf.position = to;
    }
  }

  if (!goldFirst) {
    // Le nain a pu sortir avec la pile ; sans équipier dans la mine, la carte le suit.
    if (dwarf.status === 'exit' && !hasDwarfInMine(state, dwarf.ownerId)) {
      dwarf.secured.extraction.push(card);
    } else {
      pileOf(state, dwarf.ownerId).extraction.push(card);
    }
  }

  if (!dragonActsWhenDrawn()) revealDragons(state, events);
  finishTurn(state, events);
}

/** Pioche visible : tant que la carte du dessus est un dragon, le dragon avance (4A.1). */
function revealDragons(state: GameState, events: GameEvent[]): void {
  while (
    state.dragonPosition > DRAGON_FINAL_POSITION &&
    state.extractionDeck[0]?.kind === 'dragon'
  ) {
    const dragonCard = state.extractionDeck.shift();
    if (dragonCard) state.box.extraction.push(dragonCard);
    moveDragon(state, events);
  }
}

function moveDragon(state: GameState, events: GameEvent[]): void {
  const from = state.dragonPosition;
  const to = from - 1;
  const dragonCard = state.track[from];
  const passedCard = state.track[to];
  if (!dragonCard || !passedCard) throw new Error('Piste incohérente.');
  // Le dragon échange sa place avec la carte à sa gauche, qui passe côté rouge.
  state.track[to] = dragonCard;
  state.track[from] = { ...passedCard, burned: true };
  state.dragonPosition = to;
  events.push({ type: 'DragonMoved', from, to, burnedCardId: passedCard.id });
  for (const dwarf of state.dwarves) {
    if (dwarf.status === 'mine' && dwarf.position === to) {
      // Le disque reste sur sa galerie, désormais brûlée à droite du dragon.
      dwarf.position = from;
      eliminateDwarf(state, dwarf, 'dragon', events);
    }
  }
}

// ---------------------------------------------------------------------------
// B. Carte Exit
// ---------------------------------------------------------------------------

function swapTargets(state: GameState, dwarf: DwarfState): DwarfState[] {
  return state.dwarves.filter((target) => isSwapTargetAllowed(dwarf, target));
}

export function isExitActionFeasible(
  state: GameState,
  dwarf: DwarfState,
  action: ExitActionKind,
): boolean {
  return action === 'swap' ? swapTargets(state, dwarf).length > 0 : true;
}

function drawExit(state: GameState, dwarf: DwarfState, events: GameEvent[]): void {
  const card = state.exitDeck.shift();
  if (!card) throw new Error('Pioche Exit vide.');
  events.push({ type: 'CardDrawn', deck: 'exit', dwarfId: dwarf.id, card: [...card.actions] });

  const feasible = card.actions.map((action) => isExitActionFeasible(state, dwarf, action));
  const playable = card.actions.filter((_, i) => feasible[i]);
  const [firstPlayable] = playable;
  if (firstPlayable === undefined) {
    // Aucune action possible : la carte est défaussée sans effet.
    state.exitDiscard.push(card);
    events.push({ type: 'ExitCardWasted', dwarfId: dwarf.id, cardActions: [...card.actions] });
    finishTurn(state, events);
    return;
  }
  if (new Set(playable).size > 1) {
    state.pending = { kind: 'chooseExitAction', dwarfId: dwarf.id, card, feasible };
    return;
  }
  // Une seule action jouable : elle est imposée.
  playExitAction(state, dwarf, card, firstPlayable, events);
}

function chooseExitAction(state: GameState, index: number, events: GameEvent[]): void {
  const pending = state.pending;
  if (pending?.kind !== 'chooseExitAction') throw new Error('Aucun choix d’action en attente.');
  const action = pending.card.actions[index];
  const dwarf = state.dwarves[pending.dwarfId];
  if (!action || !dwarf) throw new Error('Choix invalide.');
  state.pending = null;
  playExitAction(state, dwarf, pending.card, action, events);
}

function chooseSwapTarget(state: GameState, targetId: number, events: GameEvent[]): void {
  const pending = state.pending;
  if (pending?.kind !== 'chooseSwapTarget') throw new Error('Aucun échange en attente.');
  const dwarf = state.dwarves[pending.dwarfId];
  const target = state.dwarves[targetId];
  if (!dwarf || !target) throw new Error('Cible invalide.');
  state.pending = null;
  swapDwarves(dwarf, target, events);
  state.exitDiscard.push(pending.card);
  finishTurn(state, events);
}

function playExitAction(
  state: GameState,
  dwarf: DwarfState,
  card: ExitCard,
  action: ExitActionKind,
  events: GameEvent[],
): void {
  events.push({
    type: 'ExitActionPlayed',
    dwarfId: dwarf.id,
    action,
    cardActions: [...card.actions],
  });
  switch (action) {
    case 'step':
      moveTowardExit(state, dwarf, 1, 'step', events);
      state.exitDiscard.push(card);
      break;
    case 'doubleStep':
      // Si le premier pas atteint la Sortie, le second est ignoré.
      moveTowardExit(state, dwarf, 2, 'doubleStep', events);
      state.exitDiscard.push(card);
      break;
    case 'allTogether':
      moveAllTogether(state, dwarf, events);
      state.exitDiscard.push(card);
      break;
    case 'goldBonus':
      pileOf(state, dwarf.ownerId).bonus.push(card);
      events.push({ type: 'GoldBonusKept', dwarfId: dwarf.id });
      break;
    case 'swap': {
      const targets = swapTargets(state, dwarf);
      if (swapNeedsExplicitTarget(targets.length)) {
        state.pending = {
          kind: 'chooseSwapTarget',
          dwarfId: dwarf.id,
          card,
          targets: targets.map((t) => t.id),
        };
        return;
      }
      const [target] = targets;
      if (target) swapDwarves(dwarf, target, events);
      state.exitDiscard.push(card);
      break;
    }
  }
  finishTurn(state, events);
}

/**
 * « Tous ensemble » : chaque nain de la piste avance d'une carte, en commençant
 * par le nain actif puis dans le sens horaire ; c'est aussi l'ordre d'arrivée
 * sur l'échelle de la Sortie en cas d'arrivées simultanées.
 */
function moveAllTogether(state: GameState, actor: DwarfState, events: GameEvent[]): void {
  const count = state.dwarves.length;
  for (let i = 0; i < count; i++) {
    const dwarf = state.dwarves[(actor.id + i) % count];
    if (dwarf && isMovedByAllTogether(dwarf)) {
      moveTowardExit(state, dwarf, 1, 'allTogether', events);
    }
  }
}

function swapDwarves(dwarf: DwarfState, target: DwarfState, events: GameEvent[]): void {
  const from = dwarf.position;
  const to = target.position;
  dwarf.position = to;
  target.position = from;
  events.push({ type: 'DwarvesSwapped', dwarfId: dwarf.id, targetId: target.id, from, to });
}

// ---------------------------------------------------------------------------
// Déplacements, sortie, élimination
// ---------------------------------------------------------------------------

function moveTowardExit(
  state: GameState,
  dwarf: DwarfState,
  steps: number,
  cause: MoveCause,
  events: GameEvent[],
): void {
  const from = dwarf.position;
  const to = Math.max(EXIT_POSITION, from - steps);
  dwarf.position = to;
  events.push({ type: 'DwarfMoved', dwarfId: dwarf.id, from, to, cause });
  if (to === EXIT_POSITION) exitDwarf(state, dwarf, events);
}

/** Le nain se place sur l'emplacement libre le plus haut et met son or à l'abri. */
function exitDwarf(state: GameState, dwarf: DwarfState, events: GameEvent[]): void {
  assertLadderHasRoom(state.ladder.length);
  dwarf.status = 'exit';
  dwarf.position = EXIT_POSITION;
  // Variante : le nain emporte toute la pile commune, l'équipier repart de zéro.
  dwarf.secured = pileOf(state, dwarf.ownerId);
  state.piles[dwarf.ownerId] = emptyPile();
  state.ladder.push(dwarf.id);
  events.push({ type: 'DwarfExited', dwarfId: dwarf.id, ladderSlot: state.ladder.length - 1 });
}

function eliminateDwarf(
  state: GameState,
  dwarf: DwarfState,
  cause: EliminationCause,
  events: GameEvent[],
): void {
  dwarf.status = 'eliminated';
  // Variante : si l'équipier est encore dans la mine, il garde l'or commun.
  const pileLost = !hasDwarfInMine(state, dwarf.ownerId);
  const goldLost = pileLost ? pileValue(pileOf(state, dwarf.ownerId)).total : 0;
  if (pileLost) {
    const pile = pileOf(state, dwarf.ownerId);
    state.box.extraction.push(...pile.extraction);
    if (bonusCardsOfEliminatedGoTo() === 'exitDiscard') {
      state.exitDiscard.push(...pile.bonus);
    } else {
      state.box.exit.push(...pile.bonus);
    }
    state.piles[dwarf.ownerId] = emptyPile();
  }
  events.push({
    type: 'DwarfEliminated',
    dwarfId: dwarf.id,
    position: dwarf.position,
    cause,
    pileLost,
    goldLost,
  });
}

// ---------------------------------------------------------------------------
// Fin de tour, fin de manche, manche suivante
// ---------------------------------------------------------------------------

function roundEndCause(state: GameState): RoundEndCause | null {
  if (state.dragonPosition <= DRAGON_FINAL_POSITION) return 'dragonReachedExit';
  if (!state.dwarves.some((d) => d.status === 'mine')) return 'mineEmpty';
  if (state.extractionDeck.length === 0 && endsRoundWhenExtractionDeckEmpty()) {
    return 'extractionDeckEmpty';
  }
  return null;
}

function finishTurn(state: GameState, events: GameEvent[]): void {
  const cause = roundEndCause(state);
  if (cause) {
    endRound(state, cause, events);
    return;
  }
  advanceTurn(state, events);
}

/** Passe au prochain nain encore dans la mine, dans l'ordre de jeu. */
function advanceTurn(state: GameState, events: GameEvent[]): void {
  const count = state.dwarves.length;
  const start = state.currentDwarf ?? count - 1;
  for (let i = 1; i <= count; i++) {
    const dwarf = state.dwarves[(start + i) % count];
    if (dwarf?.status === 'mine') {
      state.currentDwarf = dwarf.id;
      state.turn += 1;
      events.push({ type: 'TurnStarted', dwarfId: dwarf.id, playerId: dwarf.ownerId });
      return;
    }
  }
  state.currentDwarf = null;
}

function skipTurn(state: GameState, events: GameEvent[]): void {
  const dwarf = requireActiveDwarf(state);
  if (state.pending) {
    // La carte Exit en attente de choix est défaussée sans effet.
    state.exitDiscard.push(state.pending.card);
    state.pending = null;
  }
  events.push({ type: 'TurnSkipped', dwarfId: dwarf.id });
  finishTurn(state, events);
}

function endRound(state: GameState, cause: RoundEndCause, events: GameEvent[]): void {
  // Nains encore dans la mine (pioche Extraction vide) : ils ne sont pas sortis.
  for (const dwarf of state.dwarves) {
    if (dwarf.status === 'mine') eliminateDwarf(state, dwarf, 'stranded', events);
  }
  state.currentDwarf = null;
  state.pending = null;

  const ranking = rankExitedDwarves(state);
  const eliminated = state.dwarves.filter((d) => d.status === 'eliminated').map((d) => d.id);
  const winnerPlayerId = ranking.find((entry) => entry.total > 0)?.playerId ?? null;

  if (state.round < TOTAL_ROUNDS) {
    const awarded = awardBigNuggets(state, ranking);
    const result: RoundResult = {
      round: state.round,
      cause,
      ranking: awarded,
      eliminated,
      winnerPlayerId,
    };
    state.roundResults.push(result);
    state.phase = 'roundEnd';
    events.push({ type: 'RoundEnded', round: state.round, cause, result });
    events.push({
      type: 'BigNuggetsAwarded',
      round: state.round,
      awards: awarded
        .filter((entry) => entry.bigNuggetsAwarded > 0)
        .map((entry) => ({
          dwarfId: entry.dwarfId,
          playerId: entry.playerId,
          count: entry.bigNuggetsAwarded,
        })),
    });
    return;
  }

  // Manche 3 : pas de Grosses pépites distribuées, décompte final.
  const result: RoundResult = { round: state.round, cause, ranking, eliminated, winnerPlayerId };
  state.roundResults.push(result);
  state.finalResult = computeFinalResult(state);
  state.phase = 'finished';
  events.push({ type: 'RoundEnded', round: state.round, cause, result });
  events.push({ type: 'GameEnded', result: state.finalResult });
}

/** Manche suivante : le vainqueur de la manche commence (cas n° 5 sinon). */
function startNextRound(state: GameState, rng: Rng, events: GameEvent[]): void {
  const last = state.roundResults[state.roundResults.length - 1];
  const seating = state.config.players.map((p) => p.id);
  const firstPlayer =
    last?.winnerPlayerId ?? nextFirstPlayerWithoutWinner(seating, state.roundFirstPlayer);
  startRound(state, state.round + 1, firstPlayer, rng, events);
}
