/** Tête du dragon (dessin original), tournée vers la gauche, vers la Sortie. */
export function DragonHead({ size = 48, label }: { size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* Fumée */}
      <circle cx="9" cy="22" r="4" fill="var(--smoke)" opacity="0.7" />
      <circle cx="5" cy="16" r="2.6" fill="var(--smoke)" opacity="0.55" />
      {/* Cornes */}
      <path
        d="M38 14 L46 3 L45 16 Z"
        fill="var(--dragon-horn)"
        stroke="#14161c"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M46 18 L58 10 L53 22 Z"
        fill="var(--dragon-horn)"
        stroke="#14161c"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Crête et cou */}
      <path
        d="M44 40 Q60 40 60 58 L40 60 Z"
        fill="var(--dragon-dark)"
        stroke="#14161c"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Tête */}
      <path
        d="M14 30 Q14 20 26 18 L40 14 Q54 14 54 30 Q54 44 40 46 L24 46 Q14 46 12 40 Z"
        fill="var(--dragon)"
        stroke="#14161c"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Mâchoire et ventre */}
      <path
        d="M14 38 Q24 41 40 40 Q44 44 38 46 L24 46 Q15 46 14 38 Z"
        fill="var(--dragon-belly)"
        stroke="#14161c"
        strokeWidth="1.6"
      />
      {/* Dents */}
      <path
        d="M20 38.5 L22 42 L24 38.8 M27 39 L29 42.5 L31 39"
        fill="#fffaf0"
        stroke="#14161c"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Narine et oeil */}
      <ellipse cx="18.5" cy="27" rx="1.6" ry="2.2" fill="#14161c" />
      <path
        d="M33 25 Q38 20 44 25 Q38 29 33 25 Z"
        fill="#ffe36b"
        stroke="#14161c"
        strokeWidth="1.6"
      />
      <ellipse cx="38.5" cy="25" rx="1.2" ry="2.4" fill="#14161c" />
      <path d="M31 20 L44 18" stroke="#14161c" strokeWidth="2" strokeLinecap="round" />
      {/* Écailles */}
      <path
        d="M44 33 q3 -3 6 0 M40 37 q3 -3 6 0"
        fill="none"
        stroke="var(--dragon-dark)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Souffle de flammes (effet visuel). */
export function Flame({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        d="M24 46 Q6 40 10 24 Q14 30 18 28 Q14 14 26 2 Q26 14 34 18 Q36 12 34 8 Q46 20 40 36 Q36 46 24 46 Z"
        fill="var(--flame-outer)"
      />
      <path
        d="M24 44 Q14 40 16 30 Q20 34 23 32 Q22 22 28 16 Q30 26 34 30 Q36 40 24 44 Z"
        fill="var(--flame-inner)"
      />
      <path d="M24 42 Q19 39 21 34 Q24 36 26 33 Q29 38 24 42 Z" fill="#fff6c8" />
    </svg>
  );
}
