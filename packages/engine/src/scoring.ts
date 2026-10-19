import { GOLD_BONUS_VALUE, ROUND_AWARDS } from './constants';
import { pileValue } from './rules/cards';
import {
  compareEliminatedOnFinalTie,
  compareExitedWithEliminatedOnFinalTie,
} from './rules/houseRules';
import type { FinalResult, FinalStanding, GameState, RoundRankingEntry } from './types';

/**
 * Classement des nains arrivés à la Sortie : du plus riche au moins riche ;
 * à égalité, le nain le plus haut sur l'échelle passe devant.
 */
export function rankExitedDwarves(state: GameState): RoundRankingEntry[] {
  const entries = state.ladder.map((dwarfId, ladderSlot): RoundRankingEntry => {
    const dwarf = state.dwarves[dwarfId];
    if (!dwarf) throw new Error(`Nain inconnu sur l'échelle : ${dwarfId}`);
    const value = pileValue(dwarf.secured);
    return {
      dwarfId,
      playerId: dwarf.ownerId,
      extractionGold: value.extractionGold,
      bonusCount: value.bonusCount,
      total: value.total,
      ladderSlot,
      bigNuggetsAwarded: 0,
    };
  });
  return entries.sort((a, b) => b.total - a.total || a.ladderSlot - b.ladderSlot);
}

/**
 * Manches 1 et 2 : 3, 2 puis 1 Grosses pépites aux trois plus riches.
 * Un nain sans pépite n'en reçoit pas. Modifie les nains et la réserve.
 */
export function awardBigNuggets(
  state: GameState,
  ranking: readonly RoundRankingEntry[],
): RoundRankingEntry[] {
  let place = 0;
  return ranking.map((entry) => {
    if (entry.total <= 0 || place >= ROUND_AWARDS.length) return entry;
    const count = Math.min(ROUND_AWARDS[place] ?? 0, state.bigNuggetReserve);
    place += 1;
    const dwarf = state.dwarves[entry.dwarfId];
    if (dwarf) dwarf.bigNuggets += count;
    state.bigNuggetReserve -= count;
    return { ...entry, bigNuggetsAwarded: count };
  });
}

type UnrankedStanding = Omit<FinalStanding, 'rank'>;

function compareFinal(a: UnrankedStanding, b: UnrankedStanding): number {
  if (a.total !== b.total) return b.total - a.total;
  if (a.bestLadderSlot !== null && b.bestLadderSlot !== null) {
    return a.bestLadderSlot - b.bestLadderSlot;
  }
  if (a.bestLadderSlot === null && b.bestLadderSlot === null) return compareEliminatedOnFinalTie();
  return compareExitedWithEliminatedOnFinalTie(a.bestLadderSlot, b.bestLadderSlot);
}

/**
 * Décompte final (manche 3) : or des nains sortis (+3 par Bonus d'or) plus
 * Grosses pépites (1 pépite chacune). Un joueur sans nain sorti ne compte que
 * ses Grosses pépites.
 */
export function computeFinalResult(state: GameState): FinalResult {
  const standings = state.config.players.map((player): UnrankedStanding => {
    let extractionGold = 0;
    let bonusGold = 0;
    let bigNuggets = 0;
    let bestLadderSlot: number | null = null;
    for (const dwarf of state.dwarves) {
      if (dwarf.ownerId !== player.id) continue;
      bigNuggets += dwarf.bigNuggets;
      if (dwarf.status !== 'exit') continue;
      const value = pileValue(dwarf.secured);
      extractionGold += value.extractionGold;
      bonusGold += value.bonusCount * GOLD_BONUS_VALUE;
      const slot = state.ladder.indexOf(dwarf.id);
      if (slot >= 0 && (bestLadderSlot === null || slot < bestLadderSlot)) bestLadderSlot = slot;
    }
    return {
      playerId: player.id,
      extractionGold,
      bonusGold,
      bigNuggets,
      total: extractionGold + bonusGold + bigNuggets,
      bestLadderSlot,
    };
  });
  const ranked = standings.map((standing): FinalStanding => ({
    ...standing,
    rank: 1 + standings.filter((other) => compareFinal(other, standing) < 0).length,
  }));
  ranked.sort((a, b) => a.rank - b.rank || compareFinal(a, b));
  return {
    standings: ranked,
    winners: ranked.filter((s) => s.rank === 1).map((s) => s.playerId),
  };
}
