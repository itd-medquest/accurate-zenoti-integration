import { cn } from '@/lib/cn';
import * as React from 'react';

function Input({
  className,
  type,
  variant = 'default',
  ...props
}: React.ComponentProps<'input'> & { variant?: 'default' | 'underline' }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10.5 w-full min-w-0 rounded-full border border-control-border bg-control shadow-xs px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        variant === 'underline' &&
          'h-12 rounded-none border-x-0 border-t-0 px-2 shadow-none focus-visible:ring-0 focus-visible:border-primary',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
