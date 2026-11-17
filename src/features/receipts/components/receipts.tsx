'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCheck,
  CircleAlert,
  Clock3,
  FilePenLine,
  RefreshCw,
  Search,
  Settings2,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ImportPagination } from '@/components/ui/pagination';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { dateOnly, money } from '@/lib/format';
import type { Branch } from '@/types';
import { useReceiptOverview } from '../hooks/use-receipt-overview';
import { prepareReceipt } from '../services/receipts.service';
import {
  sourceMethodLabels,
  methodLabels,
  statusLabels,
  type ReceiptFilters,
  type ReceiptRow,
  type ReceiptStatus,
} from '../types';
import { ReceiptReview } from './receipt-review';

const statusVariants = {
  TO_REVIEW: 'info',
  DRAFT: 'secondary',
  QUEUED: 'warning',
  SENDING: 'warning',
  SUCCEEDED: 'success',
  NEEDS_REVIEW: 'destructive',
} as const;

export function ReceiptsView({
  branches,
  onConfigure,
  onInvoice,
}: {
  branches: Branch[];
  onConfigure?: () => void;
  onInvoice?: (id: string) => void;
}) {
  const [filters, setFilters] = useState<ReceiptFilters>({
    search: '',
    branch: '',
    status: '',
    from: '',
    to: '',
    page: 1,
    pageSize: 25,
  });
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const content = document.querySelector<HTMLElement>('main.workspace-content');
    if (content) content.scrollTop = 0;
  }, [selected]);
  const [opening, setOpening] = useState('');
  const [actionError, setActionError] = useState('');
  const { data, busy, error, load } = useReceiptOverview(filters);
  const update = (patch: Partial<ReceiptFilters>) =>
    setFilters((previous) => ({ ...previous, ...patch, page: 1 }));
  async function open(row: ReceiptRow) {
    setOpening(row.sourceKey);
    setActionError('');
    try {
      const draft = row.draft ?? (await prepareReceipt(row.invoiceId, row.sourceKey));
      setSelected(draft.id);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Penerimaan belum dapat dibuka.');
    } finally {
      setOpening('');
    }
  }
  if (selected)
    return (
      <ReceiptReview
        id={selected}
        onBack={() => {
          setSelected(null);
          void load();
        }}
        onConfigure={onConfigure}
        onInvoice={onInvoice}
      />
    );
  const summaries = [
    {
      label: 'Belum direview',
      value: data?.summary.review,
      icon: FilePenLine,
      hint: 'Pembayaran siap diperiksa',
      tone: 'default',
    },
    {
      label: 'Draft',
      value: data?.summary.draft,
      icon: FilePenLine,
      hint: 'Review tersimpan di intgrte',
      tone: 'default',
    },
    {
      label: 'Sedang diproses',
      value: data?.summary.processing,
      icon: Clock3,
      hint: 'Antrean dan proses Accurate',
      tone: 'default',
    },
    {
      label: 'Berhasil',
      value: data?.summary.succeeded,
      icon: CheckCheck,
      hint: 'Terverifikasi di Accurate',
      tone: 'brand',
    },
    {
      label: 'Perlu diperiksa',
      value: data?.summary.attention,
      icon: CircleAlert,
      hint: 'Penerimaan perlu ditinjau',
      tone: 'highlight',
    },
  ] as const;
  const hasFilters = !!(
    filters.search ||
    filters.branch ||
    filters.from ||
    filters.to ||
    filters.status
  );
  return (
    <section aria-label="Riwayat Penerimaan Penjualan" className="flex min-w-0 flex-col gap-6">
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-5"
        aria-label="Ringkasan status penerimaan"
      >
        {summaries.map(({ label, value, icon: Icon, hint, tone }) => (
          <Card key={label} size="sm" tone={tone} className="last:col-span-2 lg:last:col-span-1">
            <CardHeader className="min-h-16 items-start gap-2 pb-3">
              <CardTitle>{label}</CardTitle>
              <Icon aria-hidden="true" className="size-4 shrink-0" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pb-4">
              {!data && !error ? (
                <Skeleton className="h-9 w-14" />
              ) : (
                <strong className="font-display text-3xl font-medium tabular-nums">
                  {value?.toLocaleString('id-ID') ?? '—'}
                </strong>
              )}
              <CardDescription>{hint}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex-wrap items-start">
          <div className="min-w-0">
            <CardTitle>Riwayat dan review penerimaan</CardTitle>
            <CardDescription>
              Pembayaran dari invoice yang sudah terverifikasi di Accurate.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {onConfigure && (
              <Button variant="outline" size="sm" onClick={onConfigure}>
                <Settings2 data-icon="inline-start" />
                Pengaturan akun
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}>
              <RefreshCw data-icon="inline-start" />
              Muat ulang
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-5">
          <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            <Field>
              <FieldLabel htmlFor="receipt-search">Cari penerimaan</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  id="receipt-search"
                  maxLength={100}
                  placeholder="Faktur, penerimaan, customer, atau referensi"
                  value={filters.search}
                  onChange={(event) => update({ search: event.target.value })}
                />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="receipt-branch-filter">Perusahaan</FieldLabel>
              <SelectField
                id="receipt-branch-filter"
                value={filters.branch}
                onValueChange={(branch) => update({ branch })}
              >
                <SelectFieldOption value="">Semua perusahaan</SelectFieldOption>
                {branches.map((branch) => (
                  <SelectFieldOption key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectFieldOption>
                ))}
              </SelectField>
            </Field>
            <Field>
              <FieldLabel htmlFor="receipt-period-filter">Periode pembayaran</FieldLabel>
              <DateRangePicker
                id="receipt-period-filter"
                heading="Periode pembayaran"
                dateFrom={filters.from}
                dateTo={filters.to}
                onChange={(range) => update({ from: range.dateFrom, to: range.dateTo })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="receipt-status-filter">Status penerimaan</FieldLabel>
              <SelectField
                id="receipt-status-filter"
                value={filters.status}
                onValueChange={(value) => {
                  if (value === '' || value in statusLabels)
                    update({ status: value as ReceiptStatus | '' });
                }}
              >
                <SelectFieldOption value="">Semua status</SelectFieldOption>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectFieldOption key={key} value={key}>
                    {label}
                  </SelectFieldOption>
                ))}
              </SelectField>
            </Field>
          </FieldGroup>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ringkasan mengikuti pencarian, perusahaan, dan periode. Filter status berlaku pada
            riwayat.
          </p>
          {(error || actionError) && (
            <Alert variant="destructive">
              <AlertDescription className="flex-col">
                <p>{actionError || error}</p>
                {error && (
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}>
                    Coba lagi
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        {!data && busy ? (
          <div
            role="status"
            aria-label="Memuat riwayat penerimaan"
            className="flex flex-col gap-3 px-5 pb-5"
          >
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : data?.items.length ? (
          <div aria-busy={busy}>
            <Table aria-label="Riwayat penerimaan penjualan">
              <TableHeader>
                <TableRow>
                  <TableHead>Faktur / penerimaan</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Tanggal bayar</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Pembayaran pelanggan</TableHead>
                  <TableHead className="text-right">Biaya admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={`${row.invoiceId}:${row.sourceKey}`}>
                    <TableCell>
                      <p className="font-medium">{row.invoiceNumber}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.draft?.targetNumber ?? row.draft?.number ?? row.branchName}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-40 max-w-60 whitespace-normal break-words">
                      {row.customer}
                    </TableCell>
                    <TableCell>{dateOnly(row.draft?.paymentDate || row.paidAt)}</TableCell>
                    <TableCell>
                      <p>
                        {row.draft?.method
                          ? methodLabels[row.draft.method]
                          : (sourceMethodLabels[row.sourceMethod] ?? row.sourceMethod)}
                      </p>
                      {row.draft?.bank && (
                        <p className="mt-1 text-xs text-muted-foreground">{row.draft.bank}</p>
                      )}
                      {row.grouped && (
                        <Badge variant="secondary" className="mt-2">
                          {row.paymentCount} alokasi sumber
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.gross === null ? '—' : money(row.gross)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.draft?.mappingId ? money(row.draft.feeAmount) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[row.status]}>{statusLabels[row.status]}</Badge>
                      {row.error && (
                        <p className="mt-2 max-w-64 whitespace-normal text-xs text-destructive">
                          {row.error}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !!opening || busy || (!row.draft && row.status === 'NEEDS_REVIEW')
                        }
                        onClick={() => void open(row)}
                      >
                        {opening === row.sourceKey
                          ? 'Membuka…'
                          : row.status === 'TO_REVIEW'
                            ? 'Review'
                            : 'Buka'}
                        <ArrowRight data-icon="inline-end" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          !busy &&
          !error && (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FilePenLine />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters
                    ? 'Tidak ada penerimaan yang sesuai'
                    : 'Belum ada penerimaan untuk direview'}
                </EmptyTitle>
                <EmptyDescription>
                  Gunakan faktur yang berhasil dikirim ke Accurate dan memiliki pembayaran sumber.
                  Coba sesuaikan filter untuk melihat data lain.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => update({ search: '', branch: '', status: '', from: '', to: '' })}
                  >
                    Reset filter
                  </Button>
                ) : (
                  <Button variant="outline" disabled={busy} onClick={() => void load()}>
                    <RefreshCw data-icon="inline-start" />
                    Muat ulang
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          )
        )}
        {data && (
          <ImportPagination
            page={data.page}
            total={data.total}
            pageSize={filters.pageSize}
            label="Riwayat penerimaan"
            disabled={busy}
            onPage={(page) => setFilters((previous) => ({ ...previous, page }))}
            onPageSize={(pageSize) => update({ pageSize })}
          />
        )}
      </Card>
    </section>
  );
}
