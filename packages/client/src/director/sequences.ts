import type { ExitActionKind, ExtractionKind, GameEvent, PlayerView } from '@pepite/engine';
import type { AutoPlay, CoinSide } from '@pepite/shared';
import { BRANDING } from '@pepite/shared/branding';
import {
  EXIT_LABELS,
  EXTRACTION_LABELS,
  dwarfLabel,
  dwarfName,
  dwarfNoun,
  plural,
} from '../i18n/fr';

/**
 * Séquences du réalisateur : chaque coup (événements d'un message serveur)
 * devient une ou plusieurs séquences à jouer en file. Construites uniquement
 * à partir de la vue filtrée du joueur et des événements filtrés pour lui :
 * aucune information cachée ne peut y entrer.
 */

export type SequenceVisual =
  | { readonly kind: 'extraction'; readonly card: ExtractionKind }
  | { readonly kind: 'exitBack' }
  | {
      readonly kind: 'exit';
      readonly actions: readonly ExitActionKind[];
      readonly chosen: ExitActionKind | null;
    }
  | { readonly kind: 'dragon'; readonly steps: number }
  | { readonly kind: 'exited' }
  | { readonly kind: 'eliminated'; readonly colors: readonly number[] }
  | {
      readonly kind: 'coin';
      /** Libellés des deux côtés : pile, puis face. */
      readonly heads: string;
      readonly tails: string;
      /** Côté tombé, `null` sans tirage (une seule option possible). */
      readonly side: CoinSide | null;
    }
  | { readonly kind: 'round'; readonly round: number }
  | { readonly kind: 'skipped' };

export type SoundName =
  | 'draw'
  | 'flip'
  | 'gold'
  | 'bigGold'
  | 'flame'
  | 'roar'
  | 'step'
  | 'tada'
  | 'victory'
  | 'coin'
  | 'coinLand'
  | 'eliminate'
  | 'shuffle'
  | 'dissolve';

export type BurstEffect =
  'gold' | 'bigGold' | 'sparks' | 'ash' | 'embers' | 'daylight' | 'dust' | 'confetti';

/** Où placer un effet : une carte de la piste, le centre de l'écran ou la pile d'un joueur. */
export type Anchor =
  | { readonly kind: 'track'; readonly position: number }
  | { readonly kind: 'center' }
  | { readonly kind: 'player'; readonly playerId: string };

/** Repère d'une séquence, `at` en millisecondes depuis son début (à vitesse 1). */
export type Cue =
  | {
      readonly at: number;
      readonly type: 'sound';
      readonly sound: SoundName;
      readonly count?: number;
    }
  | { readonly at: number; readonly type: 'shake'; readonly strength: number }
  | {
      readonly at: number;
      readonly type: 'burst';
      readonly effect: BurstEffect;
      readonly anchor: Anchor;
      readonly count: number;
      /** Destination des particules (pépites qui rejoignent une pile). */
      readonly target?: Anchor;
    }
  | {
      readonly at: number;
      readonly type: 'camera';
      readonly position: number;
      readonly duration: number;
    }
  | { readonly at: number; readonly type: 'flameSweep'; readonly from: number; readonly to: number }
  | { readonly at: number; readonly type: 'vibrate'; readonly pattern: readonly number[] }
  /** Le plateau passe à la nouvelle vue (la carte vient d'être révélée). */
  | { readonly at: number; readonly type: 'reveal' };

export interface Sequence {
  readonly id: number;
  /** Nain qui a joué (couleur et disque), `null` pour le dragon ou une manche. */
  readonly dwarfId: number | null;
  readonly title: string;
  readonly name: string;
  readonly detail: string;
  /** Conséquences du coup : sorties, éliminations, échanges… */
  readonly extra: readonly string[];
  readonly visual: SequenceVisual;
  readonly tone: 'info' | 'danger' | 'success';
  /** Annonce en grand sur tout l'écran (élimination). */
  readonly dramatic?: boolean;
  /** Durée à vitesse 1, en millisecondes. */
  readonly duration: number;
  readonly cues: readonly Cue[];
  /** À ne jamais sauter quand la file déborde (éliminations, nouvelle manche). */
  readonly important: boolean;
  /** Joueur dont la pile reçoit la carte (destination de la carte qui vole). */
  readonly targetPlayerId: string | null;
  /** Pioche d'où part la carte de ce coup (`null` : pas de pioche dans ce coup). */
  readonly flight: 'extraction' | 'exit' | null;
}

