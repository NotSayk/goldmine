import type { DwarfView, PlayerView } from '@pepite/engine';
import type { RoomView } from '@pepite/shared';
import { DwarfToken } from '../assets/DwarfToken';
import { IconChest, IconLock } from '../assets/Icons';
import { BigNugget } from '../assets/Nugget';
import { dwarfLook, plural } from '../i18n/fr';
import { client, type EmoteBubble } from '../store';
import { EmoteBubbleView } from './Emotes';
import { GoldPile } from './GoldPile';

function dwarfStatus(dwarf: DwarfView): string {
  switch (dwarf.status) {
    case 'exit':
      return `sorti (place ${(dwarf.ladderSlot ?? 0) + 1})`;
    case 'eliminated':
      return 'éliminé';
    case 'mine':
      return dwarf.position === 4 ? 'sur le Wagon' : `carte ${dwarf.position}`;
  }
}

const CONNECTION_LABELS = {
  online: 'connecté',
  offline: 'déconnecté (reconnexion possible)',
  away: 'absent',
} as const;

export function Players({
  view,
  room,
  emotes = [],
}: {
  view: PlayerView;
  room: RoomView;
  emotes?: readonly EmoteBubble[];
}) {
  const isHost = room.hostId === view.viewerId;
  return (
    <section className="panel" aria-label="Joueurs">
      <h2 className="panel__title">Joueurs</h2>
      <ul className="players">
        {view.players.map((player) => {
          const roomPlayer = room.players.find((p) => p.id === player.id);
          const dwarves = player.dwarfIds
            .map((id) => view.dwarves[id])
            .filter((d): d is DwarfView => !!d);
          const isYou = player.id === view.viewerId;
          const active = view.currentPlayerId === player.id;
          const secured = dwarves.filter((d) => d.status === 'exit');
          const securedCards = secured.reduce((sum, d) => sum + d.secured.cardCount, 0);
          const securedGold = secured.every((d) => d.secured.gold !== null)
            ? secured.reduce((sum, d) => sum + (d.secured.gold ?? 0), 0)
            : null;
          const connection = roomPlayer?.connection ?? 'online';
          const gold = player.pile.gold;
          return (
            <li
              key={player.id}
              className={`player-card${active ? ' player-card--active' : ''}${isYou ? ' player-card--you' : ''}`}
            >
              <span className="player-card__discs">
                {dwarves.map((d) => (
                  <DwarfToken
                    key={d.id}
                    color={d.color}
                    look={roomPlayer?.look}
                    mood={d.status === 'eliminated' ? 'dead' : d.status === 'exit' ? 'joy' : 'idle'}
                    size={32}
                    label={`Nain ${dwarfLook(d.color).name}`}
                  />
                ))}
              </span>
              <span className="player-card__name">
                {player.name}
                {isYou && ' (vous)'}
                {active && <span className="sr-only"> — joue en ce moment</span>}
              </span>
              <GoldPile playerId={player.id} cards={player.pile.cardCount} gold={gold} />
              <EmoteBubbleView
                bubble={emotes.find((e) => e.playerId === player.id)}
                name={player.name}
              />
              <span className="player-card__stats">
                {!roomPlayer?.isBot && (
                  <span
                    className="status-dot"
                    data-status={connection}
                    role="img"
                    aria-label={CONNECTION_LABELS[connection]}
                    title={CONNECTION_LABELS[connection]}
                  />
                )}
                {roomPlayer?.isHost && <span className="badge">Hôte</span>}
                {roomPlayer?.isBot && <span className="badge">Bot</span>}
                {roomPlayer?.botControlled && (
                  <span className="badge badge--warn">Bot temporaire</span>
                )}
                <span className="stat">{dwarves.map((d) => dwarfStatus(d)).join(' · ')}</span>
                {securedCards > 0 && (
                  <span className="stat" title="Or à l'abri sur la carte Nain">
                    <IconLock size={16} />
                    {securedGold === null
                      ? plural(securedCards, 'carte')
                      : `${plural(securedGold, 'pépite')} à l’abri`}
                  </span>
                )}
                {player.pile.bonusCount > 0 && (
                  <span className="stat" title="Trésors cachés (+3 chacun à la sortie)">
                    <IconChest size={16} /> {player.pile.bonusCount}
                  </span>
                )}
                <span className="stat" title="Grosses pépites">
                  <BigNugget size={18} />
                  <strong>{player.bigNuggets}</strong>
                </span>
              </span>
              {isHost &&
                !isYou &&
                roomPlayer &&
                !roomPlayer.isBot &&
                connection === 'away' &&
                view.phase === 'playing' && (
                  <span className="host-tools">
                    {!roomPlayer.botControlled && (
                      <button
                        type="button"
                        className="btn btn--small btn--ghost"
                        onClick={() => client.send({ type: 'replaceWithBot', playerId: player.id })}
                      >
                        Remplacer par un bot
                      </button>
                    )}
                    {active && !roomPlayer.botControlled && (
                      <button
                        type="button"
                        className="btn btn--small btn--ghost"
                        onClick={() => client.send({ type: 'skipPlayer', playerId: player.id })}
                      >
                        Passer son tour
                      </button>
                    )}
                  </span>
                )}
            </li>
          );
        })}
      </ul>
      <p className="small muted" style={{ marginTop: 8 }}>
        Grosses pépites en réserve : {view.bigNuggetReserve}
      </p>
    </section>
  );
}
