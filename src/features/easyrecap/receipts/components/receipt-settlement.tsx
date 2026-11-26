'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { money, dateOnly } from '@/lib/format';
import { sourceMethodLabels, statusLabels, type ReceiptDetail } from '../types';

export function ReceiptPaymentSelect({
  data,
  disabled,
  onPayment,
}: {
  data: ReceiptDetail;
  disabled: boolean;
  onPayment: (key: string) => void;
}) {
  const settlement = data.settlement;
  if (!settlement || settlement.payments.length < 2) return null;
  const selectedIndex = settlement.payments.findIndex((payment) => payment.key === data.source.key);
  const selected = settlement.payments[selectedIndex];
  return (
    <Select value={data.source.key ?? ''} disabled={disabled} onValueChange={onPayment}>
      <SelectTrigger
        id="receipt-payment-choice"
        aria-label="Pilih pembayaran"
        size="sm"
        className="w-full sm:w-80"
      >
        <SelectValue placeholder="Pilih pembayaran">
          {selected &&
            `${selectedIndex + 1}. ${selected.method === 'card' ? 'Kartu' : (sourceMethodLabels[selected.method] ?? selected.method)} · ${money(selected.gross)}`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end" sideOffset={6} collisionPadding={12}>
        <SelectGroup>
          {settlement.payments.map((payment, index) => (
            <SelectItem
              key={payment.key}
              value={payment.key}
              data-value={payment.key}
              textValue={`Pembayaran ${index + 1} ${sourceMethodLabels[payment.method] ?? payment.method}`}
            >
              <span className="flex min-w-0 flex-col items-start gap-1 whitespace-normal">
                <span className="font-medium">
                  Pembayaran {index + 1} ·{' '}
                  {payment.method === 'card'
                    ? 'Kartu'
                    : (sourceMethodLabels[payment.method] ?? payment.method)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {money(payment.gross)} · {dateOnly(payment.paidAt)}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant={
                      payment.remaining === 0
                        ? 'success'
                        : payment.settled > 0
                          ? 'warning'
                          : 'secondary'
                    }
                  >
                    {payment.remaining === 0
                      ? 'Selesai'
                      : payment.settled > 0
                        ? 'Diterima sebagian'
                        : 'Belum diterima'}
                  </Badge>
                  Sisa {money(payment.remaining)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function ReceiptSettlementHistory({
  data,
  disabled,
  onReceipt,
}: {
  data: ReceiptDetail;
  disabled: boolean;
  onReceipt: (id: string) => void;
}) {
  const settlement = data.settlement;
  if (
    !settlement ||
    !settlement.history.some((row) => row.status === 'SUCCEEDED') ||
    (settlement.history.length === 1 &&
      settlement.remaining === 0 &&
      settlement.payments.length === 1)
  )
    return null;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Riwayat penerimaan pembayaran ini</CardTitle>
          <CardDescription>
            Penerimaan terverifikasi tetap tersimpan. Dana berikutnya dicatat sebagai penerimaan
            baru.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-5">
        {settlement.history.map((row) => (
          <div key={row.id} className="space-y-2 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 break-all font-medium">{row.number || 'Nomor belum diisi'}</p>
              <Badge
                variant={
                  row.status === 'SUCCEEDED'
                    ? 'success'
                    : row.status === 'NEEDS_REVIEW'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {statusLabels[row.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {dateOnly(row.paymentDate)} · Pelunasan {money(row.gross)} · Fee {money(row.fee)} ·
              Bersih {money(row.net)}
            </p>
            {row.id !== data.draft.id && (
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => onReceipt(row.id)}
              >
                Buka {row.number || 'penerimaan'}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