/** Ancien nom, conservé pour le composant de mise en avant. */
export type Highlight = Sequence;
export type HighlightVisual = SequenceVisual;

// Chronologie d'une pioche : vol (0-500), suspense identique pour toutes les cartes
// (500-900), retournement (900-1150), puis la carte est montrée.
export const FLY_MS = 500;
export const SUSPENSE_MS = 400;
export const FLIP_AT = FLY_MS + SUSPENSE_MS;
export const REVEAL_AT = FLIP_AT + 250;

let nextId = 1;

type Draft = { -readonly [K in keyof Sequence]: Sequence[K] } & {
  extra: string[];
  cues: Cue[];
};

const DRAGON_STEP_MS = 450;

/**
 * Regroupe les événements d'un coup en séquences. Les textes décrivent ce qui
 * s'est passé ; aucune règle n'est recalculée ici.
 */
export function buildSequences(events: readonly GameEvent[], view: PlayerView): Sequence[] {
  const isYou = (id: number): boolean => view.dwarves[id]?.ownerId === view.viewerId;
  const ownerOf = (id: number): string | null => view.dwarves[id]?.ownerId ?? null;
  const say = (id: number, yours: string, theirs: string): string =>
    `${dwarfName(view, id)} ${isYou(id) ? yours : theirs}`;
  const out: Sequence[] = [];
  let current: Draft | null = null;
  const flush = (): void => {
    if (current) out.push(current);
    current = null;
  };
  const start = (
    draft: Omit<Draft, 'id' | 'extra' | 'cues' | 'important' | 'targetPlayerId' | 'flight'> &
      Partial<Pick<Draft, 'important' | 'targetPlayerId' | 'cues' | 'flight'>>,
  ): Draft => {
    flush();
    current = {
      important: false,
      targetPlayerId: null,
      flight: null,
      ...draft,
      id: nextId++,
      extra: [],
      cues: [...(draft.cues ?? [])],
    };
    return current;
  };
  /** Instant où la nouvelle vue est montrée dans la séquence en cours. */
  const revealTime = (draft: Draft): number =>
    draft.cues.find((cue) => cue.type === 'reveal')?.at ?? 0;
  const playedLater = (index: number, dwarfId: number): boolean =>
    events
      .slice(index + 1)
      .some(
        (e) =>
          (e.type === 'ExitActionPlayed' || e.type === 'ExitCardWasted') && e.dwarfId === dwarfId,
      );
  const drawCues = (): Cue[] => [
    { at: 0, type: 'sound', sound: 'draw' },
    { at: FLIP_AT, type: 'sound', sound: 'flip' },
    { at: REVEAL_AT, type: 'reveal' },
  ];

  events.forEach((event, index) => {
    const draft = current;
    switch (event.type) {
      case 'RoundStarted': {
        const first = view.players.find((p) => p.id === event.firstPlayerId)?.name ?? '?';
        start({
          dwarfId: null,
          title: `Manche ${event.round} sur ${view.totalRounds}`,
          name: event.round === view.totalRounds ? 'Dernière manche !' : 'Nouvelle manche',
          detail: `On mélange les pioches… ${first} commence.`,
          visual: { kind: 'round', round: event.round },
          tone: 'info',
          duration: 1800,
          important: true,
          cues: [
            { at: 0, type: 'reveal' },
            { at: 0, type: 'sound', sound: 'shuffle' },
          ],
        });
        return;
      }
      case 'CardDrawn': {
        if (event.deck === 'extraction') {
          const label = EXTRACTION_LABELS[event.card];
          const owner = ownerOf(event.dwarfId);
          start({
            dwarfId: event.dwarfId,
            title: say(event.dwarfId, 'creusez', 'creuse'),
            name: label.name,
            detail: `${label.effect}.`,
            visual: { kind: 'extraction', card: event.card },
            tone: 'info',
            duration: 2100,
            targetPlayerId: owner,
            flight: 'extraction',
            cues: [
              ...drawCues(),
              {
                at: REVEAL_AT + 50,
                type: 'burst',
                effect: 'gold',
                anchor: { kind: 'center' },
                count: event.gold,
                ...(owner ? { target: { kind: 'player', playerId: owner } as const } : {}),
              },
              { at: REVEAL_AT + 120, type: 'sound', sound: 'gold', count: event.gold },
            ],
          });
          return;
        }
        // Votre propre carte à deux actions : la fenêtre de choix s'en charge.
        if (isYou(event.dwarfId) && !playedLater(index, event.dwarfId)) return;
        const played = playedLater(index, event.dwarfId);
        start({
          dwarfId: event.dwarfId,
          title: say(event.dwarfId, 'fuyez', 'fuit'),
          name: 'Carte Exit',
          detail: isYou(event.dwarfId) ? 'Carte piochée.' : 'Choisit une action…',
          visual: event.card
            ? { kind: 'exit', actions: event.card, chosen: null }
            : { kind: 'exitBack' },
          tone: 'info',
          duration: played ? 2000 : 1300,
          flight: 'exit',
          cues: played
            ? [...drawCues(), { at: 1700, type: 'sound', sound: 'dissolve' }]
            : [
                { at: 0, type: 'sound', sound: 'draw' },
                { at: 0, type: 'reveal' },
              ],
        });
        return;
      }
      case 'ExitActionPlayed': {
        const label = EXIT_LABELS[event.action];
        const target =
          draft && draft.dwarfId === event.dwarfId && draft.name === 'Carte Exit'
            ? draft
            : start({
                dwarfId: event.dwarfId,
                title: '',
                name: '',
                detail: '',
                visual: { kind: 'exitBack' },
                tone: 'info',
                duration: 1600,
                cues: [
                  { at: 0, type: 'reveal' },
                  { at: 1300, type: 'sound', sound: 'dissolve' },
                ],
              });
        target.title = say(event.dwarfId, 'jouez', 'joue');
        target.name = label.name;
        target.detail = label.effect;
        target.visual = { kind: 'exit', actions: event.cardActions, chosen: event.action };
        if (event.action === 'goldBonus') target.targetPlayerId = ownerOf(event.dwarfId);
        return;
      }
      case 'ExitCardWasted':
        if (draft && draft.dwarfId === event.dwarfId) {
          draft.name = 'Carte perdue';
          draft.detail = 'Aucune action possible : la carte est défaussée.';
          draft.visual = { kind: 'exit', actions: event.cardActions, chosen: null };
        }
        return;
      case 'DwarfMoved':
        if (draft && event.to !== 0) {
          draft.cues.push({ at: revealTime(draft) + 120, type: 'sound', sound: 'step' });
          draft.cues.push({
            at: revealTime(draft) + 60,
            type: 'burst',
            effect: 'dust',
            anchor: { kind: 'track', position: event.from },
            count: 6,
          });
        }
        return;
      case 'DwarfMoveBlocked':
        draft?.extra.push('Collé au dragon : il reste sur place.');
        return;
      case 'DwarvesSwapped':
        draft?.extra.push(`Échange avec ${dwarfLabel(view, event.targetId)}.`);
        return;
      case 'DwarfExited': {
        const text = `${dwarfLabel(view, event.dwarfId)} atteint la Sortie (place ${event.ladderSlot + 1}).`;
        const exitCues = (at: number): Cue[] => [
          {
            at,
            type: 'burst',
            effect: 'daylight',
            anchor: { kind: 'track', position: 0 },
            count: 1,
          },
          {
            at: at + 100,
            type: 'burst',
            effect: 'sparks',
            anchor: { kind: 'track', position: 0 },
            count: 24,
          },
          { at: at + 100, type: 'sound', sound: 'tada' },
        ];
        if (draft && draft.visual.kind !== 'dragon' && draft.visual.kind !== 'eliminated') {
          draft.extra.push(text);
          draft.tone = 'success';
          draft.cues.push(...exitCues(revealTime(draft) + 350));
        } else {
          start({
            dwarfId: event.dwarfId,
            title: say(event.dwarfId, 'sortez !', 'sort !'),
            name: 'Sortie',
            detail: text,
            visual: { kind: 'exited' },
            tone: 'success',
            duration: 1800,
            cues: [{ at: 0, type: 'reveal' }, ...exitCues(150)],
          });
        }
        return;
      }
      case 'DragonMoved': {
        // Chaque pas de plus monte en intensité, sans allonger sans fin la séquence.
        if (draft?.visual.kind === 'dragon') {
          const step = draft.visual.steps;
          const at = Math.min(step * DRAGON_STEP_MS, 2 * DRAGON_STEP_MS);
          draft.visual = { kind: 'dragon', steps: step + 1 };
          draft.title = `Dragon révélé : ${BRANDING.dragonName} avance de ${step + 1} cartes !`;
          draft.duration = Math.min(draft.duration + DRAGON_STEP_MS, 3200);
          draft.cues.push(
            { at, type: 'shake', strength: Math.min(3, 1 + step * 0.7) },
            { at, type: 'flameSweep', from: event.from, to: event.to },
            { at, type: 'sound', sound: 'flame' },
            {
              at: at + 150,
              type: 'burst',
              effect: 'embers',
              anchor: { kind: 'track', position: event.from },
              count: 18,
            },
          );
          return;
        }
        start({
          dwarfId: null,
          title: `Dragon révélé : ${BRANDING.dragonName} avance !`,
          name: 'Dragon',
          detail: 'La galerie dépassée brûle.',
          visual: { kind: 'dragon', steps: 1 },
          tone: 'danger',
          duration: 1900,
          important: true,
          cues: [
            { at: 0, type: 'reveal' },
            { at: 0, type: 'camera', position: event.to, duration: 1500 },
            { at: 0, type: 'sound', sound: 'roar' },
            { at: 120, type: 'shake', strength: 1 },
            { at: 150, type: 'flameSweep', from: event.from, to: event.to },
            { at: 150, type: 'sound', sound: 'flame' },
            {
              at: 300,
              type: 'burst',
              effect: 'embers',
              anchor: { kind: 'track', position: event.from },
              count: 18,
            },
            { at: 0, type: 'vibrate', pattern: [40, 30, 80] },
          ],
        });
        return;
      }
      case 'DwarfEliminated': {
        // Chaque élimination a sa propre annonce, en grand, après la carte qui l'a causée.
        const who = dwarfNoun(view, event.dwarfId);
        const color = view.dwarves[event.dwarfId]?.color ?? 0;
        const ash: Cue = {
          at: 150,
          type: 'burst',
          effect: 'ash',
          anchor: { kind: 'track', position: event.position },
          count: 26,
        };
        if (draft?.visual.kind === 'eliminated' && draft.dramatic) {
          draft.visual = { kind: 'eliminated', colors: [...draft.visual.colors, color] };
          draft.extra.push(`${who} est aussi éliminé.`);
          draft.cues.push(ash);
          return;
        }
        start({
          dwarfId: event.dwarfId,
          title: `${who} est éliminé !`,
          name:
            event.cause === 'dragon'
              ? `Rattrapé par ${BRANDING.dragonName} sur la carte ${event.position}`
              : 'Resté dans la mine',
          detail: lossText(event),
          visual: { kind: 'eliminated', colors: [color] },
          tone: 'danger',
          dramatic: true,
          duration: 2800,
          important: true,
          cues: [
            { at: 0, type: 'reveal' },
            { at: 0, type: 'sound', sound: 'eliminate' },
            { at: 0, type: 'shake', strength: 1.5 },
            { at: 0, type: 'vibrate', pattern: [60, 40, 120] },
            ash,
          ],
        });
        return;
      }
      case 'TurnSkipped':
        start({
          dwarfId: event.dwarfId,
          title: `Tour de ${dwarfName(view, event.dwarfId)} passé`,
          name: 'Tour passé',
          detail: 'Joueur absent.',
          visual: { kind: 'skipped' },
          tone: 'info',
          duration: 1200,
          cues: [{ at: 0, type: 'reveal' }],
        });
        return;
      default:
        return;
    }
  });
  flush();
  return syncWithDragon(out as Draft[]);
}

