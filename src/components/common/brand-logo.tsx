import { cn } from '@/lib/cn';

/** Display the original PNG artwork within its visible bounds, without changing the asset. */
export function BrandLogo({
  tone = 'auto',
  variant = 'wordmark',
  decorative = false,
  className,
}: {
  tone?: 'light' | 'dark' | 'auto';
  variant?: 'wordmark' | 'logogram';
  decorative?: boolean;
  className?: string;
}) {
  const logogram = variant === 'logogram';
  return (
    <svg
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'intgrte'}
      aria-hidden={decorative || undefined}
      data-slot={logogram ? 'brand-logogram' : 'brand-logo'}
      viewBox={logogram ? '0 0 512 512' : '437 750 1138 466'}
      width={logogram ? 512 : 1138}
      height={logogram ? 512 : 466}
      className={cn('block h-auto shrink-0', logogram ? 'w-8' : 'w-40', className)}
    >
      <image
        className={tone === 'auto' && !logogram ? 'dark:hidden' : undefined}
        href={
          logogram
            ? '/branding/intgrte-logogram.png'
            : tone === 'light'
              ? '/branding/intgrte-white.png'
              : '/branding/intgrte-black.png'
        }
        width={logogram ? 512 : 2000}
        height={logogram ? 512 : 2000}
      />
      {tone === 'auto' && !logogram && (
        <image
          href="/branding/intgrte-white.png"
          width={2000}
          height={2000}
          className="hidden dark:block"
        />
      )}
    </svg>
  );
}
