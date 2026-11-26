'use client';

import { useState } from 'react';
import { ArrowUpRight, Bell, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ImportPagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import type { Invoice } from '@/features/easyrecap/invoices/types';
import { dateTime } from '@/lib/format';
import { useNotifications } from '../hooks/use-notifications';
import { notificationStatus } from '../utils/notification-status';

export function NotificationsView({
  actorId,
  onInvoice,
}: {
  actorId: string;
  onInvoice: (invoice: Invoice) => void;
}) {
  const [page, setPage] = useState(1);
  const { data, error, busy, refresh } = useNotifications(actorId, page, 10);
  return (
    <Card>
      <CardHeader className="flex-wrap items-start">
        <div>
          <CardTitle>Notifikasi invoice</CardTitle>
          <CardDescription>
            Status invoice dalam 1 tahun terakhir, diurutkan berdasarkan tanggal invoice.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}>
          <RefreshCw data-icon="inline-start" />
          Muat ulang
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pb-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!data && !error ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Memuat notifikasi">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : data?.rows.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {data.rows.map((invoice) => {
              const status = notificationStatus(invoice.syncStatus);
              return (
                <li
                  key={invoice.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border p-4 sm:p-5"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-medium">{invoice.number}</strong>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="m-0 text-sm text-muted-foreground">{invoice.customer}</p>
                    <p className="m-0 break-words text-sm">
                      {invoice.error || invoice.exception || status.description}
                    </p>
                    <time
                      dateTime={invoice.updatedAt}
                      className="text-xs tabular-nums text-muted-foreground"
                    >
                      Diperbarui {dateTime(invoice.updatedAt)} WIB
                    </time>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onInvoice(invoice)}
                    aria-label={`Lihat detail invoice ${invoice.number}`}
                  >
                    Lihat invoice
                    <ArrowUpRight data-icon="inline-end" />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          !error && (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Bell />
                </EmptyMedia>
                <EmptyTitle>Belum ada notifikasi</EmptyTitle>
                <EmptyDescription>
                  Aktivitas akan ditampilkan setelah ada invoice yang tersimpan di intgrte.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        )}
      </CardContent>
      {data && data.total > 10 && (
        <ImportPagination
          page={page}
          pageSize={10}
          total={data.total}
          onPage={setPage}
          label="Halaman notifikasi"
          disabled={busy}
        />
      )}
    </Card>
  );
}
