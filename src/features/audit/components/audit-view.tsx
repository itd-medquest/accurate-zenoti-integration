'use client';
import { EmptyState, Loading } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImportPagination } from '@/components/ui/pagination';
import { usePolledResource } from '@/hooks/use-polled-resource';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listAudit } from '@/features/audit/services/audit.service';
import { ShieldCheck } from 'lucide-react';
import { useCallback, useState } from 'react';
const noPolling = () => false;

export function AuditView() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const fetcher = useCallback(
    (signal: AbortSignal) => listAudit(page, pageSize, signal),
    [page, pageSize],
  );
  const { data, error, busy, load } = usePolledResource({
    fetcher,
    shouldPoll: noPolling,
    fallback: 'Audit aktivitas gagal dimuat.',
  });
  return (
    <Card className="panel overflow-hidden">
      <CardHeader className="panel-head flex items-center justify-between py-5 px-5.25 gap-3.75 wide:p-5.75 compact:py-4.5 compact:px-4.25">
        <div>
          <CardTitle>Audit aktivitas</CardTitle>
          <CardDescription>
            Riwayat tindakan operasional, diurutkan dari aktivitas terbaru.
          </CardDescription>
        </div>
        <ShieldCheck size={21} />
      </CardHeader>
      <CardContent className="p-0" aria-busy={busy}>
        {error && (
          <Alert className="m-5 w-auto" variant="destructive" role="alert">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}>
                Coba lagi
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {!data && !error ? (
          <Loading />
        ) : data && !data.items.length ? (
          <EmptyState text="Belum ada aktivitas operasional." />
        ) : data ? (
          <div className="table-scroll overflow-auto">
            <Table aria-label="Audit aktivitas">
              <TableHeader>
                <TableRow>
                  <TableHead>WAKTU (WIB)</TableHead>
                  <TableHead>AKTIVITAS</TableHead>
                  <TableHead>ENTITAS</TableHead>
                  <TableHead>ACTOR ID</TableHead>
                  <TableHead>DETAIL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      {new Intl.DateTimeFormat('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Asia/Jakarta',
                      }).format(new Date(l.createdAt))}
                    </TableCell>
                    <TableCell>
                      <code>{l.action}</code>
                    </TableCell>
                    <TableCell className="small text-[11px]">{l.entityId ?? '—'}</TableCell>
                    <TableCell className="small text-[11px] muted text-muted-foreground">
                      {l.actorId?.slice(0, 8) ?? 'System'}
                    </TableCell>
                    <TableCell>
                      {l.details != null ? (
                        <details>
                          <summary>Lihat</summary>
                          <pre>{JSON.stringify(l.details, null, 2)}</pre>
                        </details>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
        {data && (
          <ImportPagination
            label="Halaman audit aktivitas"
            page={data.page}
            total={data.total}
            pageSize={data.pageSize}
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            disabled={busy || !!error}
          />
        )}
      </CardContent>
    </Card>
  );
}
