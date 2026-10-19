import type { CSSProperties } from 'react';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Compteur dont les chiffres défilent comme un compteur mécanique. Purement
 * visuel : le nombre est donné en clair aux lecteurs d'écran.
 */
export function RollingNumber({
  value,
  className = '',
}: {
  value: number | null;
  className?: string;
}) {
  if (value === null) return <span className={`rolling ${className}`}>?</span>;
  const digits = String(Math.max(0, Math.round(value))).split('');
  return (
    <span className={`rolling ${className}`}>
      <span className="sr-only">{value}</span>
      <span className="rolling__digits" aria-hidden>
        {digits.map((digit, i) => (
          // Clé par rang depuis la droite : les unités restent la même colonne.
          <span key={digits.length - i} className="rolling__column">
            <span className="rolling__strip" style={{ '--d': Number(digit) } as CSSProperties}>
              {DIGITS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
