/** Pépite d'or. */
export function Nugget({ size = 18, label }: { size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path
        d="M3.5 15.5 L6 8.5 L12 5.5 L18.5 7.5 L21 13.5 L17.5 19 L9 19.5 Z"
        fill="var(--gold)"
        stroke="var(--gold-ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 10 L12 7.6 L15.5 8.8"
        fill="none"
        stroke="var(--gold-light)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 19.5 L11 13 L21 13.5 M11 13 L6 8.5"
        fill="none"
        stroke="var(--gold-ink)"
        strokeWidth="0.8"
        opacity="0.5"
      />
    </svg>
  );
}

/** Grosse pépite (récompense des manches 1 et 2). */
export function BigNugget({ size = 22, label }: { size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path
        d="M2.5 18 L5 9 L12 4.5 L20 5.5 L25.5 12 L24 20.5 L15.5 24.5 L6.5 23.5 Z"
        fill="var(--gold)"
        stroke="var(--gold-ink)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 10.5 L12.5 7 L18.5 7.8"
        fill="none"
        stroke="var(--gold-light)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M12 16 L15 13 L20 15 L17 19 Z" fill="var(--gold-ink)" opacity="0.18" />
      <path
        d="M23 2 L24 4.5 L26.5 5.5 L24 6.5 L23 9 L22 6.5 L19.5 5.5 L22 4.5 Z"
        fill="var(--sparkle)"
      />
    </svg>
  );
}
