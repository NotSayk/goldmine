import type { RoomPlayerView } from '@pepite/shared';
import { LOOK_OPTIONS, type DwarfLook, type LookPart } from '@pepite/shared/cosmetics';
import { BEARD_COLORS, DwarfToken, SKIN_TONES } from '../assets/DwarfToken';
import { DWARF_LOOKS, LOOK_NAMES } from '../i18n/fr';
import { client } from '../store';

function pick(count: number): number {
  return Math.floor(Math.random() * count);
}

/**
 * Apparence de ses nains, visible de tous : couleur (une par joueur), chapeau,
 * barbe, couleur de barbe et teint. Se choisit dans le salon.
 */
export function LookPicker({
  look,
  players,
  playerId,
}: {
  look: DwarfLook;
  players: readonly RoomPlayerView[];
  playerId: string;
}) {
  const owners = new Map(
    players.filter((p) => p.id !== playerId).map((p) => [p.look.color, p.name] as const),
  );
  // Seuls les éléments changés partent : deux choix rapprochés ne s'annulent pas.
  const choose = (patch: Partial<DwarfLook>): void => client.send({ type: 'setLook', ...patch });
  const randomize = (): void => {
    const free = DWARF_LOOKS.map((_, i) => i).filter((i) => !owners.has(i));
    choose({
      color: free[pick(free.length)] ?? look.color,
      hat: pick(LOOK_OPTIONS.hat),
      beard: pick(LOOK_OPTIONS.beard),
      beardColor: pick(LOOK_OPTIONS.beardColor),
      skin: pick(LOOK_OPTIONS.skin),
    });
  };

  /** Variantes dessinées sur son propre nain (chapeau, barbe). */
  const shapes = (label: string, part: 'hat' | 'beard') => (
    <div className="field" role="group" aria-label={label}>
      <span className="field__label">{label}</span>
      <div className="look-options">
        {LOOK_NAMES[part].map((name, i) => (
          <button
            key={name}
            type="button"
            className="look-option"
            aria-pressed={look[part] === i}
            onClick={() => choose({ [part]: i })}
          >
            <DwarfToken color={look.color} look={{ ...look, [part]: i }} size={36} />
            <span>{name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const tints = (
    label: string,
    part: LookPart,
    colors: readonly string[],
    names: readonly string[],
  ) => (
    <div className="field" role="group" aria-label={label}>
      <span className="field__label">{label}</span>
      <div className="swatches">
        {colors.map((color, i) => (
          <button
            key={color}
            type="button"
            className="swatch"
            style={{ background: color }}
            aria-pressed={look[part] === i}
            aria-label={names[i]}
            title={names[i]}
            onClick={() => choose({ [part]: i })}
          />
        ))}
      </div>
    </div>
  );

  return (
    <section className="panel look-picker" aria-label="Votre nain">
      <div className="look-picker__preview" aria-hidden>
        <DwarfToken color={look.color} look={look} size={96} />
      </div>
      <div className="stack">
        <div className="look-picker__head">
          <h2>Votre nain</h2>
          <button type="button" className="btn btn--small btn--ghost" onClick={randomize}>
            Au hasard
          </button>
        </div>
        <div className="field" role="group" aria-label="Couleur">
          <span className="field__label">Couleur (une par joueur)</span>
          <div className="swatches">
            {DWARF_LOOKS.map((palette, i) => {
              const owner = owners.get(i);
              return (
                <button
                  key={palette.name}
                  type="button"
                  className="swatch swatch--dwarf"
                  style={{ background: palette.color, color: palette.ink }}
                  aria-pressed={look.color === i}
                  disabled={owner !== undefined}
                  aria-label={owner ? `${palette.name}, prise par ${owner}` : palette.name}
                  title={owner ? `${palette.name} (prise par ${owner})` : palette.name}
                  onClick={() => choose({ color: i })}
                >
                  <SwatchSymbol symbol={palette.symbol} />
                </button>
              );
            })}
          </div>
        </div>
        {shapes('Chapeau', 'hat')}
        {shapes('Barbe', 'beard')}
        {tints('Couleur de la barbe', 'beardColor', BEARD_COLORS, LOOK_NAMES.beardColor)}
        {tints(
          'Teint',
          'skin',
          SKIN_TONES.map((tone) => tone.skin),
          LOOK_NAMES.skin,
        )}
      </div>
    </section>
  );
}

/** Symbole de la couleur, pour la distinguer sans voir les couleurs. */
function SwatchSymbol({ symbol }: { symbol: (typeof DWARF_LOOKS)[number]['symbol'] }) {
  const shape = (() => {
    switch (symbol) {
      case 'circle':
        return <circle cx="10" cy="10" r="5" />;
      case 'square':
        return <rect x="5.5" y="5.5" width="9" height="9" rx="1.2" />;
      case 'triangle':
        return <path d="M10 4.5 L15.5 15 H4.5 Z" />;
      case 'diamond':
        return <path d="M10 4 L16 10 L10 16 L4 10 Z" />;
      case 'star':
        return (
          <path d="M10 3.6 L11.9 8 L16.6 8.3 L13 11.4 L14.1 16 L10 13.5 L5.9 16 L7 11.4 L3.4 8.3 L8.1 8 Z" />
        );
      case 'cross':
        return <path d="M8 4.5 H12 V8 H15.5 V12 H12 V15.5 H8 V12 H4.5 V8 H8 Z" />;
    }
  })();
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" aria-hidden>
      {shape}
    </svg>
  );
}