/** Effets liés au déplacement des nains, rejoués au moment où le plateau change. */
function followsReveal(cue: Cue): boolean {
  return (
    cue.type === 'reveal' ||
    (cue.type === 'sound' && (cue.sound === 'step' || cue.sound === 'tada')) ||
    (cue.type === 'burst' &&
      (cue.effect === 'dust' || cue.effect === 'daylight' || cue.effect === 'sparks'))
  );
}

/**
 * Quand le coup réveille le dragon, le plateau ne change qu'au début de sa
 * cinématique : nains, dragon et galeries brûlées bougent avec les flammes.
 */
function syncWithDragon(sequences: Draft[]): Sequence[] {
  const dragon = sequences.find((sequence) => sequence.visual.kind === 'dragon');
  if (!dragon) return sequences;
  for (const sequence of sequences) {
    if (sequence === dragon) break;
    const moved = sequence.cues.filter(followsReveal);
    sequence.cues = sequence.cues.filter((cue) => !followsReveal(cue));
    for (const cue of moved) {
      if (cue.type !== 'reveal') dragon.cues.push({ ...cue, at: 80 });
    }
  }
  return sequences;
}

/** Ancien nom, conservé pour les tests et le journal. */
export const buildHighlights = buildSequences;

function lossText(event: Extract<GameEvent, { type: 'DwarfEliminated' }>): string {
  if (event.cause === 'stranded') return 'Il n’a pas quitté la mine à temps : son or est perdu.';
  if (!event.pileLost) return 'Son équipier garde l’or commun.';
  if (event.goldLost === null) return 'Tout son or est perdu.';
  if (event.goldLost === 0) return 'Il n’avait pas encore d’or.';
  return `${plural(event.goldLost, 'pépite')} perdue${event.goldLost > 1 ? 's' : ''} !`;
}

