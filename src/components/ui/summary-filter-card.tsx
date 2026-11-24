'use client';

import { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

export function SummaryFilterCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  active,
  loading,
  disabled,
  controls,
  onSelect,
  className,
}: {
  label: string;
  value?: number;
  hint: string;
  icon: LucideIcon;
  tone?: 'default' | 'brand' | 'highlight';
  active: boolean;
  loading: boolean;
  disabled?: boolean;
  controls: string;
  onSelect: () => void;
  className?: string;
}) {
  const hintId = useId();
  return (
    <Card
      size="sm"
      tone={tone}
      className={cn('relative', active && 'outline-2 outline-offset-2 outline-primary', className)}
    >
      <CardHeader className="min-h-16 items-start gap-2 pb-3">
        <CardTitle>{label}</CardTitle>
        <Icon aria-hidden="true" className="size-4 shrink-0" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-4">
        {loading ? (
          <Skeleton className="h-9 w-14" />
        ) : (
          <strong className="font-display text-3xl font-medium tabular-nums">
            {value?.toLocaleString('id-ID') ?? '—'}
          </strong>
        )}
        <CardDescription id={hintId}>{hint}</CardDescription>
      </CardContent>
      <Button
        type="button"
        variant="link"
        className="absolute inset-0 h-full w-full rounded-[inherit] border-0 p-0 hover:bg-primary/5 focus-visible:ring-inset active:translate-y-0"
        aria-label={`Filter ${label}`}
        aria-describedby={hintId}
        aria-pressed={active}
        aria-controls={controls}
        disabled={disabled}
        onClick={onSelect}
      />
    </Card>
  );
}
