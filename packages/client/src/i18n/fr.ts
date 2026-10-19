import type {
  ExitActionKind,
  ExtractionKind,
  GameEvent,
  PlayerView,
  RoundEndCause,
} from '@pepite/engine';
import type { ServerErrorCode } from '@pepite/shared';
import { BRANDING } from '@pepite/shared/branding';

/** Noms et effets des cartes, tels que dans le livret de règles. */
export const EXTRACTION_LABELS: Record<
  ExtractionKind,
  { name: string; effect: string; short: string }
> = {
  redDoor: {
    name: 'Un dragon aux œufs d’or',
    effect: `2 pépites d’or et 1 porte rouge : déplacez votre disque Nain d’1 carte vers la droite, en direction de la carte ${BRANDING.dragonName}`,
    short: `2 pépites d’or · 1 carte vers ${BRANDING.dragonName}`,
  },
  blueDoor: {
    name: 'Il est l’or, monseignor !',
    effect:
      '1 pépite d’or et 1 porte bleue : déplacez votre disque Nain d’1 carte vers la gauche, en direction de la carte Sortie de la mine',
    short: '1 pépite d’or · 1 carte vers la Sortie',
  },
  noDoor: {
    name: 'D’l’or, j’adore !',
    effect: '1 pépite d’or sans porte : votre nain reste sur place',
    short: '1 pépite d’or · reste sur place',
  },
  dragon: {
    name: 'Un dragon ! UN DRAGON !',
    effect: `${BRANDING.dragonName} se déplace immédiatement d’1 carte vers la gauche, en direction de la Sortie de la mine, tout en crachant du feu`,
    short: `${BRANDING.dragonName} avance d’1 carte`,
  },
};

export const EXIT_LABELS: Record<ExitActionKind, { name: string; effect: string; short: string }> =
  {
    step: {
      name: 'Petit pas',
      effect:
        'Déplacez votre disque Nain d’1 carte vers la gauche, en direction de la Sortie de la mine.',
      short: '1 carte vers la Sortie',
    },
    doubleStep: {
      name: 'Double pas',
      effect:
        'Déplacez votre disque Nain de 2 cartes vers la gauche, en direction de la Sortie de la mine. Si le 1er pas suffit pour atteindre la Sortie de la mine, ignorez le 2e pas.',
      short: '2 cartes vers la Sortie',
    },
    allTogether: {
      name: 'Tous ensemble !',
      effect:
        'Déplacez tous les disques Nain d’1 carte vers la gauche, en direction de la Sortie de la mine.',
      short: 'Tous les nains : 1 carte',
    },
    swap: {
      name: 'Échange inter-nain-tional',
      effect:
        'Échangez votre disque Nain contre celui de n’importe quel autre nain présent dans la mine.',
      short: 'Échangez votre place avec un nain',
    },
    goldBonus: {
      name: 'Bonus d’or',
      effect:
        'Placez cette carte face cachée dans votre pile de pépites : si votre nain atteint la Sortie de la mine, ajoutez 3 pépites d’or à votre résultat à la fin de la manche.',
      short: '+3 pépites d’or à la sortie',
    },
  };

/** Couleur et symbole de chaque nain (lisibles aussi sans distinguer les couleurs). */
export const DWARF_LOOKS = [
  { name: 'Ambre', color: '#E69F00', ink: '#1b1200', symbol: 'circle' },
  { name: 'Ciel', color: '#56B4E9', ink: '#04192a', symbol: 'square' },
  { name: 'Sapin', color: '#009E73', ink: '#ffffff', symbol: 'triangle' },
  { name: 'Soleil', color: '#F0E442', ink: '#1f1c00', symbol: 'diamond' },
  { name: 'Prune', color: '#CC79A7', ink: '#22061a', symbol: 'star' },
  { name: 'Saphir', color: '#0072B2', ink: '#ffffff', symbol: 'cross' },
] as const;

export type DwarfSymbol = (typeof DWARF_LOOKS)[number]['symbol'];

export function dwarfLook(color: number): (typeof DWARF_LOOKS)[number] {
  return DWARF_LOOKS[color % DWARF_LOOKS.length]!;
}

