/** Hypotheur logo mark: a house with rising bars. Same artwork as /logos/hypotheur-a-house-bars.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Hypotheur"
    >
      <rect width="64" height="64" rx="14" fill="var(--primary)" />
      <path
        d="M14 31 32 16l18 15"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 28v18a3 3 0 0 0 3 3h20a3 3 0 0 0 3-3V28"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <rect
        x="24.5"
        y="38"
        width="4"
        height="7"
        rx="1.2"
        fill="var(--primary-foreground)"
      />
      <rect
        x="30"
        y="34"
        width="4"
        height="11"
        rx="1.2"
        fill="var(--primary-foreground)"
      />
      <rect
        x="35.5"
        y="30"
        width="4"
        height="15"
        rx="1.2"
        fill="var(--primary-foreground)"
      />
    </svg>
  );
}
