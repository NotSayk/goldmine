/**
 * Simulation de parties entre bots pour calibrer la composition des paquets.
 *
 *   npm run simulate                       # 1000 parties par configuration
 *   npm run simulate -- --games 300 --policy random --seed abc
 *   npm run simulate -- --dragons 12   # autre nombre de dragons (total de 58 conservé)
 *
 * Affiche des tableaux Markdown (copiables dans docs/DECISIONS.md).
 */
import {
  DEFAULT_DECKS,
  DRAGON_MOVES_TO_EXIT,
  createSeededRng,
  heuristicBot,
  playGame,
  randomBot,
  type BotPolicy,
  type DeckComposition,
  type PlayerInfo,
} from '../src';

interface Options {
  games: number;
  seed: string;
  policies: { name: string; policy: BotPolicy }[];
  decks: DeckComposition;
}

function parseArgs(argv: readonly string[]): Options {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const policy = get('policy') ?? 'both';
  const all = [
    { name: 'aléatoire', key: 'random', policy: randomBot },
    { name: 'heuristique', key: 'heuristic', policy: heuristicBot },
  ];
  return {
    games: Number(get('games') ?? 1000),
    seed: get('seed') ?? 'simulation',
    policies: all.filter((p) => policy === 'both' || p.key === policy),
    decks: withDragons(DEFAULT_DECKS, Number(get('dragons') ?? DEFAULT_DECKS.extraction.dragon)),
  };
}

/** Change le nombre de dragons en compensant sur les portes rouges et bleues (58 cartes). */
function withDragons(decks: DeckComposition, dragons: number): DeckComposition {
  const extraction = { ...decks.extraction };
  let delta = dragons - extraction.dragon;
  extraction.dragon = dragons;
  let takeRed = true;
  while (delta !== 0) {
    const kind = takeRed ? 'redDoor' : 'blueDoor';
    extraction[kind] -= Math.sign(delta);
    delta -= Math.sign(delta);
    takeRed = !takeRed;
  }
  return { ...decks, extraction };
}

interface Config {
  label: string;
  players: number;
  doubleDraw: boolean;
}

const CONFIGS: Config[] = [
  { label: '2 joueurs', players: 2, doubleDraw: false },
  { label: '2 joueurs (variante)', players: 2, doubleDraw: true },
  { label: '3 joueurs', players: 3, doubleDraw: false },
  { label: '4 joueurs', players: 4, doubleDraw: false },
  { label: '5 joueurs', players: 5, doubleDraw: false },
  { label: '6 joueurs', players: 6, doubleDraw: false },
];

