'use client';
import { AccurateMasterPicker } from '@/features/invoices/components/accurate-master-picker';
import { saveAccurateMapping } from '@/features/invoices/services/accurate.service';
import type { Batch, Row } from '../types';
import { getBatch } from '../services/imports.service';
import { money, unitMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { chargeableItems } from '../utils/redemption';
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
  const selection = row.candidate.accurateSelection;
  const valid =
    destination &&
    selection?.databaseId === destination.databaseId &&
    selection.targetBranchId === destination.targetBranchId;
  const items = chargeableItems(row.candidate.items);
  const mappingComplete =
    !!valid &&
    !!selection?.customer?.code &&
    items.every((item) => !!selection.items[item.id]?.code && !!selection.items[item.id]?.unitName);
  const save = async (kind: 'customer' | 'item', masterId: string, itemId?: string) => {
    onBusyChange(true);
    try {
      await saveAccurateMapping(batch.id, row.id, {
        version: batch.version,
        kind,
        masterId,
        itemId,
      });
      onSaved(await getBatch(batch.id));
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
            <span>Customer dan kode item Accurate</span>
            {mappingComplete && (
              <Badge variant="success" className="ml-2">
                Mapping tersimpan
              </Badge>
            )}
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <AccurateMasterPicker
              kind="customer"
              label="Customer Accurate"
              initialSearch={row.candidate.customerId}
              selected={valid ? selection?.customer : undefined}
              disabled={busy}
              onSelect={(id) => save('customer', id)}
            />
            {chargeableItems(row.candidate.items).map((item) => (
              <AccurateMasterPicker
                key={item.id}
                kind="item"
                label={item.name}
                initialSearch={item.name.slice(0, 100)}
                selected={valid ? selection?.items[item.id] : undefined}
                disabled={busy}
                onSelect={(id) => save('item', id, item.id)}
              />
            ))}
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
            {chargeableItems(row.candidate.items).map((item) => (
              <p key={item.id} className="break-words">
                {selection.items[item.id]?.code || 'Belum dipetakan'} · {item.quantity} ×{' '}
                {unitMoney(
                  Number(
                    (
                      (item.quantity * item.unitPrice - item.discount + item.tax) /
                      item.quantity
                    ).toFixed(6),
                  ),
                )}{' '}
                (harga akhir/unit)
              </p>
            ))}
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
