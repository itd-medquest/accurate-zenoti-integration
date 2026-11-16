'use client';
import { EmptyState, Loading } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listAudit } from '@/features/audit/services/audit.service';
import type { AuditLog } from '@/features/audit/types';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
export function AuditView() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    listAudit()
      .then(setLogs)
      .catch((e) => setError(e.message));
  }, []);
  if (error)
    return (
      <Alert
        className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 warning"
        variant="destructive"
      >
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  return (
    <Card className="panel overflow-hidden">
      <CardHeader className="panel-head flex items-center justify-between py-5 px-5.25 gap-3.75 wide:p-5.75 compact:py-4.5 compact:px-4.25">
        <div>
          <CardTitle>Audit aktivitas</CardTitle>
          <CardDescription>
            100 tindakan operasional terbaru. Riwayat sinkronisasi tersedia pada detail invoice.
          </CardDescription>
        </div>
        <ShieldCheck size={21} />
      </CardHeader>
      <CardContent className="p-0">
        {!logs ? (
          <Loading />
        ) : !logs.length ? (
          <EmptyState text="Belum ada aktivitas operasional." />
        ) : (
          <div className="table-scroll overflow-auto">
            <Table>
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
                {logs.map((l) => (
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
        )}
      </CardContent>
    </Card>
  );
}
