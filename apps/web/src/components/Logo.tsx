/* eslint-disable @next/next/no-img-element */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  theme?: 'dark' | 'light';
  className?: string;
}

const sizeConfig = {
  sm: { img: 28, fontSize: 16 },
  md: { img: 36, fontSize: 20 },
  lg: { img: 48, fontSize: 28 },
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