interface Stats {
  rounds: number;
  turns: number;
  extractionDraws: number;
  exitDraws: number;
  dragonMoves: number;
  causes: Record<string, number>;
  /** Éliminations par le dragon, par place autour de la table. */
  eliminationsBySeat: number[];
  dwarvesPerSeat: number;
  exitedGold: number[];
  finalScores: number[];
  winsBySeat: number[];
  noWinnerRounds: number;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function pct(part: number, total: number): string {
  return `${((100 * part) / Math.max(1, total)).toFixed(1)} %`;
}

function simulate(config: Config, policy: BotPolicy, options: Options, salt: string): Stats {
  const players: PlayerInfo[] = Array.from({ length: config.players }, (_, i) => ({
    id: `s${i}`,
    name: `Siège ${i + 1}`,
  }));
  const seatOf = new Map(players.map((p, i) => [p.id, i]));
  const stats: Stats = {
    rounds: 0,
    turns: 0,
    extractionDraws: 0,
    exitDraws: 0,
    dragonMoves: 0,
    causes: {},
    eliminationsBySeat: players.map(() => 0),
    dwarvesPerSeat: config.doubleDraw ? 2 : 1,
    exitedGold: [],
    finalScores: [],
    winsBySeat: players.map(() => 0),
    noWinnerRounds: 0,
  };
  const policies = Object.fromEntries(players.map((p) => [p.id, policy]));
  for (let game = 0; game < options.games; game++) {
    const seed = `${options.seed}-${salt}-${game}`;
    const played = playGame(
      {
        players,
        firstPlayerId: players[game % players.length]!.id,
        doubleDraw: config.doubleDraw,
        decks: options.decks,
      },
      policies,
      createSeededRng(seed),
      createSeededRng(`${seed}-bots`),
    );
    const ownerOf = (dwarfId: number): string => played.state.dwarves[dwarfId]!.ownerId;
    for (const event of played.events) {
      switch (event.type) {
        case 'TurnStarted':
          stats.turns += 1;
          break;
        case 'CardDrawn':
          if (event.deck === 'extraction') stats.extractionDraws += 1;
          else stats.exitDraws += 1;
          break;
        case 'DragonMoved':
          stats.dragonMoves += 1;
          break;
        case 'DwarfEliminated':
          if (event.cause === 'dragon') {
            stats.eliminationsBySeat[seatOf.get(ownerOf(event.dwarfId))!]! += 1;
          }
          break;
        case 'RoundEnded':
          stats.rounds += 1;
          stats.causes[event.cause] = (stats.causes[event.cause] ?? 0) + 1;
          if (event.result.winnerPlayerId === null) stats.noWinnerRounds += 1;
          for (const entry of event.result.ranking) stats.exitedGold.push(entry.total);
          break;
        case 'GameEnded':
          for (const standing of event.result.standings) stats.finalScores.push(standing.total);
          for (const winner of event.result.winners) {
            stats.winsBySeat[seatOf.get(winner)!]! += 1;
          }
          break;
        default:
          break;
      }
    }
  }
  return stats;
}

function report(options: Options): string {
  const lines: string[] = [];
  const dragons = options.decks.extraction.dragon;
  lines.push(
    `Paquets : ${dragons} dragons pour ${DRAGON_MOVES_TO_EXIT} déplacements nécessaires — ` +
      (dragons >= DRAGON_MOVES_TO_EXIT
        ? 'le dragon peut atteindre la Sortie.'
        : '⚠ le dragon ne peut PAS atteindre la Sortie.'),
  );
  const { redDoor, blueDoor, noDoor } = options.decks.extraction;
  lines.push(
    `Extraction : ${dragons} dragons, ${redDoor} portes rouges, ${blueDoor} portes bleues, ${noDoor} sans porte.`,
  );
  lines.push(`${options.games} parties (${options.games * 3} manches) par configuration.`);
  for (const { name, policy } of options.policies) {
    lines.push('', `### Bots ${name}`, '');
    lines.push(
      '| Configuration | Tours / manche | Extraction / manche | Exit / manche | Dragon / manche | Fin par le dragon | Fin : mine vide | Fin : pioche vide | Manches sans vainqueur |',
      '|---|---|---|---|---|---|---|---|---|',
    );
    const all: [Config, Stats][] = [];
    for (const config of CONFIGS) {
      const stats = simulate(config, policy, options, `${name}-${config.label}`);
      all.push([config, stats]);
      const r = stats.rounds;
      lines.push(
        `| ${config.label} | ${(stats.turns / r).toFixed(1)} | ${(stats.extractionDraws / r).toFixed(1)} | ${(stats.exitDraws / r).toFixed(1)} | ${(stats.dragonMoves / r).toFixed(2)} | ${pct(stats.causes.dragonReachedExit ?? 0, r)} | ${pct(stats.causes.mineEmpty ?? 0, r)} | ${pct(stats.causes.extractionDeckEmpty ?? 0, r)} | ${pct(stats.noWinnerRounds, r)} |`,
      );
    }
    lines.push(
      '',
      '| Configuration | Élimination par manche, par siège | Or d’un nain sorti (moy. / médiane / p90 / max) | Score final (moy. / max) | Victoires par siège |',
      '|---|---|---|---|---|',
    );
    for (const [config, stats] of all) {
      const perDwarfRound = stats.rounds * stats.dwarvesPerSeat;
      lines.push(
        `| ${config.label} | ${stats.eliminationsBySeat.map((e) => pct(e, perDwarfRound)).join(' · ')} | ${mean(stats.exitedGold).toFixed(1)} / ${percentile(stats.exitedGold, 0.5)} / ${percentile(stats.exitedGold, 0.9)} / ${Math.max(0, ...stats.exitedGold)} | ${mean(stats.finalScores).toFixed(1)} / ${Math.max(0, ...stats.finalScores)} | ${stats.winsBySeat.map((w) => pct(w, options.games)).join(' · ')} |`,
      );
    }
  }
  return lines.join('\n');
}

console.log(report(parseArgs(process.argv.slice(2))));
