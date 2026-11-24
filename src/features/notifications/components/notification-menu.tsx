'use client';

import { ArrowRight, Bell, CircleAlert, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { Invoice } from '@/features/easyrecap/invoices/types';
import { useNotifications } from '../hooks/use-notifications';
import { notificationStatus } from '../utils/notification-status';

export function NotificationMenu({
  actorId,
  onAll,
  onInvoice,
}: {
  actorId: string;
  onAll: () => void;
  onInvoice: (invoice: Invoice) => void;
}) {
  const { data, error, busy, refresh } = useNotifications(actorId);
  const attention = data?.rows.some((invoice) => notificationStatus(invoice.syncStatus).attention);
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void refresh();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={attention ? 'Notifikasi, ada invoice perlu perhatian' : 'Notifikasi'}
        >
          <Bell data-icon="inline-start" />
          {attention && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 size-1.5 rounded-full bg-primary ring-2 ring-background"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-96 max-w-[calc(100vw-2rem)] [--hover-inset:--spacing(2)] motion-reduce:animate-none"
        aria-label="Notifikasi invoice"
        aria-labelledby={undefined}
      >
        <DropdownMenuLabel className="flex flex-col gap-1 px-3 py-3">
          <span className="text-sm font-medium text-foreground">Notifikasi</span>
          <span className="text-xs font-normal">Aktivitas dan status invoice tersimpan.</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {error ? (
          <div className="flex flex-col gap-3 px-3 py-4">
            <p role="alert" className="m-0 text-xs text-destructive">
              {error}
            </p>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}>
              Coba lagi
            </Button>
          </div>
        ) : !data ? (
          <div className="flex flex-col gap-3 p-3" role="status" aria-label="Memuat notifikasi">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : data.rows.length ? (
          <DropdownMenuGroup className="max-h-80 overflow-y-auto">
            {data.rows.map((invoice) => {
              const status = notificationStatus(invoice.syncStatus);
              const Icon = status.attention ? CircleAlert : FileText;
              return (
                <DropdownMenuItem
                  key={invoice.id}
                  className="items-start gap-3 px-3 py-3"
                  onSelect={() => onInvoice(invoice)}
                >
                  <Icon className="mt-1" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-xs font-medium">{invoice.number}</strong>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {invoice.customer}
                    </span>
                    <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {invoice.error || invoice.exception || status.description}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        ) : (
          <Empty className="px-4 py-7">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>Belum ada notifikasi</EmptyTitle>
              <EmptyDescription>
                Status invoice akan muncul setelah ada invoice tersimpan.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="justify-between px-3 py-3" onSelect={onAll}>
            Lihat detail notifikasi <ArrowRight aria-hidden="true" />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
