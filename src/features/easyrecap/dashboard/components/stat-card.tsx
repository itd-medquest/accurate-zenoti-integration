'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { ArrowUpRight, Check, CircleAlert, Clock3, FileCheck2 } from 'lucide-react';
export function StatCard({
  label,
  value,
  hint,
  kind,
}: {
  label: string;
  value: number;
  hint: string;
  kind: 'total' | 'synced' | 'processing' | 'failed';
}) {
  const Icon = { total: FileCheck2, synced: Check, processing: Clock3, failed: CircleAlert }[kind];
  return (
    <Card
      tone={kind === 'total' ? 'brand' : kind === 'failed' ? 'highlight' : 'default'}
      className={cn('stat-card min-w-0', kind)}
    >
      <CardHeader className="stat-top items-start gap-2 pb-0 mobile:px-4 mobile:pt-4">
        <CardTitle className="min-w-0">{label}</CardTitle>
        <span className="stat-icon flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground group-data-[tone=brand]/card:bg-highlight group-data-[tone=brand]/card:text-highlight-foreground mobile:size-7 max-[360px]:hidden">
          <Icon size={16} aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-end gap-4 pt-6 pb-5 mobile:gap-3 mobile:px-4 mobile:pt-4 mobile:pb-4">
        <strong className="font-display text-[48px] leading-none font-medium tracking-[-2px] tabular-nums mobile:text-[38px]">
          {value.toLocaleString('id-ID')}
        </strong>
        <div className="flex w-full items-end justify-between gap-2">
          <CardDescription className="text-pretty">{hint}</CardDescription>
          <ArrowUpRight
            className="text-muted-foreground group-data-[tone=brand]/card:text-primary-foreground/85 group-data-[tone=highlight]/card:text-highlight-foreground/80"
            size={16}
            aria-hidden="true"
          />
        </div>
      </CardContent>
    </Card>
  );
}
