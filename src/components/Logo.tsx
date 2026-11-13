import { useId } from 'react';

/** Two overlapping circles forming a leaf. Dark forest + mint, near-white overlap. */
export function LogoMark({ size = 36 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const clipId = `eco-lens-${uid}`;
  const height = size * (330 / 487);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 487 330"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="324" cy="165" r="164" />
        </clipPath>
      </defs>
      <circle cx="164" cy="165" r="165" fill="#0A4632" />
      <circle cx="324" cy="165" r="164" fill="#6EE7A0" />
      <circle cx="164" cy="165" r="165" fill="#F0FFF4" clipPath={`url(#${clipId})`} />
      <rect x="241" y="118" width="6" height="190" fill="#05281D" />
    </svg>
  );
}

/** "Eco" light, "Swap" bold mint. */
export function LogoWordmark({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-baseline leading-none"
      style={{ fontSize: size, letterSpacing: '-0.02em', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <span style={{ fontWeight: 300, color: '#E9FFF2' }}>Eco</span>
      <span style={{ fontWeight: 700, color: '#6EE7A0' }}>Swap</span>
    </span>
  );
}

export function Logo({ markSize = 36, textSize = 20 }: { markSize?: number; textSize?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={markSize} />
      <LogoWordmark size={textSize} />
    </span>
  );
}
