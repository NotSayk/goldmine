import type { ReactNode } from 'react';

/** Pictogrammes originaux (24 × 24, couleur du texte), à la place des emojis. */
function Icon({
  size = 20,
  label,
  children,
  className,
}: {
  size?: number;
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number; label?: string; className?: string };

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6 L18 18 M18 6 L6 18" strokeWidth="2.6" />
    </Icon>
  );
}

export function IconGear(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7.1 7.1 M16.9 16.9 L18.7 18.7 M5.3 18.7 L7.1 16.9 M16.9 7.1 L18.7 5.3" />
      <circle cx="12" cy="12" r="7" />
    </Icon>
  );
}

export function IconBook(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5 Q8 3 12 5.5 Q16 3 20 5 V19 Q16 17 12 19.5 Q8 17 4 19 Z" />
      <path d="M12 5.5 V19.5" />
    </Icon>
  );
}

export function IconSkip(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 6 L13 12 L5 18 Z" fill="currentColor" />
      <path d="M12 6 L20 12 L12 18 Z" fill="currentColor" stroke="none" opacity="0.7" />
      <path d="M20 5.5 V18.5" />
    </Icon>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 2 L13.8 9.2 L21 12 L13.8 14.8 L12 22 L10.2 14.8 L3 12 L10.2 9.2 Z"
        fill="currentColor"
        strokeWidth="1"
      />
    </Icon>
  );
}

export function IconSkull(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M12 3 C7 3 4.5 6.5 4.5 10.5 C4.5 13 5.6 14.6 7 15.6 V19 H17 V15.6 C18.4 14.6 19.5 13 19.5 10.5 C19.5 6.5 17 3 12 3 Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <circle cx="9" cy="11" r="1.9" fill="currentColor" />
      <circle cx="15" cy="11" r="1.9" fill="currentColor" />
      <path d="M12 13.5 L11 15.5 H13 Z" fill="currentColor" strokeWidth="1" />
      <path d="M10 19 V17 M14 19 V17 M12 19 V17" strokeWidth="1.4" />
    </Icon>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor" fillOpacity="0.15" />
      <path d="M8 10.5 V8 A4 4 0 0 1 16 8 V10.5" />
      <path d="M12 14.5 V16.5" />
    </Icon>
  );
}

export function IconChest(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 11 H20.5 V19.5 H3.5 Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M3.5 11 V8.5 Q3.5 5 7 5 H17 Q20.5 5 20.5 8.5 V11" />
      <path d="M10.5 10 H13.5 V13.5 H10.5 Z" fill="currentColor" />
      <path d="M8 5 V11 M16 5 V11" strokeWidth="1.4" />
    </Icon>
  );
}

export function IconCrown(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M3.5 8 L8 12 L12 5 L16 12 L20.5 8 L19 18 H5 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <path d="M5 21 H19" />
    </Icon>
  );
}

export function IconPickaxe(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 21 L15 9" strokeWidth="2.4" />
      <path d="M8 5.5 Q14 2 20.5 7 Q15 5.5 11 9.5 Z" fill="currentColor" fillOpacity="0.3" />
    </Icon>
  );
}

export function IconRun(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 21 V7 Q4 3.5 8 3.5 Q12 3.5 12 7 V21" />
      <path d="M13 13 H21 M18 10 L21 13 L18 16" />
    </Icon>
  );
}

export function IconSound({ muted, ...props }: IconProps & { muted?: boolean }) {
  return (
    <Icon {...props}>
      <path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" fill="currentColor" fillOpacity="0.2" />
      {muted ? (
        <path d="M16 9.5 L21 14.5 M21 9.5 L16 14.5" />
      ) : (
        <path d="M15.5 9 Q17.5 12 15.5 15 M18.5 6.5 Q22.5 12 18.5 17.5" />
      )}
    </Icon>
  );
}

export function IconShare(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 V15 M7.5 8 L12 3.5 L16.5 8" />
      <path d="M5 12.5 V19.5 H19 V12.5" />
    </Icon>
  );
}

export function IconSmile(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14 Q12 17.5 15.5 14" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
    </Icon>
  );
}
