import { cn } from '@/lib/cn';
import * as React from 'react';

function Card({
  className,
  size = 'default',
  tone = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  size?: 'default' | 'sm';
  tone?: 'default' | 'brand' | 'highlight';
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-tone={tone}
      className={cn(
        'group/card flex flex-col overflow-hidden rounded-xl border border-surface-border text-sm text-card-foreground shadow-panel [--card-spacing:--spacing(5)] data-[size=sm]:[--card-spacing:--spacing(4)]',
        tone === 'default' && 'bg-card',
        tone === 'brand' && 'bg-primary text-primary-foreground',
        tone === 'highlight' && 'bg-highlight text-highlight-foreground',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header flex items-center justify-between gap-4 px-(--card-spacing) py-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="card-title"
      className={cn(
        'text-[15px] leading-snug font-medium text-balance group-data-[size=sm]/card:text-sm',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        'mt-1 text-xs leading-relaxed text-muted-foreground group-data-[tone=brand]/card:text-primary-foreground/85 group-data-[tone=highlight]/card:text-highlight-foreground/80',
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)',
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