export const ERROR_MESSAGES: Partial<Record<ServerErrorCode, string>> = {
  NOT_YOUR_TURN: 'Ce n’est pas votre tour.',
  CHOICE_PENDING: 'Terminez d’abord votre choix en cours.',
  EXIT_DECK_EMPTY: 'Plus aucune carte Exit à piocher (pioche et défausse vides).',
  EXTRACTION_DECK_EMPTY: 'La pioche Extraction est vide.',
  ACTION_IMPOSSIBLE: 'Cette action est impossible pour le moment.',
  ROUND_OVER: 'La manche est terminée.',
  GAME_OVER: 'La partie est terminée.',
  ROOM_NOT_FOUND: 'Aucun salon ne porte ce code.',
  ROOM_FULL: 'Ce salon est complet (6 joueurs).',
  GAME_IN_PROGRESS: 'La partie a déjà commencé dans ce salon.',
  NOT_HOST: 'Seul l’hôte peut faire cela.',
  NOT_ENOUGH_PLAYERS: 'Il faut au moins 2 joueurs : invitez quelqu’un ou ajoutez un bot.',
  RATE_LIMITED: 'Doucement ! Trop d’actions en peu de temps.',
  GRACE_NOT_EXPIRED: 'Laissez-lui encore un peu de temps pour revenir.',
  INVALID_MESSAGE: 'Requête refusée par le serveur.',
};

/** Raison lisible pour laquelle un bouton d'action est désactivé. */
export function reasonText(code: string | null, view: PlayerView): string {
  switch (code) {
    case null:
      return '';
    case 'NOT_YOUR_TURN': {
      const current = view.players.find((p) => p.id === view.currentPlayerId);
      return current ? `C’est au tour de ${current.name}.` : 'Ce n’est pas votre tour.';
    }
    case 'CHOICE_PENDING':
      return 'Terminez d’abord le choix de votre carte Exit.';
    case 'EXIT_DECK_EMPTY':
      return 'Pioche et défausse Exit vides : creusez.';
    case 'ROUND_OVER':
      return 'La manche est terminée.';
    case 'GAME_OVER':
      return 'La partie est terminée.';
    case 'UNKNOWN_PLAYER':
      return 'Vous regardez la partie.';
    default:
      return ERROR_MESSAGES[code as ServerErrorCode] ?? 'Action impossible.';
  }
}

export const ROUND_END_CAUSES: Record<RoundEndCause, string> = {
  dragonReachedExit: `${BRANDING.dragonName} est arrivé devant la Sortie !`,
  mineEmpty: 'Plus aucun nain dans la mine.',
  extractionDeckEmpty: 'La pioche Extraction est épuisée.',
};

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/** Nom affiché d'un nain : « Alice », ou « Alice (Ambre) » quand un joueur a deux nains. */
export function dwarfName(view: PlayerView, dwarfId: number): string {
  const dwarf = view.dwarves[dwarfId];
  if (!dwarf) return 'Un nain';
  const owner = view.players.find((p) => p.id === dwarf.ownerId);
  const name = owner ? (owner.id === view.viewerId ? 'Vous' : owner.name) : 'Un nain';
  return view.doubleDraw ? `${name} (${dwarfLook(dwarf.color).name})` : name;
}

/** « de Bruno », « d’Alice ». */
export function ofName(name: string): string {
  return /^[aeiouyhàâäéèêëîïôöûüœ]/i.test(name) ? `d’${name}` : `de ${name}`;
}

/** Sujet neutre pour annoncer ce qui arrive à un nain : « Votre nain », « Le nain d’Alice ». */
export function dwarfNoun(view: PlayerView, dwarfId: number): string {
  const dwarf = view.dwarves[dwarfId];
  if (!dwarf) return 'Un nain';
  const look = view.doubleDraw ? ` ${dwarfLook(dwarf.color).name}` : '';
  if (dwarf.ownerId === view.viewerId) return `Votre nain${look}`;
  const owner = view.players.find((p) => p.id === dwarf.ownerId)?.name ?? '?';
  return `Le nain${look} ${ofName(owner)}`;
}

/** Libellé d'un nain hors phrase (listes, boutons) : « Votre nain Ambre », « Alice ». */
export function dwarfLabel(view: PlayerView, dwarfId: number): string {
  const dwarf = view.dwarves[dwarfId];
  if (!dwarf || dwarf.ownerId !== view.viewerId) return dwarfName(view, dwarfId);
  return view.doubleDraw ? `Votre nain ${dwarfLook(dwarf.color).name}` : 'Votre nain';
}

function placeName(position: number): string {
  if (position === 0) return 'la Sortie';
  if (position === 4) return 'le Wagon';
  return `la carte ${position}`;
}

