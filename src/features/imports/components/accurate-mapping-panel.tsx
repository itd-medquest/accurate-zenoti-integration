'use client';
import { AccurateMasterPicker } from '@/features/invoices/components/accurate-master-picker';
import type { Batch, Row } from '../types';
import { money } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateAccurateCustomer } from '@/features/invoices/components/create-accurate-customer';
import { importAccurateSelection, saveImportMapping } from '../services/accurate-mapping.service';
export function AccurateMappingPanel({
  batch,
  row,
  busy,
  onSaved,
  onBusyChange,
  onConfigure,
}: {
  batch: Batch;
  row: Row;
  busy: boolean;
  onSaved: (batch: Batch) => void;
  onBusyChange: (busy: boolean) => void;
  onConfigure?: () => void;
}) {
  const destination = batch.accurateDestination;
  const selection = importAccurateSelection(batch, row);
  const valid =
    destination &&
    selection?.databaseId === destination.databaseId &&
    selection.targetBranchId === destination.targetBranchId;
  const mappingComplete = !!valid && !!selection?.customer?.code;
  const save = async (kind: 'customer' | 'item', masterId: string, itemId?: string) => {
    onBusyChange(true);
    try {
      onSaved(await saveImportMapping(batch, row, kind, masterId, itemId));
    } finally {
      onBusyChange(false);
    }
  };
  return (
    <section
      className="mb-5 flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4"
      aria-label="Pemetaan faktur Accurate"
    >
      <div>
        <h3 className="font-semibold">Faktur Penjualan Accurate</h3>
        <p className="text-sm text-muted-foreground">
          {destination
            ? `${destination.databaseName} · ${destination.targetBranchName}`
            : 'Admin perlu mengatur tujuan perusahaan di Settings.'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Harga dikirim setelah diskon dan termasuk pajak. Non-pajak di Accurate; pembayaran tidak
          dikirim pada tahap ini.
        </p>
      </div>
      {batch.status === 'PREVIEW' && !destination && onConfigure && (
        <Button variant="outline" size="sm" disabled={busy} onClick={onConfigure}>
          Atur tujuan perusahaan
        </Button>
      )}
      {batch.status === 'PREVIEW' && destination && (
        <details className="group" open={!mappingComplete}>
          <summary className="cursor-pointer text-sm font-medium text-primary">
            <span>Customer Accurate</span>
            {mappingComplete && (
              <Badge variant="success" className="ml-2">
                Mapping tersimpan
              </Badge>
            )}
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <AccurateMasterPicker
              branchId={batch.branchId}
              kind="customer"
              label="Customer Accurate"
              initialSearch={row.candidate.customerId}
              selected={valid ? selection?.customer : undefined}
              disabled={busy}
              onSelect={(id) => save('customer', id)}
              emptyAction={(finish) => (
                <CreateAccurateCustomer
                  batchId={batch.id}
                  rowId={row.id}
                  version={batch.version}
                  initialName={row.candidate.customer}
                  disabled={busy}
                  onSelect={async (id) => {
                    await save('customer', id);
                    finish();
                  }}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Petakan kode item Accurate langsung pada masing-masing baris layanan/item di bawah.
            </p>
          </div>
        </details>
      )}
      {valid && selection?.customer && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Ringkasan nilai yang dikirim
          </summary>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <p>
              Customer: {selection.customer.code} · Nomor faktur:{' '}
              {row.candidate.sourceInvoiceNumber || row.candidate.number}
            </p>
            <p>Kode item dan satuan dapat diperiksa pada rincian layanan/item.</p>
            <p className="font-semibold">Total faktur: {money(row.candidate.total)} · Non-pajak</p>
          </div>
        </details>
      )}
      {row.delivery?.targetNumber && (
        <p className="text-sm font-semibold">
          Accurate: {row.delivery.targetNumber} · ID {row.delivery.targetId}
        </p>
      )}
      {row.syncError && (
        <p className="text-sm text-destructive" role="alert">
          {row.syncError}
        </p>
      )}
    </section>
  );
}
