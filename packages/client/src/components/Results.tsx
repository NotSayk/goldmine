import { useEffect, useState, type CSSProperties } from 'react';
import type { PlayerView, RoundResult } from '@pepite/engine';
import { DwarfToken } from '../assets/DwarfToken';
import { IconCrown, IconShare } from '../assets/Icons';
import { BigNugget } from '../assets/Nugget';
import { emitFx } from '../fx/bus';
import type { GoldSample } from '../fx/gold';
import { ROUND_END_CAUSES, dwarfName } from '../i18n/fr';
import { useLooks } from '../looks';
import { reducedMotion } from '../preferences';

/** Écart entre deux révélations, et pause avant le premier (ralenti). */
const STEP_MS = 800;
const SUSPENSE_MS = 1000;

/** Délai de révélation d'une ligne : du dernier au premier, le premier après une pause. */
function revealDelay(index: number, count: number): number {
  const order = count - 1 - index;
  return order * STEP_MS + (index === 0 && count > 1 ? SUSPENSE_MS : 0);
}

/** État « cérémonie terminée » : passée par le joueur, ou d'elle-même une fois jouée. */
function useCeremonyDone(lengthMs: number): [boolean, () => void] {
  const [done, setDone] = useState(() => reducedMotion());
  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setDone(true), lengthMs + 1200);
    return () => clearTimeout(timer);
  }, [done, lengthMs]);
  return [done, () => setDone(true)];
}

function SkipCeremony({ onSkip }: { onSkip: () => void }) {
  return (
    <button type="button" className="btn btn--small btn--ghost ceremony__skip" onClick={onSkip}>
      Tout afficher
    </button>
  );
}

/**
 * Cérémonie de fin de manche : classement révélé du dernier au premier, les
 * Grosses pépites volent jusqu'aux nains récompensés, ralenti sur le premier.
 */