/** Texte du journal pour un événement ; `null` pour les événements non affichés. */
export function describeEvent(event: GameEvent, view: PlayerView): string | null {
  const isYou = (id: number): boolean => view.dwarves[id]?.ownerId === view.viewerId;
  // Conjugue selon que le nain est celui du joueur (« vous ») ou d'un autre.
  const say = (id: number, yours: string, theirs: string): string =>
    `${dwarfName(view, id)} ${isYou(id) ? yours : theirs}`;
  const object = (id: number): string => {
    if (!isYou(id)) return dwarfName(view, id);
    const dwarf = view.dwarves[id];
    return view.doubleDraw && dwarf ? `votre nain ${dwarfLook(dwarf.color).name}` : 'vous';
  };
  switch (event.type) {
    case 'RoundStarted': {
      const first = view.players.find((p) => p.id === event.firstPlayerId)?.name ?? '?';
      return `Manche ${event.round} : ${first} commence.`;
    }
    case 'TurnStarted':
      return null;
    case 'CardDrawn': {
      if (event.deck === 'extraction') {
        const card = `${EXTRACTION_LABELS[event.card].name} (+${plural(event.gold, 'pépite')})`;
        return say(event.dwarfId, `creusez : ${card}.`, `creuse : ${card}.`);
      }
      const names = event.card
        ? ` (${event.card.map((a) => EXIT_LABELS[a].name).join(' / ')})`
        : '';
      return say(
        event.dwarfId,
        `piochez une carte Exit${names}.`,
        `pioche une carte Exit${names}.`,
      );
    }
    case 'ExitActionPlayed': {
      const name = EXIT_LABELS[event.action].name;
      return say(event.dwarfId, `jouez « ${name} ».`, `joue « ${name} ».`);
    }
    case 'ExitCardWasted':
      return say(
        event.dwarfId,
        'ne pouvez rien faire de votre carte Exit : elle est défaussée.',
        'ne peut rien faire de sa carte Exit : elle est défaussée.',
      );
    case 'GoldBonusKept':
      return say(
        event.dwarfId,
        'gardez un Bonus d’or (+3 à la sortie).',
        'garde un Bonus d’or (+3 à la sortie).',
      );
    case 'DwarfMoved':
      return event.to === 0
        ? null
        : say(event.dwarfId, `allez sur ${placeName(event.to)}.`, `va sur ${placeName(event.to)}.`);
    case 'DwarfMoveBlocked':
      return say(
        event.dwarfId,
        'restez sur place : le dragon bloque le passage.',
        'reste sur place : le dragon bloque le passage.',
      );
    case 'DwarvesSwapped':
      return say(
        event.dwarfId,
        `échangez votre place avec ${object(event.targetId)}.`,
        `échange sa place avec ${object(event.targetId)}.`,
      );
    case 'DwarfExited': {
      const slot = `place ${event.ladderSlot + 1} sur l’échelle`;
      return say(event.dwarfId, `atteignez la Sortie (${slot}).`, `atteint la Sortie (${slot}).`);
    }
    case 'DragonMoved':
      return `${BRANDING.dragonName} avance et retourne ${event.burnedCardId === 'wagon' ? 'le Wagon' : 'une carte Mine'} sur sa face rouge !`;
    case 'DwarfEliminated': {
      if (event.cause === 'stranded') {
        return say(
          event.dwarfId,
          'n’avez pas quitté la mine à temps.',
          'n’a pas quitté la mine à temps.',
        );
      }
      const yours = isYou(event.dwarfId);
      const amount =
        event.goldLost === null || event.goldLost === 0
          ? ''
          : ` (${plural(event.goldLost, 'pépite')})`;
      const lost = event.pileLost
        ? yours
          ? ` : votre or est perdu${amount}`
          : ` : son or est perdu${amount}`
        : '';
      const target = object(event.dwarfId);
      return target === 'vous'
        ? `${BRANDING.dragonName} vous rattrape${lost}.`
        : `${BRANDING.dragonName} rattrape ${target}${lost}.`;
    }
    case 'ExitDeckReshuffled':
      return `La défausse Exit est remélangée (${plural(event.count, 'carte')}).`;
    case 'TurnSkipped':
      return isYou(event.dwarfId)
        ? 'Votre tour est passé.'
        : `Le tour de ${dwarfName(view, event.dwarfId)} est passé.`;
    case 'RoundEnded':
      return `Fin de la manche ${event.round} : ${ROUND_END_CAUSES[event.cause]}`;
    case 'BigNuggetsAwarded':
      return event.awards.length === 0
        ? 'Personne ne reçoit de Grosse pépite.'
        : event.awards
            .map(
              (a) =>
                `${dwarfName(view, a.dwarfId)} : +${plural(a.count, 'Grosse pépite', 'Grosses pépites')}`,
            )
            .join(' · ');
    case 'GameEnded': {
      const names = event.result.winners.map(
        (id) => view.players.find((p) => p.id === id)?.name ?? '?',
      );
      return names.length > 1
        ? `Victoire partagée : ${names.join(' et ')} !`
        : `${names[0]} remporte la partie !`;
    }
  }
}
