type LogoProps = { className?: string };

/**
 * Marque MGFL — une balance (pont à bascule) surmontée d'une feuille lime
 * (fruits & légumes), sur un badge vert de marque.
 */
export function Logo({ className = "h-9 w-9" }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#1A7F37" />
      <g stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 9V24" />
        <path d="M8 11.5H24" />
        <path d="M12 24H20" />
      </g>
      <g stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5C5 15 6.5 16.5 8 16.5C9.5 16.5 11 15 11 12.5" />
        <path d="M21 12.5C21 15 22.5 16.5 24 16.5C25.5 16.5 27 15 27 12.5" />
      </g>
      <path d="M16 9C13.5 8 13.5 4.5 16 3.5C18.5 4.5 18.5 8 16 9Z" fill="#94C245" />
    </svg>
  );
}
