'use client';

import { useCallback, useState } from 'react';
import { usePolledResource } from '@/hooks/use-polled-resource';
import { format, parseISO } from 'date-fns';
import { id as locale } from 'date-fns/locale';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  FileText,
  Info,
  Save,
  Send,
  Settings2,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProgressiveList } from '@/components/ui/progressive-list';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { money, dateTime } from '@/lib/format';
import { receiptFee } from '../lib/amounts';
import { ReceiptNumberDialog } from './receipt-number-dialog';
import {
  getReceipt,
  saveReceipt,
  submitReceipt,
  checkReceipt,
  reopenReceipt,
} from '../services/receipts.service';
import { methodLabels, sourceMethodLabels, statusLabels, type ReceiptDetail } from '../types';

function Form({
  data,
  refresh,
  onBack,
  onConfigure,
  onInvoice,
}: {
  data: ReceiptDetail;
  refresh: () => Promise<void>;
  onBack: () => void;
  onConfigure?: () => void;
  onInvoice?: (id: string) => void;
}) {
  const { draft, source, invoice, configuration } = data;
  const [mappingId, setMappingId] = useState(draft.mappingId ?? '');
  const [paymentDate, setPaymentDate] = useState(draft.paymentDate);
  const [reference, setReference] = useState(draft.paymentReference);
  const [notes, setNotes] = useState(draft.notes);
  const [manualNumber, setManualNumber] = useState(data.receiptNumber ?? '');
  const [dateOpen, setDateOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [reopen, setReopen] = useState(false);
  const [leave, setLeave] = useState(false);
  const [leaveAction, setLeaveAction] = useState<(() => void) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable = draft.status === 'DRAFT' && data.validation.editable;
  const number = editable
    ? (source.receiptNumber ?? manualNumber)
    : (draft.targetNumber ?? draft.number);
  const mapping = configuration.mappings.find((row) => row.id === mappingId);
  const mappingChanged =
    !!mapping && mapping.id === draft.mappingId && mapping.version !== draft.mappingVersion;
  const dirty =
    editable &&
    (draft.number !== number ||
      mappingId !== (draft.mappingId ?? '') ||
      mappingChanged ||
      paymentDate !== draft.paymentDate ||
      reference !== draft.paymentReference ||
      notes !== draft.notes);
  const values =
    editable && mapping
      ? receiptFee(draft.grossAmount, configuration.rates[mapping.method])
      : draft.mappingId
        ? { gross: draft.grossAmount, fee: draft.feeAmount, net: draft.netAmount }
        : null;
  const rateBps = editable && mapping ? configuration.rates[mapping.method] : draft.rateBps;
  const account = editable
    ? mapping && {
        accountNo: mapping.accountNo,
        accountName: mapping.accountName,
        feeAccountNo: mapping.feeAccountNo,
        feeAccountName: mapping.feeAccountName,
      }
    : draft.bankAccountNo && {
        accountNo: draft.bankAccountNo,
        accountName: draft.bankAccountName,
        feeAccountNo: draft.feeAccountNo,
        feeAccountName: draft.feeAccountName,
      };
  const unsupported = ['cash', 'gift_card', 'voucher'].includes(draft.sourceMethod);
  function navigate(action: () => void) {
    if (dirty) {
      setLeaveAction(() => action);
      setLeave(true);
    } else action();
  }
  async function run(task?: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await task?.();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Perubahan belum dapat diproses.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Detail penerimaan penjualan" className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" disabled={busy} onClick={() => navigate(onBack)}>
          <ArrowLeft data-icon="inline-start" />
          Kembali ke riwayat
        </Button>
        <Badge
          variant={
            draft.status === 'SUCCEEDED'
              ? 'success'
              : draft.status === 'NEEDS_REVIEW'
                ? 'destructive'
                : ['QUEUED', 'SENDING'].includes(draft.status)
                  ? 'warning'
                  : 'secondary'
          }
        >
          {statusLabels[draft.status]}
        </Badge>
      </div>
      {data.validation.message && (
        <Alert variant="destructive">
          <AlertDescription>
            {data.validation.message} Data tersimpan ditampilkan untuk pemeriksaan.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader className="flex-wrap items-start">
              <div className="min-w-0">
                <CardTitle>Review penerimaan</CardTitle>
                <CardDescription>
                  Periksa pembayaran dari dokumen sumber sebelum mengirim ke Accurate.
                </CardDescription>
              </div>
              {onInvoice && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => navigate(() => onInvoice(draft.invoiceId))}
                >
                  <FileText data-icon="inline-start" />
                  Lihat faktur
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pb-5">
              <dl className="m-0 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {[
                  ['Faktur Accurate', invoice.number],
                  ['Customer', invoice.customer],
                  ['No. Bukti Accurate (No. Receipt)', number],
                  ['Pembayaran sumber', sourceMethodLabels[source.method] ?? source.method],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="m-0 mt-1 flex flex-col items-start gap-2 break-words font-medium">
                      {value ||
                        (label === 'No. Bukti Accurate (No. Receipt)' ? 'Belum diisi' : '—')}
                      {label === 'No. Bukti Accurate (No. Receipt)' &&
                        editable &&
                        data.actions.canSetNumber && (
                          <ReceiptNumberDialog
                            value={number}
                            disabled={busy}
                            onApply={(value) => {
                              setManualNumber(value);
                              setReviewed(false);
                            }}
                          />
                        )}
                    </dd>
                  </div>
                ))}
              </dl>
              <Separator />
              <Alert variant="info">
                <Info aria-hidden="true" />
                <AlertDescription>
                  <p>
                    {source.grouped
                      ? `${source.payments.length} alokasi item digabung dari laporan sumber. `
                      : ''}
                    Cocokkan tanggal, referensi, dan metode pembayaran dengan dokumen. Status Closed
                    tidak menjadi bukti dana masuk bank.
                  </p>
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Referensi sumber</p>
                <ProgressiveList
                  className="grid grid-cols-1 gap-2"
                  itemLabel="alokasi sumber"
                  items={source.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-muted/40 px-4 py-3"
                    >
                      <span className="min-w-0 basis-40 flex-1 break-words text-xs leading-relaxed text-muted-foreground">
                        {payment.id}
                      </span>
                      <span className="text-sm font-medium tabular-nums">
                        {money(payment.amount)}
                      </span>
                    </div>
                  ))}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Rincian pembayaran</CardTitle>
                <CardDescription>
                  Pilih bank dan metode yang benar. Biaya dihitung otomatis dari mapping tersimpan.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!editable || !mappingId || !mapping || !number) return;
                  void run(() =>
                    saveReceipt(draft.id, {
                      mappingId,
                      mappingVersion: mapping.version,
                      paymentDate,
                      paymentReference: reference,
                      notes,
                      version: draft.version,
                      ...(data.actions.canSetNumber ? { receiptNumber: number } : {}),
                    }),
                  );
                }}
              >
                <FieldGroup className="gap-5">
                  {editable && !data.balance && !unsupported && data.delivery.message && (
                    <Alert variant="info" role="status">
                      <Info aria-hidden="true" />
                      <AlertDescription className="flex-col">
                        <p>
                          {data.delivery.message} Draft tetap dapat dilengkapi. Pengiriman menunggu
                          sisa tagihan terverifikasi.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void run()}
                        >
                          Periksa ulang saldo
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  {unsupported && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Metode sumber ini memerlukan kebijakan akun terpisah. Penerimaan bank belum
                        dapat dikirim untuk pembayaran ini.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Field data-disabled={!editable || busy}>
                    <FieldLabel htmlFor="receipt-mapping">Bank dan metode pembayaran</FieldLabel>
                    <SelectField
                      id="receipt-mapping"
                      value={mappingId}
                      onValueChange={(value) => {
                        setMappingId(value);
                        setReviewed(false);
                      }}
                      disabled={!editable || busy || unsupported}
                    >
                      <SelectFieldOption value="">Pilih mapping akun</SelectFieldOption>
                      {!editable && draft.mappingId && (
                        <SelectFieldOption value={draft.mappingId}>
                          {draft.bank} ·{' '}
                          {draft.method ? methodLabels[draft.method] : 'Mapping tersimpan'}
                        </SelectFieldOption>
                      )}
                      {configuration.mappings
                        .filter((row) => editable || row.id !== draft.mappingId)
                        .filter((row) =>
                          source.method === 'qris'
                            ? row.method === 'QRIS'
                            : source.method === 'bank'
                              ? row.method === 'BANK_TRANSFER'
                              : source.method === 'card'
                                ? ['CREDIT_CARD', 'DEBIT_CARD'].includes(row.method)
                                : true,
                        )
                        .map((row) => (
                          <SelectFieldOption key={row.id} value={row.id}>
                            {row.bank} · {methodLabels[row.method]}
                          </SelectFieldOption>
                        ))}
                    </SelectField>
                    <FieldDescription>
                      {source.method === 'card'
                        ? 'Pilih kartu kredit atau debit sesuai bukti pembayaran.'
                        : 'Akun dan tarif mengikuti pengaturan perusahaan untuk metode ini.'}
                    </FieldDescription>
                  </Field>
                  {account ? (
                    <div className="flex min-w-0 flex-col gap-4 rounded-lg bg-muted/40 p-4">
                      <dl className="m-0 grid gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-muted-foreground">Akun kas/bank</dt>
                          <dd className="m-0 mt-1 break-words font-medium">
                            {account.accountNo} · {account.accountName}
                          </dd>
                        </div>
                        {account.feeAccountNo && (
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              Akun biaya administrasi
                            </dt>
                            <dd className="m-0 mt-1 break-words font-medium">
                              {account.feeAccountNo} · {account.feeAccountName}
                            </dd>
                          </div>
                        )}
                      </dl>
                      <Badge variant={dirty ? 'info' : 'success'}>
                        {!dirty && <Check data-icon="inline-start" />}
                        {dirty ? 'Akun dipilih · simpan draft' : 'Akun pada penerimaan tersimpan'}
                      </Badge>
                    </div>
                  ) : (
                    <Alert variant="info">
                      <AlertDescription>
                        <div className="flex flex-col gap-3">
                          <p>
                            Mapping belum dipilih. Jika pilihan belum tersedia, Super Admin perlu
                            mengatur akun penerimaan di Settings.
                          </p>
                          {onConfigure && (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-fit"
                              disabled={busy}
                              onClick={() => navigate(onConfigure)}
                            >
                              <Settings2 data-icon="inline-start" />
                              Buka pengaturan akun
                            </Button>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  <FieldGroup className="grid gap-4 sm:grid-cols-2">
                    <Field data-disabled={!editable || busy}>
                      <FieldLabel htmlFor="receipt-payment-date">Tanggal pembayaran</FieldLabel>
                      <Popover open={dateOpen} onOpenChange={setDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            id="receipt-payment-date"
                            className="h-10.5 w-full justify-between"
                            disabled={!editable || busy}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <CalendarDays aria-hidden="true" />
                              {paymentDate
                                ? format(parseISO(paymentDate), 'd MMM yyyy', { locale })
                                : 'Pilih tanggal'}
                            </span>
                            <ChevronDown data-icon="inline-end" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="start">
                          <Calendar
                            mode="single"
                            locale={locale}
                            selected={paymentDate ? parseISO(paymentDate) : undefined}
                            defaultMonth={paymentDate ? parseISO(paymentDate) : undefined}
                            onSelect={(value) => {
                              if (value) {
                                setPaymentDate(format(value, 'yyyy-MM-dd'));
                                setReviewed(false);
                                setDateOpen(false);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <FieldDescription>
                        Periksa tanggal pembayaran sebenarnya, mengikuti WIB.
                      </FieldDescription>
                    </Field>
                    <Field data-disabled={!editable || busy}>
                      <FieldLabel htmlFor="receipt-reference">Referensi pembayaran</FieldLabel>
                      <Input
                        id="receipt-reference"
                        value={reference}
                        maxLength={100}
                        required
                        disabled={!editable || busy}
                        onChange={(event) => {
                          setReference(event.target.value);
                          setReviewed(false);
                        }}
                        placeholder="Nomor receipt / referensi pembayaran"
                      />
                      <FieldDescription>
                        Gunakan referensi yang dapat diperiksa pada sumber.
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                  <Field data-disabled={!editable || busy}>
                    <FieldLabel htmlFor="receipt-notes">Catatan Finance</FieldLabel>
                    <Textarea
                      id="receipt-notes"
                      value={notes}
                      maxLength={500}
                      disabled={!editable || busy}
                      onChange={(event) => {
                        setNotes(event.target.value);
                        setReviewed(false);
                      }}
                      placeholder="Catatan pemeriksaan, jika diperlukan"
                    />
                  </Field>
                  {editable && (
                    <>
                      <Separator />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p role="status" className="text-xs leading-relaxed text-muted-foreground">
                          {dirty
                            ? 'Ada perubahan yang belum disimpan.'
                            : 'Draft tersimpan di intgrte.'}
                        </p>
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={
                            busy ||
                            !mappingId ||
                            !reference.trim() ||
                            !paymentDate ||
                            !number ||
                            unsupported
                          }
                        >
                          <Save data-icon="inline-start" />
                          {busy ? 'Memproses…' : 'Simpan draft'}
                        </Button>
                      </div>
                    </>
                  )}
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
        <Card className="min-w-0">
          <CardHeader>
            <div>
              <CardTitle>Ringkasan penerimaan</CardTitle>
              <CardDescription>
                Nilai pembayaran dan biaya terpisah dari nilai penjualan pada faktur.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pb-5">
            <dl className="m-0 flex flex-col gap-4">
              {data.balance && (
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <dt className="text-sm text-muted-foreground">Sisa tagihan Accurate</dt>
                  <dd className="m-0 ml-auto break-words text-right font-medium tabular-nums">
                    {money(data.balance.outstanding)}
                  </dd>
                </div>
              )}
              {[
                ['Pembayaran pelanggan', money(draft.grossAmount)],
                ['Biaya administrasi', values ? money(values.fee) : 'Pilih mapping'],
                [
                  'Tarif bank',
                  values ? `${new Intl.NumberFormat('id-ID').format(rateBps / 100)}%` : '—',
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
                >
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="m-0 ml-auto break-words text-right font-medium tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {data.balance && (
              <p className="m-0 text-xs text-muted-foreground">
                Saldo diperiksa {dateTime(data.balance.checkedAt)} WIB. Saldo akan diperiksa ulang
                saat pengiriman.
              </p>
            )}
            <Separator />
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium">Bersih diterima kas/bank</p>
              <p className="break-words font-display text-3xl font-medium tabular-nums">
                {values ? money(values.net) : '—'}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Pecahan rupiah pada biaya selalu dibulatkan ke atas.
              </p>
            </div>
            {draft.error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>{draft.error}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4">
            {editable && (
              <>
                <Field orientation="horizontal" className="items-start">
                  <Checkbox
                    id="receipt-reviewed"
                    className="mt-0.5 shrink-0"
                    checked={reviewed}
                    disabled={busy || dirty || !draft.mappingId || !number || unsupported}
                    onCheckedChange={(value) => setReviewed(value === true)}
                  />
                  <FieldLabel
                    htmlFor="receipt-reviewed"
                    className="text-sm font-normal leading-relaxed"
                  >
                    Saya telah memeriksa sumber, tanggal, referensi, akun, dan nominal penerimaan
                    ini.
                  </FieldLabel>
                </Field>
                <Button
                  disabled={
                    busy ||
                    dirty ||
                    !reviewed ||
                    !draft.mappingId ||
                    !number ||
                    unsupported ||
                    !data.delivery.enabled
                  }
                  onClick={() => setConfirm(true)}
                >
                  <Send data-icon="inline-start" />
                  Kirim ke Accurate
                </Button>
                {!data.delivery.enabled && (data.balance || unsupported) && (
                  <Alert variant="info">
                    <AlertDescription>{data.delivery.message}</AlertDescription>
                  </Alert>
                )}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Menyimpan draft hanya menyimpan pemeriksaan di intgrte.
                </p>
              </>
            )}
            {['QUEUED', 'SENDING'].includes(draft.status) && (
              <Alert variant="info">
                <AlertDescription>
                  Penerimaan sedang diproses. Status akan diperbarui otomatis.
                </AlertDescription>
              </Alert>
            )}
            {data.actions.canCheck && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => checkReceipt(draft.id))}
              >
                {busy ? 'Memeriksa…' : 'Periksa hasil di Accurate'}
              </Button>
            )}
            {data.actions.canReopen && (
              <Button variant="outline" disabled={busy} onClick={() => setReopen(true)}>
                Kembalikan ke draft
              </Button>
            )}
            {draft.status === 'NEEDS_REVIEW' && draft.attemptedAt && !data.actions.canReopen && (
              <Alert variant="info">
                <AlertDescription>
                  Hasil pengiriman belum terverifikasi. Gunakan Periksa hasil di Accurate untuk
                  mencocokkan transaksi sebelum melanjutkan.
                </AlertDescription>
              </Alert>
            )}
            {draft.status === 'SUCCEEDED' && (
              <Alert variant="success">
                <AlertDescription>
                  <div>
                    <p>Penerimaan terverifikasi di Accurate.</p>
                    <p className="mt-2 break-all font-medium">
                      {draft.targetNumber} · ID {draft.targetId}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim penerimaan ke Accurate?</AlertDialogTitle>
            <AlertDialogDescription>
              Faktur {invoice.number} akan menerima alokasi pembayaran {money(draft.grossAmount)}.
              Biaya administrasi {money(draft.feeAmount)} dan nilai bersih kas/bank{' '}
              {money(draft.netAmount)}. Pastikan data sudah benar sebelum melanjutkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void run(async () => {
                  await submitReceipt(draft.id, draft.version);
                  setConfirm(false);
                });
              }}
            >
              {busy ? 'Memproses…' : 'Ya, kirim penerimaan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={leave} onOpenChange={setLeave}>
        <AlertDialogContent className="w-[calc(100%-2rem)] data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Ada perubahan yang belum disimpan</AlertDialogTitle>
            <AlertDialogDescription>
              Perubahan terakhir pada form akan dilepas. Draft yang sudah tersimpan tetap tersedia
              di riwayat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="min-w-0">
            <AlertDialogCancel className="w-full sm:w-auto">Lanjutkan review</AlertDialogCancel>
            <AlertDialogAction className="w-full sm:w-auto" onClick={() => leaveAction?.()}>
              Lanjutkan tanpa menyimpan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={reopen} onOpenChange={setReopen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kembalikan penerimaan ke draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Penerimaan akan dapat diperiksa dan diperbaiki lagi. Finance perlu menyimpan serta
              mengonfirmasi ulang sebelum mengirim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void run(async () => {
                  await reopenReceipt(draft.id, draft.version);
                  setReopen(false);
                });
              }}
            >
              {busy ? 'Memproses…' : 'Ya, kembalikan ke draft'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function ReceiptReview({
  id,
  onBack,
  onConfigure,
  onInvoice,
}: {
  id: string;
  onBack: () => void;
  onConfigure?: () => void;
  onInvoice?: (id: string) => void;
}) {
  const fetcher = useCallback((signal: AbortSignal) => getReceipt(id, signal), [id]);
  const { data, error, load, read } = usePolledResource({
    fetcher,
    shouldPoll: sending,
    delay: 0,
    fallback: 'Penerimaan gagal dimuat.',
  });
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="flex flex-col gap-3">
              <p>{error}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void load().catch(() => {})}>
                  Coba lagi
                </Button>
                {!data && (
                  <Button variant="outline" onClick={onBack}>
                    Kembali ke riwayat
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {data ? (
        <Form
          key={`${data.draft.id}:${data.draft.version}:${data.draft.status}`}
          data={data}
          refresh={read}
          onBack={onBack}
          onConfigure={onConfigure}
          onInvoice={onInvoice}
        />
      ) : (
        !error && <Skeleton className="h-96" />
      )}
    </div>
  );
}

const sending = (data: ReceiptDetail) => ['QUEUED', 'SENDING'].includes(data.draft.status);
