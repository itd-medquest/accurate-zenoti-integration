'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  Pencil,
  Save,
  Send,
  Settings2,
  TriangleAlert,
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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProgressiveList } from '@/components/ui/progressive-list';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { money, dateTime } from '@/lib/format';
import { receiptFee } from '../lib/amounts';
import { settlementAmounts } from '../lib/settlement';
import { formatReceiptRate, parseReceiptRate } from '../lib/rates';
import { ReceiptPaymentSelect, ReceiptSettlementHistory } from './receipt-settlement';
import { ReceiptNumberDialog } from './receipt-number-dialog';
import {
  getReceipt,
  saveReceipt,
  submitReceipt,
  checkReceipt,
  reopenReceipt,
  prepareReceipt,
} from '../services/receipts.service';
import {
  methodLabels,
  sourceMethodLabels,
  statusLabels,
  type ReceiptDetail,
  type ReceiptAmountMode,
} from '../types';

function Form({
  data,
  refresh,
  onBack,
  onConfigure,
  canConfigureAccounts = false,
  onInvoice,
  onReceipt,
}: {
  data: ReceiptDetail;
  refresh: () => Promise<void>;
  onBack: () => void;
  onConfigure?: () => void;
  canConfigureAccounts?: boolean;
  onInvoice?: (id: string) => void;
  onReceipt: (id: string, focusPayment?: boolean) => void;
}) {
  const { draft, source, invoice, configuration } = data;
  const simulation = draft.mode === 'simulation';
  const [mappingId, setMappingId] = useState(draft.mappingId ?? '');
  const [paymentDate, setPaymentDate] = useState(draft.paymentDate);
  const [reference, setReference] = useState(draft.paymentReference);
  const [notes, setNotes] = useState(draft.notes);
  const [amountMode, setAmountMode] = useState<ReceiptAmountMode>(draft.amountMode ?? 'FULL');
  const [inputAmount, setInputAmount] = useState(draft.inputAmount?.toString() ?? '');
  const [manualNumber, setManualNumber] = useState(data.receiptNumber ?? '');
  const [rateOverrideBps, setRateOverrideBps] = useState<number | null>(
    draft.rateOverrideBps ?? null,
  );
  const [rateOpen, setRateOpen] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const rateTrigger = useRef<HTMLButtonElement>(null);
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
  const defaultRateBps = mapping ? (mapping.rateBps ?? configuration.rates[mapping.method]) : 0;
  const rateBps = editable && mapping ? (rateOverrideBps ?? defaultRateBps) : draft.rateBps;
  const enteredRateBps = parseReceiptRate(rateInput);
  const mappingChanged =
    !!mapping && mapping.id === draft.mappingId && mapping.version !== draft.mappingVersion;
  const dirty =
    editable &&
    (draft.number !== number ||
      mappingId !== (draft.mappingId ?? '') ||
      mappingChanged ||
      rateOverrideBps !== (draft.rateOverrideBps ?? null) ||
      (!!mapping && rateBps !== draft.rateBps) ||
      amountMode !== (draft.amountMode ?? 'FULL') ||
      (amountMode !== 'FULL' && inputAmount !== (draft.inputAmount?.toString() ?? '')) ||
      paymentDate !== draft.paymentDate ||
      reference !== draft.paymentReference ||
      notes !== draft.notes);
  let amountError = '';
  let values: { gross: number; fee: number; net: number } | null = draft.mappingId
    ? { gross: draft.grossAmount, fee: draft.feeAmount, net: draft.netAmount }
    : null;
  if (editable && mapping) {
    try {
      const rows = data.settlement?.feeBasisByRate;
      const basis = rows
        ? rows
            .filter((row) => row.method === mapping.method && row.rateBps === rateBps)
            .reduce(
              (total, row) => ({ gross: total.gross + row.gross, fee: total.fee + row.fee }),
              { gross: 0, fee: 0 },
            )
        : rateBps === configuration.rates[mapping.method]
          ? data.settlement?.feeBasis[mapping.method]
          : undefined;
      values = data.settlement
        ? settlementAmounts({
            remaining: data.settlement.available,
            priorGross: basis?.gross ?? 0,
            priorFee: basis?.fee ?? 0,
            rateBps,
            mode: amountMode,
            amount: inputAmount ? Number(inputAmount) : null,
          })
        : receiptFee(draft.grossAmount, rateBps);
    } catch (cause) {
      values = null;
      amountError = cause instanceof Error ? cause.message : 'Nominal penerimaan tidak valid.';
    }
  }
  const partiallySettled =
    draft.status === 'SUCCEEDED' && (data.settlement?.invoiceRemaining ?? 0) > 0;
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
  async function openPayment(key: string, focusPayment = false) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const next = await prepareReceipt(draft.invoiceId, key);
      onReceipt(next.id, focusPayment);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pembayaran belum dapat dibuka.');
    } finally {
      setBusy(false);
    }
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
            partiallySettled
              ? 'warning'
              : draft.status === 'SUCCEEDED'
                ? 'success'
                : draft.status === 'NEEDS_REVIEW'
                  ? 'destructive'
                  : ['QUEUED', 'SENDING'].includes(draft.status)
                    ? 'warning'
                    : 'secondary'
          }
        >
          {partiallySettled
            ? statusLabels.PARTIAL
            : simulation && draft.status === 'SUCCEEDED'
              ? 'Simulasi selesai'
              : statusLabels[draft.status]}
        </Badge>
      </div>
      {simulation && (
        <Alert variant="info">
          <Info aria-hidden="true" />
          <AlertDescription>
            Mode simulasi. Penerimaan dan akun contoh hanya disimpan di intgrte; tidak dikirim ke
            Accurate.
          </AlertDescription>
        </Alert>
      )}
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
                  {simulation
                    ? 'Periksa pembayaran dari dokumen sumber sebelum menjalankan simulasi.'
                    : 'Periksa pembayaran dari dokumen sumber sebelum mengirim ke Accurate.'}
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
                  [simulation ? 'Faktur simulasi' : 'Faktur Accurate', invoice.number],
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
          <Card id="receipt-payment-details">
            <CardHeader className="flex-col items-stretch gap-1">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <CardTitle>Rincian pembayaran</CardTitle>
                <ReceiptPaymentSelect
                  data={data}
                  disabled={busy}
                  onPayment={(key) => navigate(() => void openPayment(key, true))}
                />
              </div>
              <CardDescription className="mt-0">
                Pilih bank dan metode yang benar. Biaya dihitung otomatis dari mapping tersimpan.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-5">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!editable || !mappingId || !mapping || !number || amountError || !values)
                    return;
                  void run(() =>
                    saveReceipt(draft.id, {
                      mappingId,
                      mappingVersion: mapping.version,
                      paymentDate,
                      paymentReference: reference,
                      notes,
                      version: draft.version,
                      rateOverrideBps,
                      ...(data.settlement
                        ? {
                            amountMode,
                            ...(amountMode !== 'FULL' ? { inputAmount: Number(inputAmount) } : {}),
                          }
                        : {}),
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
                        setRateOverrideBps(
                          value === draft.mappingId ? (draft.rateOverrideBps ?? null) : null,
                        );
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
                    <Alert variant="warning">
                      <TriangleAlert aria-hidden="true" />
                      <AlertDescription>
                        <div className="flex flex-col gap-3">
                          <p>
                            Pilih Bank dan Metode Pembayaran, Jika pilihan belum tersedia, silakan
                            hubungi Super Admin.
                          </p>
                          {canConfigureAccounts && onConfigure && (
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
                  {data.settlement && editable && (
                    <div className="flex flex-col gap-4 rounded-lg border p-4">
                      <Field orientation="horizontal">
                        <Checkbox
                          id="receipt-partial"
                          checked={amountMode !== 'FULL'}
                          disabled={busy}
                          onCheckedChange={(checked) => {
                            setAmountMode(checked ? 'NET' : 'FULL');
                            setInputAmount('');
                            setReviewed(false);
                          }}
                        />
                        <FieldLabel htmlFor="receipt-partial" className="font-normal">
                          Catat nominal aktual / penerimaan sebagian
                        </FieldLabel>
                      </Field>
                      {amountMode !== 'FULL' && (
                        <>
                          <FieldGroup className="grid items-start gap-4 sm:grid-cols-2">
                            <Field>
                              <FieldLabel htmlFor="receipt-amount-mode">
                                Nominal yang dimasukkan
                              </FieldLabel>
                              <SelectField
                                id="receipt-amount-mode"
                                value={amountMode}
                                disabled={busy}
                                onValueChange={(value) => {
                                  if (value === 'NET' || value === 'GROSS') {
                                    setAmountMode(value);
                                    setInputAmount('');
                                    setReviewed(false);
                                  }
                                }}
                              >
                                <SelectFieldOption value="NET">
                                  Dana bersih (sudah dipotong fee)
                                </SelectFieldOption>
                                <SelectFieldOption value="GROSS">
                                  Sebelum dipotong fee
                                </SelectFieldOption>
                              </SelectField>
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="receipt-actual-amount">
                                {amountMode === 'NET'
                                  ? 'Dana bersih masuk rekening'
                                  : 'Nominal sebelum fee'}
                              </FieldLabel>
                              <CurrencyInput
                                id="receipt-actual-amount"
                                value={inputAmount}
                                fractionDigits={0}
                                min={1}
                                required
                                disabled={busy}
                                aria-invalid={!!amountError}
                                aria-describedby="receipt-amount-help"
                                onValueChange={(value) => {
                                  setInputAmount(value);
                                  setReviewed(false);
                                }}
                              />
                            </Field>
                          </FieldGroup>
                          <p
                            id="receipt-amount-help"
                            className="text-xs leading-relaxed text-muted-foreground"
                          >
                            {amountMode === 'NET'
                              ? 'Fee dihitung balik dari dana bersih dan tidak dipotong dua kali.'
                              : 'Fee dihitung otomatis untuk mendapatkan dana bersih.'}{' '}
                            Sisa pembayaran sumber {money(data.settlement.available)}. Sisa yang
                            belum diterima tetap menjadi piutang{' '}
                            {simulation ? 'pada simulasi.' : 'di Accurate.'}
                          </p>
                        </>
                      )}
                      {amountError && (
                        <p role="alert" className="text-sm text-destructive">
                          {amountError}
                        </p>
                      )}
                    </div>
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
                            unsupported ||
                            !!amountError ||
                            !values
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
          <ReceiptSettlementHistory
            data={data}
            disabled={busy}
            onReceipt={(id) => navigate(() => onReceipt(id))}
          />
        </div>
        <Card
          className="min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring xl:sticky xl:top-5 xl:max-h-[calc(100dvh-9rem)] xl:overflow-y-auto"
          role="region"
          tabIndex={0}
          aria-labelledby="receipt-summary-title"
        >
          <CardHeader>
            <div>
              <CardTitle id="receipt-summary-title">Ringkasan penerimaan</CardTitle>
              <CardDescription>
                Nilai pembayaran dan biaya terpisah dari nilai penjualan pada faktur.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pb-5">
            <dl className="m-0 flex flex-col gap-4">
              {data.balance && (
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <dt className="text-sm text-muted-foreground">
                    {simulation ? 'Sisa tagihan simulasi' : 'Sisa tagihan Accurate'}
                  </dt>
                  <dd className="m-0 ml-auto break-words text-right font-medium tabular-nums">
                    {money(data.balance.outstanding)}
                  </dd>
                </div>
              )}
              {[
                [
                  amountMode === 'FULL' ? 'Pembayaran pelanggan' : 'Pelunasan piutang tahap ini',
                  money(values?.gross ?? draft.grossAmount),
                ],
                ['Biaya administrasi', values ? money(values.fee) : 'Pilih mapping'],
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
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <dt className="text-sm text-muted-foreground">Tarif bank</dt>
                <dd className="m-0 ml-auto flex items-center gap-1.5 font-medium tabular-nums">
                  <span>{mapping || draft.mappingId ? `${formatReceiptRate(rateBps)}%` : '—'}</span>
                  {editable && mapping && !unsupported && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={busy}
                      aria-label="Ubah tarif bank untuk penerimaan ini"
                      ref={rateTrigger}
                      onClick={() => {
                        setRateInput(formatReceiptRate(rateBps));
                        setRateOpen(true);
                      }}
                    >
                      <Pencil className="text-primary" />
                    </Button>
                  )}
                </dd>
              </div>
              {data.settlement &&
                (amountMode !== 'FULL' ||
                  data.settlement.settled > 0 ||
                  data.settlement.payments.length > 1) && (
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <dt className="text-sm text-muted-foreground">
                      Sisa pembayaran ini setelah tahap ini
                    </dt>
                    <dd className="m-0 font-medium tabular-nums">
                      {values
                        ? money(
                            draft.status === 'SUCCEEDED'
                              ? data.settlement.remaining
                              : Math.max(0, data.settlement.available - values.gross),
                          )
                        : 'Isi nominal'}
                    </dd>
                  </div>
                )}
            </dl>
            {data.balance && (
              <p className="m-0 text-xs text-muted-foreground">
                {simulation ? 'Saldo simulasi diperiksa' : 'Saldo diperiksa'}{' '}
                {dateTime(data.balance.checkedAt)} WIB. Saldo akan diperiksa ulang saat pengiriman.
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
                    disabled={
                      busy || dirty || !draft.mappingId || !number || unsupported || !!amountError
                    }
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
                    !!amountError ||
                    !data.delivery.enabled
                  }
                  onClick={() => setConfirm(true)}
                >
                  <Send data-icon="inline-start" />
                  {simulation ? 'Jalankan simulasi' : 'Kirim ke Accurate'}
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
                    <p>
                      {simulation
                        ? 'Simulasi penerimaan selesai. Tidak dikirim ke Accurate.'
                        : 'Penerimaan terverifikasi di Accurate.'}
                    </p>
                    <p className="mt-2 break-all font-medium">
                      {draft.targetNumber}
                      {!simulation && <> · ID {draft.targetId}</>}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {partiallySettled && data.settlement && (
              <Alert variant="warning">
                <AlertDescription>
                  Sisa penerimaan faktur {money(data.settlement.invoiceRemaining)} masih menjadi
                  piutang. Catat penerimaan berikutnya setelah dana masuk.
                </AlertDescription>
              </Alert>
            )}
            {data.actions.canContinue && source.key && (
              <Button
                disabled={busy}
                onClick={() => {
                  if (source.key) void openPayment(source.key);
                }}
              >
                Catat penerimaan berikutnya
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      <Dialog open={rateOpen} onOpenChange={setRateOpen}>
        <DialogContent
          className="sm:max-w-md"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            rateTrigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Ubah tarif bank</DialogTitle>
            <DialogDescription>
              Hanya berlaku pada penerimaan yang sedang direview.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!editable || enteredRateBps === null) return;
              setRateOverrideBps(enteredRateBps);
              setReviewed(false);
              setRateOpen(false);
            }}
          >
            <FieldGroup>
              <Field data-invalid={enteredRateBps === null}>
                <FieldLabel htmlFor="receipt-specific-rate">Tarif bank</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="receipt-specific-rate"
                    inputMode="decimal"
                    value={rateInput}
                    aria-invalid={enteredRateBps === null}
                    aria-describedby="receipt-specific-rate-help"
                    onChange={(event) => setRateInput(event.target.value)}
                  />
                  <InputGroupAddon align="inline-end">%</InputGroupAddon>
                </InputGroup>
                <FieldDescription id="receipt-specific-rate-help">
                  {enteredRateBps === null
                    ? 'Isi tarif 0-99,99%, maksimal dua angka desimal.'
                    : null}
                </FieldDescription>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRateOverrideBps(null);
                    setReviewed(false);
                    setRateOpen(false);
                  }}
                >
                  Gunakan tarif Settings
                </Button>
                <Button type="button" variant="outline" onClick={() => setRateOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={enteredRateBps === null}>
                  Terapkan
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {simulation ? 'Jalankan simulasi penerimaan?' : 'Kirim penerimaan ke Accurate?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Faktur {invoice.number} akan menerima alokasi pembayaran {money(draft.grossAmount)}.
              Biaya administrasi {money(draft.feeAmount)} dan nilai bersih kas/bank{' '}
              {money(draft.netAmount)}.{' '}
              {simulation
                ? 'Hasil hanya disimpan di intgrte, tanpa pengiriman ke Accurate.'
                : 'Pastikan data sudah benar sebelum melanjutkan.'}
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
              {busy ? 'Memproses…' : simulation ? 'Ya, jalankan simulasi' : 'Ya, kirim penerimaan'}
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
  canConfigureAccounts = false,
  onInvoice,
  onReceipt,
  focusPayment = false,
  onPaymentFocused,
}: {
  id: string;
  onBack: () => void;
  onConfigure?: () => void;
  canConfigureAccounts?: boolean;
  onInvoice?: (id: string) => void;
  onReceipt: (id: string, focusPayment?: boolean) => void;
  focusPayment?: boolean;
  onPaymentFocused?: () => void;
}) {
  const fetcher = useCallback((signal: AbortSignal) => getReceipt(id, signal), [id]);
  const { data, error, load, read } = usePolledResource({
    fetcher,
    shouldPoll: sending,
    delay: 0,
    fallback: 'Penerimaan gagal dimuat.',
  });
  useEffect(() => {
    if (!focusPayment || !data) return;
    const details = document.getElementById('receipt-payment-details');
    const content = details?.closest<HTMLElement>('main.workspace-content');
    if (details && content) {
      content.scrollTop +=
        details.getBoundingClientRect().top -
        content.getBoundingClientRect().top -
        parseFloat(getComputedStyle(content).paddingTop);
    }
    document.getElementById('receipt-payment-choice')?.focus({ preventScroll: true });
    onPaymentFocused?.();
  }, [focusPayment, data, onPaymentFocused]);
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
          canConfigureAccounts={canConfigureAccounts}
          onInvoice={onInvoice}
          onReceipt={onReceipt}
        />
      ) : (
        !error && <Skeleton className="h-96" />
      )}
    </div>
  );
}

const sending = (data: ReceiptDetail) => ['QUEUED', 'SENDING'].includes(data.draft.status);
