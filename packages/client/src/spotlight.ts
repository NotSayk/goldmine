import type { ExitActionKind, ExtractionKind, GameEvent, PlayerView } from '@pepite/engine';
import { BRANDING } from '@pepite/shared/branding';
import { EXIT_LABELS, EXTRACTION_LABELS, dwarfLabel, dwarfName } from './i18n/fr';

export type HighlightVisual =
  | { readonly kind: 'extraction'; readonly card: ExtractionKind }
  | { readonly kind: 'exitBack' }
  | {
      readonly kind: 'exit';
      readonly actions: readonly ExitActionKind[];
      readonly chosen: ExitActionKind | null;
    }
  | { readonly kind: 'dragon'; readonly steps: number }
  | { readonly kind: 'exited' }
  | { readonly kind: 'skipped' };

/** Coup mis en avant au premier plan (carte piochée, action jouée, dragon…). */
export interface Highlight {
  readonly id: number;
  /** Nain qui a joué (couleur et disque), `null` pour le dragon. */
  readonly dwarfId: number | null;
  readonly title: string;
  readonly name: string;
  readonly detail: string;
  /** Conséquences du coup : sorties, éliminations, échanges… */
  readonly extra: readonly string[];
  readonly visual: HighlightVisual;
  readonly tone: 'info' | 'danger' | 'success';
}

let nextId = 1;

type Draft = { -readonly [K in keyof Highlight]: Highlight[K] } & { extra: string[] };

/**
 * Regroupe les événements d'un coup en temps forts à afficher. Les textes
 * décrivent ce qui s'est passé ; aucune règle n'est recalculée ici.
 */
export function buildHighlights(events: readonly GameEvent[], view: PlayerView): Highlight[] {
  const isYou = (id: number): boolean => view.dwarves[id]?.ownerId === view.viewerId;
  const say = (id: number, yours: string, theirs: string): string =>
    `${dwarfName(view, id)} ${isYou(id) ? yours : theirs}`;
  const out: Highlight[] = [];
  let current: Draft | null = null;
  const flush = (): void => {
    if (current) out.push(current);
    current = null;
  };
  const start = (draft: Omit<Draft, 'id' | 'extra'>): Draft => {
    flush();
    current = { ...draft, id: nextId++, extra: [] };
    return current;
  };
  const playedLater = (index: number, dwarfId: number): boolean =>
    events
      .slice(index + 1)
      .some(
        (e) =>
          (e.type === 'ExitActionPlayed' || e.type === 'ExitCardWasted') && e.dwarfId === dwarfId,
      );

  events.forEach((event, index) => {
    const draft = current;
    switch (event.type) {
      case 'CardDrawn': {
        if (event.deck === 'extraction') {
          const label = EXTRACTION_LABELS[event.card];
          start({
            dwarfId: event.dwarfId,
            title: say(event.dwarfId, 'creusez', 'creuse'),
            name: label.name,
            detail: `${label.effect}.`,
            visual: { kind: 'extraction', card: event.card },
            tone: 'info',
          });
          return;
        }
        // Votre propre carte à deux actions : la fenêtre de choix s'en charge.
        if (isYou(event.dwarfId) && !playedLater(index, event.dwarfId)) return;
        start({
          dwarfId: event.dwarfId,
          title: say(event.dwarfId, 'fuyez', 'fuit'),
          name: 'Carte Exit',
          detail: isYou(event.dwarfId) ? 'Carte piochée.' : 'Choisit une action…',
          visual: event.card
            ? { kind: 'exit', actions: event.card, chosen: null }
            : { kind: 'exitBack' },
          tone: 'info',
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
              });
        target.title = say(event.dwarfId, 'jouez', 'joue');
        target.name = label.name;
        target.detail = label.effect;
        target.visual = { kind: 'exit', actions: event.cardActions, chosen: event.action };
        return;
      }
      case 'ExitCardWasted':
        if (draft && draft.dwarfId === event.dwarfId) {
          draft.name = 'Carte perdue';
          draft.detail = 'Aucune action possible : la carte est défaussée.';
          draft.visual = { kind: 'exit', actions: event.cardActions, chosen: null };
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
        if (draft && draft.visual.kind !== 'dragon') {
          draft.extra.push(text);
          draft.tone = 'success';
        } else {
          start({
            dwarfId: event.dwarfId,
            title: say(event.dwarfId, 'sortez !', 'sort !'),
            name: 'Sortie',
            detail: text,
            visual: { kind: 'exited' },
            tone: 'success',
          });
        }
        return;
      }
      case 'DragonMoved': {
        if (draft?.visual.kind === 'dragon') {
          const steps = draft.visual.steps + 1;
          draft.visual = { kind: 'dragon', steps };
          draft.title = `${BRANDING.dragonName} avance de ${steps} cartes !`;
          return;
        }
        start({
          dwarfId: null,
          title: `${BRANDING.dragonName} avance !`,
          name: 'Dragon',
          detail: 'La galerie dépassée brûle.',
          visual: { kind: 'dragon', steps: 1 },
          tone: 'danger',
        });
        return;
      }
      case 'DwarfEliminated': {
        const who = dwarfLabel(view, event.dwarfId);
        const text =
          event.cause === 'dragon'
            ? `${who} : rattrapé${event.pileLost ? ', or perdu' : ''}.`
            : `${who} n’a pas quitté la mine à temps.`;
        if (draft) {
          draft.extra.push(text);
          draft.tone = 'danger';
        }
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
        });
        return;
      default:
        return;
    }
  });
  flush();
  return out;
}

/** Durée d'affichage selon la file d'attente : on accélère si les coups s'enchaînent. */
export function highlightDuration(queueLength: number): number {
  if (queueLength >= 5) return 700;
  if (queueLength >= 3) return 1100;
  return 1900;
}
