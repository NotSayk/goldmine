import { DRAGON_START_POSITION } from './constants';
import { EXTRACTION_EFFECTS } from './rules/cards';
import { randomInt, type Rng } from './rng';
import type { DwarfView, PlayerView } from './view';
import type { ExitActionKind, PlayerAction } from './types';

/**
 * Bots : ils ne voient que la vue filtrée de leur joueur (`viewFor`), comme un
 * humain. Retournent `null` quand ils n'ont rien à jouer.
 */
export type BotPolicy = (view: PlayerView, rng: Rng) => PlayerAction | null;

/** Bot aléatoire : choisit uniformément parmi les actions légales (simulations). */
export const randomBot: BotPolicy = (view, rng) => {
  const pending = view.pending;
  if (pending && pending.playerId === view.viewerId) {
    if (pending.kind === 'chooseSwapTarget') {
      const target = pending.targets[randomInt(rng, pending.targets.length)];
      return target === undefined ? null : { type: 'chooseSwapTarget', dwarfId: target };
    }
    const options = (pending.options ?? []).filter((o) => o.allowed);
    const option = options[randomInt(rng, options.length)];
    return option ? { type: 'chooseExitAction', index: option.index } : null;
  }
  if (!view.legal.yourTurn) return null;
  const choices: PlayerAction[] = [];
  if (view.legal.drawExtraction.allowed) choices.push({ type: 'drawExtraction' });
  if (view.legal.drawExit.allowed) choices.push({ type: 'drawExit' });
  return choices[randomInt(rng, choices.length)] ?? null;
};

function activeDwarf(view: PlayerView): DwarfView | null {
  return view.currentDwarfId === null ? null : (view.dwarves[view.currentDwarfId] ?? null);
}

/** Probabilité estimée que la prochaine carte révélée soit un dragon. */
function nextDragonProbability(view: PlayerView): number {
  const dragonsRevealed = DRAGON_START_POSITION - view.dragonPosition;
  const dragonsLeft = Math.max(0, view.decks.extraction.dragon - dragonsRevealed);
  // La carte visible n'est jamais un dragon : le danger vient des cartes dessous.
  const hidden = Math.max(1, view.extraction.count - 1);
  return Math.min(1, dragonsLeft / hidden);
}

function scoreExitAction(
  action: ExitActionKind,
  me: DwarfView,
  danger: number,
  gold: number,
): number {
  switch (action) {
    case 'doubleStep':
      return 50 + (me.position <= 2 ? 20 : 0);
    case 'step':
      return 40 + (me.position <= 1 ? 30 : 0);
    case 'allTogether':
      return 35 + (me.position <= 1 ? 30 : 0);
    case 'goldBonus':
      // Bonus intéressant tant que le dragon est loin.
      return danger >= 3 || gold === 0 ? 60 : 20;
    case 'swap':
      return 10;
  }
}

/**
 * Bot heuristique « raisonnable » : pioche de l'or tant que le risque reste
 * faible par rapport au gain, puis fuit avec les cartes Exit.
 */
export const heuristicBot: BotPolicy = (view, rng) => {
  const me = activeDwarf(view);
  const self = view.players.find((p) => p.id === view.viewerId);
  if (!me || !self || me.ownerId !== view.viewerId) return null;
  const gold = self.pile.gold ?? 0;
  const danger = view.dragonPosition - me.position;
  const pending = view.pending;

  if (pending && pending.playerId === view.viewerId) {
    if (pending.kind === 'chooseSwapTarget') {
      // Prend la place du nain le plus proche de la Sortie (ou la moins mauvaise).
      const targets = pending.targets
        .map((id) => view.dwarves[id])
        .filter((d): d is DwarfView => d !== undefined)
        .sort((a, b) => a.position - b.position || a.id - b.id);
      const target = targets[0];
      return target ? { type: 'chooseSwapTarget', dwarfId: target.id } : null;
    }
    const options = (pending.options ?? []).filter((o) => o.allowed);
    const best = options.sort(
      (a, b) =>
        scoreExitAction(b.action, me, danger, gold) - scoreExitAction(a.action, me, danger, gold),
    )[0];
    return best ? { type: 'chooseExitAction', index: best.index } : null;
  }

  if (!view.legal.yourTurn) return null;
  const canExtract = view.legal.drawExtraction.allowed;
  const canExit = view.legal.drawExit.allowed;
  if (!canExit) return canExtract ? { type: 'drawExtraction' } : null;
  if (!canExtract) return { type: 'drawExit' };

  const top = view.extraction.top;
  const topEffect = top ? EXTRACTION_EFFECTS[top] : { gold: 0, move: 0 };
  // Distance au dragon après la pioche (porte rouge : on s'en rapproche).
  const dangerAfter = Math.max(
    1,
    danger - (topEffect.move > 0 ? 1 : 0) + (topEffect.move < 0 ? 1 : 0),
  );
  const p = nextDragonProbability(view);
  const eliminationRisk = Math.pow(p, dangerAfter);
  const expectedLoss = eliminationRisk * (gold + topEffect.gold);
  const greed = 6 + randomInt(rng, 6) + (view.round === view.totalRounds ? 2 : 0);

  if (gold === 0) return { type: 'drawExtraction' };
  if (gold >= greed + me.position) return { type: 'drawExit' };
  if (expectedLoss > topEffect.gold) return { type: 'drawExit' };
  if (danger <= 2 && gold >= 3) return { type: 'drawExit' };
  return { type: 'drawExtraction' };
};
