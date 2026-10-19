import type { PlayerView, RoundResult } from '@pepite/engine';
import { IconCrown } from '../assets/Icons';
import { BigNugget } from '../assets/Nugget';
import { ROUND_END_CAUSES, dwarfName } from '../i18n/fr';

export function RoundResultTable({ view, result }: { view: PlayerView; result: RoundResult }) {
  return (
    <div className="stack">
      <p>
        <strong>{ROUND_END_CAUSES[result.cause]}</strong>
      </p>
      {result.ranking.length === 0 ? (
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
                Trésors
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
            {result.ranking.map((entry, index) => (
              <tr
                key={entry.dwarfId}
                className={index === 0 && entry.total > 0 ? 'winner-row' : undefined}
              >
                <td>{index + 1}</td>
                <td>
                  {dwarfName(view, entry.dwarfId)}
                  <span className="muted small"> (échelle {entry.ladderSlot + 1})</span>
                </td>
                <td className="num">{entry.extractionGold}</td>
                <td className="num">{entry.bonusCount > 0 ? `+${entry.bonusCount * 3}` : '–'}</td>
                <td className="num">
                  <strong>{entry.total}</strong>
                </td>
                {result.round < view.totalRounds && (
                  <td className="num">
                    {entry.bigNuggetsAwarded > 0 ? `+${entry.bigNuggetsAwarded}` : '–'}
                  </td>
                )}
              </tr>
            ))}
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
    </div>
  );
}

export function FinalStandings({ view }: { view: PlayerView }) {
  const result = view.finalResult;
  if (!result) return null;
  const names = result.winners.map((id) => view.players.find((p) => p.id === id)?.name ?? '?');
  const youWon = view.viewerId !== null && result.winners.includes(view.viewerId);
  return (
    <div className="stack">
      <div className="final-hero">
        <h2>
          <IconCrown size={30} className="final-hero__crown" />
          {youWon
            ? 'Vous gagnez !'
            : `${names.join(' et ')} ${names.length > 1 ? 'gagnent' : 'gagne'} !`}
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
              Trésors
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
          {result.standings.map((standing) => (
            <tr key={standing.playerId} className={standing.rank === 1 ? 'winner-row' : undefined}>
              <td>{standing.rank}</td>
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
    </div>
  );
}