/**
 * Temps écoulé : la pièce est lancée entre les deux options possibles, avant
 * que le coup joué d'office ne s'affiche.
 */
export function buildAutoPlaySequence(autoPlay: AutoPlay, view: PlayerView): Sequence {
  const yours = autoPlay.playerId === view.viewerId;
  const title = yours
    ? 'Temps écoulé !'
    : `Temps écoulé pour ${dwarfName(view, autoPlay.dwarfId)} !`;
  const base = {
    id: nextId++,
    dwarfId: autoPlay.dwarfId,
    title,
    extra: [],
    tone: 'info' as const,
    duration: 2600,
    important: false,
    targetPlayerId: null,
    flight: null,
  };
  if (autoPlay.kind === 'swapTarget') {
    return {
      ...base,
      name: 'Échange au hasard',
      detail: `Avec ${dwarfLabel(view, autoPlay.targetId)}.`,
      visual: { kind: 'coin', heads: '?', tails: '?', side: null },
      duration: 1600,
      cues: [{ at: 0, type: 'sound', sound: 'coin' }],
    };
  }
  const [heads, tails, result] =
    autoPlay.kind === 'draw'
      ? ['Creuser', 'Fuir', autoPlay.result === 'drawExtraction' ? 'Creuser' : 'Fuir']
      : [
          EXIT_LABELS[autoPlay.options[0] ?? autoPlay.result].name,
          EXIT_LABELS[autoPlay.options[1] ?? autoPlay.result].name,
          EXIT_LABELS[autoPlay.result].name,
        ];
  return {
    ...base,
    name: autoPlay.coin ? `Pile ou face… ${result} !` : `Coup automatique : ${result}`,
    detail: autoPlay.coin ? `Pile : ${heads} · Face : ${tails}` : 'Une seule option possible.',
    visual: { kind: 'coin', heads, tails, side: autoPlay.coin },
    cues: autoPlay.coin
      ? [
          { at: 0, type: 'sound', sound: 'coin' },
          { at: 1600, type: 'sound', sound: 'coinLand' },
        ]
      : [],
  };
}

/** Ancien nom, conservé pour les tests. */
export const buildAutoPlayHighlight = buildAutoPlaySequence;
