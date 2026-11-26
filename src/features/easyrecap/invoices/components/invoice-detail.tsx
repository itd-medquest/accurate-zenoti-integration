'use client';
import { EmptyState, Modal, StatusBadge } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isFreeConsultation } from '@/features/easyrecap/imports/utils/redemption';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Detail } from '@/features/easyrecap/invoices/types';
import { formatDiscountPercent } from '@/features/easyrecap/invoices/utils/discount';
import { cn } from '@/lib/cn';
import { dateOnly, dateTime, money, unitMoney } from '@/lib/format';
import { CheckCircle2, CircleAlert, RotateCw, ShieldCheck, Wrench } from 'lucide-react';
import { useState } from 'react';
export function InvoiceDetail({
  invoice: i,
  close,
  operate,
  admin,
  busy,
  sync,
  fix,
}: {
  invoice: Detail;
  close: () => void;
  operate: boolean;
  admin: boolean;
  busy: boolean;
  sync: (id: string) => void;
  fix: (id: string) => void;
}) {
  const [tab, setTab] = useState('detail');
  return (
    <Modal title="Detail invoice" onClose={close} wide>
      <div className="detail-header pt-6.25 pr-6.5 pb-5 pl-6.5 flex items-center justify-between gap-3.75 mobile:py-5 mobile:px-4.5">
        <div>
          <span className="eyebrow font-bold tracking-[1.7px] text-brand flex items-center gap-2.25 text-[10px]">
            ZENOTI INVOICE
          </span>
          <h2>{i.number}</h2>
          <p>
            {i.customer} <span>·</span> {dateOnly(i.date)}
          </p>
        </div>
        <StatusBadge status={i.syncStatus} />
      </div>
      <div className="detail-status-grid grid grid-cols-[repeat(3,_1fr)] gap-3.75 mt-0 mr-6.5 mb-5.25 ml-6.5 p-4 border border-solid border-line rounded-[10px] bg-muted/50 mobile:mt-0 mobile:mr-4.5 mobile:mb-4.5 mobile:ml-4.5 mobile:gap-2 mobile:p-3">
        <div>
          <span>Status bisnis</span>
          <StatusBadge status={i.businessStatus} />
        </div>
        <div>
          <span>Status pembayaran</span>
          <StatusBadge status={i.paymentStatus} />
        </div>
        <div>
          <span>Tujuan Accurate</span>
          <span className="text-sm font-semibold">
            {i.syncStatus === 'LOCAL_ONLY'
              ? 'Tidak dikirim — Full redeem'
              : i.syncStatus === 'LOCAL_ONLY_CONSULTATION'
                ? 'Tidak dikirim — Consultation gratis'
                : i.delivery
                  ? 'Faktur Penjualan aktual'
                  : 'Simulasi lokal'}
          </span>
        </div>
      </div>
      {i.error && (
        <Alert
          className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 warning"
          variant="destructive"
        >
          <AlertDescription>
            <CircleAlert size={19} />
            <div>
              <strong>Invoice membutuhkan perhatian</strong>
              <p>{i.error}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          {[
            ['detail', 'Detail transaksi'],
            ['payment', 'Pembayaran'],
            ['history', 'Riwayat sinkronisasi'],
          ].map(([id, label]) => (
            <TabsTrigger key={id} value={id}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent className="detail-content min-h-57.5 py-5.25 px-6.5 mobile:p-4.5" value={tab}>
          {tab === 'detail' && (
            <>
              <div className="table-scroll overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ITEM / JENIS</TableHead>
                      <TableHead>QTY</TableHead>
                      <TableHead>HARGA</TableHead>
                      <TableHead>DISKON (%)</TableHead>
                      <TableHead>SETELAH DISKON</TableHead>
                      <TableHead>PAJAK</TableHead>
                      <TableHead>MAPPING</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {i.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <strong>{item.name}</strong>
                          {!item.redeemed && isFreeConsultation(item) && (
                            <Badge variant="secondary">
                              Consultation gratis · Tidak dikirim ke Accurate
                            </Badge>
                          )}
                          {item.redeemed && (
                            <Badge variant="secondary">Redeemed · Tidak dikirim ke Accurate</Badge>
                          )}
                          {item.redemptionNote && (
                            <p className="text-xs text-muted-foreground">{item.redemptionNote}</p>
                          )}
                          <span className="cell-sub block mt-1.25 text-[10px] text-muted-foreground">
                            {item.kind.replaceAll('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{unitMoney(item.unitPrice)}</TableCell>
                        <TableCell>{formatDiscountPercent(item)}</TableCell>
                        <TableCell>
                          {money(item.unitPrice * item.quantity - item.discount)}
                        </TableCell>
                        <TableCell>{money(item.tax)}</TableCell>
                        <TableCell>
                          {item.redeemed || isFreeConsultation(item) ? (
                            <span className="text-xs text-muted-foreground">Tidak diperlukan</span>
                          ) : item.mapped ? (
                            <span className="success-text text-muted-foreground flex items-center gap-1.25 text-[10px]">
                              <CheckCircle2 size={15} /> Siap
                            </span>
                          ) : (
                            <span className="error-text text-warning-foreground text-[10px]">
                              Belum dipetakan
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="detail-totals mt-5 mr-0 mb-6 ml-auto w-70 flex flex-col gap-3 mobile:w-full mobile:max-w-70">
                <div>
                  <span>Diskon efektif</span>
                  <strong>
                    {formatDiscountPercent({
                      quantity: 1,
                      unitPrice: i.items.reduce((n, item) => n + item.unitPrice * item.quantity, 0),
                      discount: i.discount,
                    })}
                  </strong>
                </div>
                <div>
                  <span>Pajak</span>
                  <strong>{money(i.tax)}</strong>
                </div>
                <div className="grand-total">
                  <span>Total invoice</span>
                  <strong>{money(i.total)}</strong>
                </div>
                <div>
                  <span>Outstanding</span>
                  <strong>{money(i.outstanding)}</strong>
                </div>
              </div>
              <div className="detail-reference flex gap-2.25 rounded-[9px] p-3.5 bg-muted/50 text-muted-foreground">
                <ShieldCheck size={18} />
                <div>
                  <strong>Identitas transaksi tetap sama</strong>
                  <p>
                    Referensi sumber: {i.sourceId}. Retry mencari nomor faktur yang sudah ada
                    sebelum melanjutkan.
                  </p>
                </div>
              </div>
            </>
          )}
          {tab === 'payment' && (
            <>
              <div className="detail-meta flex justify-between text-[11px] text-muted-foreground border-b border-solid border-b-line pb-4.5 mb-1.25">
                <span>Jatuh tempo</span>
                <strong>{i.dueDate ? dateOnly(i.dueDate) : 'Tidak ada termin pembayaran'}</strong>
              </div>
              {i.payments.length ? (
                i.payments.map((p) => (
                  <div
                    className="payment-row py-4.75 px-0 border-b border-solid border-b-line flex justify-between gap-3.75 text-muted-foreground text-[11px]"
                    key={p.id}
                  >
                    <div>
                      <strong>{p.method.replaceAll('_', ' ').toUpperCase()}</strong>
                      <span className="cell-sub block mt-1.25 text-[10px] text-muted-foreground">
                        {dateTime(p.paidAt)} · {p.id}
                      </span>
                    </div>
                    <strong>{money(p.amount)}</strong>
                  </div>
                ))
              ) : (
                <EmptyState text="Belum ada pembayaran pada invoice ini." />
              )}
              <Alert
                className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 info"
                variant="info"
              >
                <AlertDescription>
                  <ShieldCheck size={17} />
                  <p>
                    {i.delivery
                      ? 'Pembayaran berikut merupakan informasi dokumen sumber. Penerimaan Penjualan belum dikirim ke Accurate.'
                      : 'Pembayaran dicatat sebagai alokasi simulasi lokal. Belum dikirim ke Accurate.'}
                  </p>
                </AlertDescription>
              </Alert>
            </>
          )}
          {tab === 'history' && (
            <>
              {i.targets.map((t) => (
                <div
                  className="target-card flex items-center gap-2.75 p-3.25 rounded-[9px] bg-success-soft border border-solid border-border text-muted-foreground text-[11px] mb-5 mobile:gap-1.75 mobile:text-[9px]"
                  key={t.targetId}
                >
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>{t.targetNumber}</strong>
                    <p>
                      {i.delivery ? 'Faktur Penjualan' : `${t.paymentIds.length} alokasi simulasi`}{' '}
                      · {dateTime(t.syncedAt)}
                    </p>
                  </div>
                  <StatusBadge status={t.targetStatus} />
                </div>
              ))}
              {i.history.length ? (
                <div className="timeline py-1.25 px-0.75">
                  {i.history.map((h) => (
                    <div
                      className="timeline-item flex gap-3.75 pt-0 pr-0 pb-5.5 pl-0 relative"
                      key={h.id}
                    >
                      <span
                        className={cn(
                          `timeline-dot h-1.75 w-1.75 shrink-0 rounded-full mt-2 ${h.status === 'SYNCED' ? 'green bg-[#48af91]' : 'orange bg-[#d9a365]'}`,
                        )}
                      />
                      <div>
                        <div className="timeline-top flex items-center justify-between gap-2.5">
                          <StatusBadge status={h.status} />
                          <span>{dateTime(h.createdAt)}</span>
                        </div>
                        <p>{h.message}</p>
                        {h.response != null && (
                          <details>
                            <summary>Respons sinkronisasi</summary>
                            <pre>{JSON.stringify(h.response, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="Belum ada percobaan sinkronisasi." />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
      <div className="modal-footer py-4.5 px-6.5 border-t border-solid border-t-line flex justify-between items-center gap-3.75 mobile:py-3.75 mobile:px-4.5 mobile:flex-wrap">
        <span>
          <ShieldCheck size={15} />{' '}
          {i.syncStatus === 'LOCAL_ONLY'
            ? 'Tersimpan di intgrte — Full redeem'
            : i.syncStatus === 'LOCAL_ONLY_CONSULTATION'
              ? 'Tersimpan di intgrte — Consultation gratis'
              : i.delivery
                ? 'Faktur Penjualan aktual · Harga akhir termasuk pajak'
                : 'Simulasi lokal'}
        </span>
        <div>
          {admin &&
            !i.syncStatus.startsWith('LOCAL_ONLY') &&
            !i.delivery &&
            i.items.some((item) => !item.mapped) && (
              <Button
                className="button inline-flex items-center justify-center whitespace-nowrap secondary"
                disabled={busy || i.syncStatus === 'PROCESSING'}
                onClick={() => fix(i.id)}
                variant="outline"
              >
                <Wrench size={16} data-icon="inline-start" /> Perbaiki mapping demo
              </Button>
            )}
          {operate &&
            !i.syncStatus.startsWith('LOCAL_ONLY') &&
            !['SYNCED', 'PROCESSING'].includes(i.syncStatus) && (
              <Button
                className="button inline-flex items-center justify-center whitespace-nowrap primary"
                disabled={busy}
                onClick={() => sync(i.id)}
                variant="default"
              >
                <RotateCw size={16} data-icon="inline-start" />
                {i.syncStatus === 'PENDING'
                  ? i.delivery
                    ? 'Kirim faktur'
                    : 'Jalankan simulasi'
                  : 'Periksa & retry'}
              </Button>
            )}
        </div>
      </div>
    </Modal>
  );
}