export function RoundResultTable({ view, result }: { view: PlayerView; result: RoundResult }) {
  const looks = useLooks();
  const count = result.ranking.length;
  const [done, finish] = useCeremonyDone(revealDelay(0, count));
  return (
    <div className={`stack ceremony${done ? ' ceremony--done' : ''}`}>
      <p className="ceremony__cause">
        <strong>{ROUND_END_CAUSES[result.cause]}</strong>
      </p>
      {count === 0 ? (
        <p>Aucun nain n’a atteint la Sortie : personne ne marque.</p>
      ) : (
        <table className="results">
          <caption className="sr-only">Classement des nains sortis</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Nain</th>
              <th scope="col" className="num">
                Or
              </th>
              <th scope="col" className="num">
                Bonus d’or
              </th>
              <th scope="col" className="num">
                Total
              </th>
              {result.round < view.totalRounds && (
                <th scope="col" className="num">
                  <BigNugget size={16} label="Grosses pépites gagnées" />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {result.ranking.map((entry, index) => {
              const dwarf = view.dwarves[entry.dwarfId];
              const delay = revealDelay(index, count);
              return (
                <tr
                  key={entry.dwarfId}
                  className={`ceremony__row${index === 0 && entry.total > 0 ? ' winner-row ceremony__row--first' : ''}`}
                  style={{ '--delay': `${delay}ms` } as CSSProperties}
                >
                  <td>{index + 1}</td>
                  <td>
                    <span className="ceremony__who">
                      {dwarf && (
                        <DwarfToken
                          color={dwarf.color}
                          look={looks.get(dwarf.ownerId)}
                          mood="joy"
                          size={28}
                        />
                      )}
                      {dwarfName(view, entry.dwarfId)}
                    </span>
                    <span className="muted small"> (échelle {entry.ladderSlot + 1})</span>
                  </td>
                  <td className="num">{entry.extractionGold}</td>
                  <td className="num">{entry.bonusCount > 0 ? `+${entry.bonusCount * 3}` : '–'}</td>
                  <td className="num">
                    <strong>{entry.total}</strong>
                  </td>
                  {result.round < view.totalRounds && (
                    <td className="num">
                      {entry.bigNuggetsAwarded > 0 ? (
                        <span className="awards" aria-label={`+${entry.bigNuggetsAwarded}`}>
                          {Array.from({ length: entry.bigNuggetsAwarded }, (_, i) => (
                            <span
                              key={i}
                              className="award"
                              style={
                                { '--award-delay': `${delay + 250 + i * 140}ms` } as CSSProperties
                              }
                              aria-hidden
                            >
                              <BigNugget size={18} />
                            </span>
                          ))}
                        </span>
                      ) : (
                        '–'
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {result.eliminated.length > 0 && (
        <p className="small muted">
          Sans or cette manche : {result.eliminated.map((id) => dwarfName(view, id)).join(', ')}.
        </p>
      )}
      <p className="small muted">
        À égalité, le nain le plus haut sur l’échelle de la Sortie passe devant.
      </p>
      {!done && count > 1 && <SkipCeremony onSkip={finish} />}
    </div>
  );
}

/** Partage (ou téléchargement) de l'image récapitulative, générée à la demande. */
function ShareRecap({ view, history }: { view: PlayerView; history: readonly GoldSample[] }) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const share = async (): Promise<void> => {
    setStatus('busy');
    try {
      const { buildRecap, renderRecap } = await import('../fx/recap');
      const data = buildRecap(view, history);
      if (!data) throw new Error('Partie non terminée');
      const blob = await renderRecap(data);
      const file = new File([blob], 'pepite-rush-recap.png', { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: data.title, text: data.headline });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };
  return (
    <button
      type="button"
      className="btn btn--ghost"
      disabled={status === 'busy'}
      onClick={() => void share()}
    >
      <IconShare size={18} />
      {status === 'busy'
        ? 'Préparation…'
        : status === 'done'
          ? 'Récapitulatif prêt'
          : status === 'error'
            ? 'Réessayer le récapitulatif'
            : 'Partager le récapitulatif'}
    </button>
  );
}

/**
 * Fin de partie : scores révélés un à un, couronne et confettis pour le
 * vainqueur, récapitulatif partageable.
 */
export function FinalStandings({
  view,
  history = [],
}: {
  view: PlayerView;
  history?: readonly GoldSample[];
}) {
  const result = view.finalResult;
  const count = result?.standings.length ?? 0;
  const crownAt = revealDelay(0, count) + 300;
  const [done, finish] = useCeremonyDone(crownAt);

  // Confettis quand le premier est révélé.
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(
      () => emitFx({ type: 'burst', effect: 'confetti', anchor: { kind: 'center' }, count: 140 }),
      done ? 0 : crownAt,
    );
    return () => clearTimeout(timer);
    // Une seule pluie de confettis par fin de partie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!result) return null;
  const names = result.winners.map((id) => view.players.find((p) => p.id === id)?.name ?? '?');
  const youWon = view.viewerId !== null && result.winners.includes(view.viewerId);
  return (
    <div
      className={`stack ceremony${done ? ' ceremony--done' : ''}`}
      style={{ '--crown-delay': `${crownAt}ms` } as CSSProperties}
    >
      <div className="final-hero">
        <h2>
          <IconCrown size={34} className="final-hero__crown" />
          <span>
            {youWon
              ? 'Vous gagnez !'
              : `${names.join(' et ')} ${names.length > 1 ? 'gagnent' : 'gagne'} !`}
          </span>
        </h2>
        {names.length > 1 && <p className="muted">Égalité parfaite : la victoire est partagée.</p>}
      </div>
      <table className="results">
        <caption className="sr-only">Classement final</caption>
        <thead>
          <tr>
            <th scope="col">Rang</th>
            <th scope="col">Joueur</th>
            <th scope="col" className="num">
              Or
            </th>
            <th scope="col" className="num">
              Bonus d’or
            </th>
            <th scope="col" className="num">
              <BigNugget size={16} label="Grosses pépites" />
            </th>
            <th scope="col" className="num">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {result.standings.map((standing, index) => (
            <tr
              key={standing.playerId}
              className={`ceremony__row${standing.rank === 1 ? ' winner-row ceremony__row--first' : ''}`}
              style={{ '--delay': `${revealDelay(index, count)}ms` } as CSSProperties}
            >
              <td>
                {standing.rank === 1 ? (
                  <IconCrown size={20} className="ceremony__crown" label="Vainqueur" />
                ) : (
                  standing.rank
                )}
              </td>
              <td>
                {view.players.find((p) => p.id === standing.playerId)?.name}
                {standing.bestLadderSlot === null && (
                  <span className="muted small"> (pas sorti)</span>
                )}
              </td>
              <td className="num">{standing.extractionGold}</td>
              <td className="num">{standing.bonusGold || '–'}</td>
              <td className="num">{standing.bigNuggets}</td>
              <td className="num">
                <strong>{standing.total}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">
        Manche 3 : chaque Grosse pépite vaut une pépite. Un joueur resté dans la mine ne compte que
        ses Grosses pépites.
      </p>
      <div className="row">
        <ShareRecap view={view} history={history} />
        {!done && <SkipCeremony onSkip={finish} />}
      </div>
    </div>
  );
}
