import Image from 'next/image';
import Link from 'next/link';

const logos = {
  express: {
    src: '/brand/lavland-logo.png',
    width: 600,
    height: 200,
    alt: 'Lavland Lavanderia Express',
  },
  mark: {
    src: '/brand/lavland-logo-transparent.png',
    width: 258,
    height: 146,
    alt: 'Lavland',
  },
} as const;

type LogoVariant = keyof typeof logos;
type LogoSize = 'sm' | 'md' | 'lg';

const heightBySize: Record<LogoSize, number> = {
  sm: 32,
  md: 44,
  lg: 56,
};

interface LavlandLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  href?: string;
  priority?: boolean;
}

export function LavlandLogo({
  variant = 'express',
  size = 'md',
  className = '',
  href,
  priority = false,
}: LavlandLogoProps) {
  const logo = logos[variant];
  const height = heightBySize[size];

  const image = (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      priority={priority}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ height, maxWidth: '100%' }}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {image}
      </Link>
    );
  }

  return image;
}
