interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  theme?: 'dark' | 'light';
  className?: string;
}

const sizeConfig = {
  sm: { icon: 24, full: 100 },
  md: { icon: 32, full: 140 },
  lg: { icon: 48, full: 200 },
} as const;

function ShipMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sail: tall triangle whose left edge angles to suggest a checkmark */}
      <path d="M18 36 L28 28 L36 8 L36 40 Z" fill="#F97316" />
      {/* Secondary sail (right, lighter) */}
      <path d="M36 16 L46 40 L36 40 Z" fill="#F97316" opacity="0.55" />
      {/* Hull: clean, slightly curved trapezoid */}
      <path d="M12 44 L52 44 L46 54 L18 54 Z" fill="#F97316" />
      {/* Waterline accent */}
      <path
        d="M14 48 L50 48"
        stroke="#EA580C"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({
  size = 'md',
  variant = 'full',
  theme = 'dark',
  className,
}: LogoProps) {
  const iconSize = sizeConfig[size].icon;
  const fullWidth = sizeConfig[size].full;

  if (variant === 'icon') {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center' }} role="img" aria-label="PreShip">
        <ShipMark size={iconSize} />
      </span>
    );
  }

  // Full variant: ship mark + "PreShip" text
  const textColor = theme === 'dark' ? '#FFFFFF' : '#171717';
  // Scale font size relative to the full width
  const fontSize = fullWidth * 0.2;
  // Icon takes up proportional space in the full layout
  const markSize = iconSize;
  const totalHeight = markSize;
  const textY = totalHeight * 0.62;

  return (
    <svg
      width={fullWidth}
      height={totalHeight}
      viewBox={`0 0 ${fullWidth} ${totalHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="PreShip"
    >
      {/* Ship mark scaled into the left portion */}
      <g transform={`scale(${markSize / 64})`}>
        <path d="M18 36 L28 28 L36 8 L36 40 Z" fill="#F97316" />
        <path d="M36 16 L46 40 L36 40 Z" fill="#F97316" opacity="0.55" />
        <path d="M12 44 L52 44 L46 54 L18 54 Z" fill="#F97316" />
        <path
          d="M14 48 L50 48"
          stroke="#EA580C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      {/* "Pre" in text color, "Ship" in orange */}
      <text
        x={markSize + 6}
        y={textY}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        fill={textColor}
      >
        Pre
      </text>
      <text
        x={markSize + 6 + fontSize * 1.7}
        y={textY}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        fill="#F97316"
      >
        Ship
      </text>
    </svg>
  );
}
