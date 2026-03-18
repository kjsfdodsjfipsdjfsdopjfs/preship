/* eslint-disable @next/next/no-img-element */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  className?: string;
}

const sizeConfig = {
  sm: { img: 40, fontSize: 20 },
  md: { img: 52, fontSize: 24 },
  lg: { img: 72, fontSize: 36 },
} as const;

export default function Logo({
  size = 'md',
  variant = 'full',
  className,
}: LogoProps) {
  const config = sizeConfig[size];

  if (variant === 'icon') {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center' }} role="img" aria-label="PreShip">
        <img src="/logo.png" alt="" width={config.img} height={config.img} style={{ borderRadius: 6 }} />
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      role="img"
      aria-label="PreShip"
    >
      <img src="/logo.png" alt="" width={config.img} height={config.img} style={{ borderRadius: 6 }} />
      <span style={{ fontWeight: 700, fontSize: config.fontSize, lineHeight: 1, letterSpacing: '-0.02em' }}>
        <span style={{ color: '#FFFFFF' }}>Pre</span>
        <span style={{ color: '#F97316' }}>Ship</span>
      </span>
    </span>
  );
}
