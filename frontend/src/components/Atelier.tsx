import { useId, type ReactNode } from "react";
export function HexMark() {
  return (
    <svg
      className="atelier-hex-mark"
      viewBox="0 0 48 54"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 2L46 14.5V39.5L24 52L2 39.5V14.5Z"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M24 10L39 18.5V35.5L24 44L9 35.5V18.5Z"
        stroke="currentColor"
        strokeWidth=".6"
        opacity=".4"
      />
    </svg>
  );
}
export function HoneyPattern() {
  const id = "hive-" + useId().replace(/:/g, "");
  return (
    <svg
      className="atelier-honey"
      aria-hidden="true"
      width="100%"
      height="100%"
    >
      <defs>
        <pattern id={id} width="104" height="90" patternUnits="userSpaceOnUse">
          <path
            d="M26 0H78L104 45 78 90H26L0 45ZM0 45H-26M104 45H130"
            fill="none"
            stroke="currentColor"
            strokeWidth=".8"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
export function BotanicalDecoration() {
  return (
    <svg
      className="atelier-botanical"
      viewBox="0 0 330 420"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1">
        <path d="M30 420Q210 250 220 30M114 327Q40 260 48 170M182 213Q273 181 302 95M211 124Q130 81 140 20" />
        {[
          [101, 340, -40],
          [139, 285, 15],
          [180, 220, 35],
          [205, 155, 20],
          [218, 72, -15],
        ].map(([x, y, a], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
            <path d="M0 0Q-70-18-64-73Q-12-60 0 0Q7-61 60-64Q56-12 0 0Z" />
            <path d="M-55-62L0 0L52-56" opacity=".5" />
          </g>
        ))}
        <g transform="translate(220 30)">
          <circle r="6" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              rx="9"
              ry="19"
              cy="-20"
              transform={`rotate(${a})`}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}
export function CinematicDivider() {
  return (
    <div className="atelier-divider" aria-hidden="true">
      <span>
        <HexMark />
      </span>
    </div>
  );
}
export function BrandedFallback({
  label = "تصویر هنوز منتشر نشده است",
}: {
  label?: string;
}) {
  return (
    <div className="branded-fallback">
      <HoneyPattern />
      <BotanicalDecoration />
      <span dir="ltr">
        ARKHAM<small>HONEY ATELIER</small>
      </span>
      <i />
      <p>{label}</p>
    </div>
  );
}
export function PageHeader({
  title,
  kicker,
  description,
  children,
}: {
  title: string;
  kicker: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-head atelier-header">
      <HoneyPattern />
      <BotanicalDecoration />
      <div className="atelier-header-copy">
        <span className="eyebrow" dir="ltr">
          {kicker}
        </span>
        <h1 tabIndex={-1}>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
      <span className="atelier-header-note" dir="ltr">
        NATURE / HONEY / CRAFT
      </span>
    </header>
  );
}
