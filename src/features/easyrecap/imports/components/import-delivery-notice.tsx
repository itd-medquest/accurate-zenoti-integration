'use client';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { getAccurateStatus } from '@/features/easyrecap/invoices/services/accurate.service';
import type { AccurateStatus } from '@/features/easyrecap/invoices/types/accurate';
import type { Batch } from '../types';
import { isLocalOnlyInvoice } from '../utils/redemption';

export function ImportDeliveryNotice({
  batch,
  onConfigure,
  branchId,
}: {
  batch: Batch | null;
  branchId?: string;
  onConfigure?: () => void;
}) {
  const [status, setStatus] = useState<AccurateStatus | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setStatus(null);
    setError('');
    let active = true;
    getAccurateStatus(batch?.branchId ?? branchId, controller.signal)
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch((error) => {
        if (active) setError(error instanceof Error ? error.message : 'Konfigurasi gagal dimuat.');
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [batch?.branchId, branchId]);
  const submittedSimulation = batch?.status === 'SUBMITTED' && batch.mode === 'simulation';
  const live = (batch?.status === 'SUBMITTED' ? batch.mode : status?.mode) === 'live';
  if (
    batch?.mode === 'local' ||
    (batch?.rows.length && batch.rows.every((row) => isLocalOnlyInvoice(row.candidate)))
  )
    return (
      <Alert variant="info" className="mb-5" aria-label="Mode pengiriman Accurate">
        <ShieldCheck />
        <AlertTitle>Simpan lokal — tanpa pengiriman ke Accurate</AlertTitle>
        <AlertDescription>
          Periksa dokumen dan simpan invoice di intgrte. Tidak memerlukan koneksi atau mapping
          Accurate.
        </AlertDescription>
      </Alert>
    );
  // A healthy live connection does not need a persistent instructional banner.
  // Keep simulation, disabled-connection, and loading/error feedback visible.
  if (status && live && status.enabled && status.configured && !error && !submittedSimulation)
    return null;
  return (
    <Alert variant="info" className="mb-5" aria-label="Mode pengiriman Accurate">
      <ShieldCheck />
      <AlertTitle>
        {submittedSimulation
          ? 'Batch ini diproses sebagai simulasi lokal'
          : status
            ? live
              ? 'Konfigurasi Accurate perlu diperiksa'
              : 'Mode Simulasi — belum mengirim ke Accurate'
            : 'Konfigurasi pengiriman Accurate'}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          {error ||
            (!status
              ? 'Memuat konfigurasi…'
              : submittedSimulation
                ? 'Batch ini tidak mengirim transaksi ke Accurate. Untuk mengirim aktual, atur koneksi lalu upload ulang, periksa mapping, dan Submit kembali.'
                : !status.enabled
                  ? 'Koneksi Accurate dinonaktifkan. Aktifkan melalui Settings sebelum Submit.'
                  : status.configured
                    ? 'Kredensial sudah tersimpan. Pilih mode Aktual di Settings untuk mengirim faktur asli; Submit dalam mode ini tetap simulasi lokal.'
                    : 'API Token dan Signature Secret belum lengkap. Isi melalui Settings, uji koneksi, pilih tujuan PT, lalu aktifkan mode Aktual. Tidak perlu mengisi kredensial Accurate di .env.')}
        </p>
        {onConfigure && (!live || !status?.enabled || !status?.configured) && (
          <div>
            <Button type="button" variant="outline" size="sm" onClick={onConfigure}>
              Atur koneksi Accurate
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
