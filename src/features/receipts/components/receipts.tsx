'use client';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { getDeliveredInvoices } from '@/features/invoices/services/accurate.service';
import type { DeliveredInvoice } from '@/features/invoices/types/accurate';
import { dateOnly, money } from '@/lib/format';
export function ReceiptsView() {
  const [rows, setRows] = useState<DeliveredInvoice[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    setBusy(true);
    setError('');
    try {
      setRows(await getDeliveredInvoices());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Gagal memuat faktur.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Penerimaan Penjualan (Receipt)</CardTitle>
          <CardDescription>
            Faktur aktual yang telah tersimpan dan diverifikasi di Accurate.
          </CardDescription>
        </div>
        <Button variant="outline" disabled={busy} onClick={load}>
          {busy ? 'Memuat…' : 'Muat ulang'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Pengiriman Penerimaan Penjualan dan pengaturan biaya admin akan tersedia pada tahap
          berikutnya. Belum ada pembayaran yang dikirim dari halaman ini.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>FAKTUR ACCURATE</TableHead>
              <TableHead>CUSTOMER</TableHead>
              <TableHead>TANGGAL</TableHead>
              <TableHead className="text-right">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.invoiceId}>
                <TableCell>
                  {row.targetNumber}
                  <span className="block text-xs text-muted-foreground">ID {row.targetId}</span>
                </TableCell>
                <TableCell>{row.customer}</TableCell>
                <TableCell>{dateOnly(row.date)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(row.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!busy && !rows.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Belum ada faktur aktual yang berhasil diverifikasi.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
