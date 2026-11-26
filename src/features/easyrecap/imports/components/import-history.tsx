'use client';

import { useEffect } from 'react';

import {
  ArrowRight,
  CheckCheck,
  CircleAlert,
  Clock3,
  FilePenLine,
  Gift,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { ImportPagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { SummaryFilterCard } from '@/components/ui/summary-filter-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Branch } from '@/types';
import { dateTime } from '@/lib/format';
import { useImportOverview } from '../hooks/use-import-overview';
import { UploadPeriodPicker } from './upload-period-picker';
import type { History, ImportHistoryFilters } from '../types';

const statuses = [
  {
    key: 'sent',
    label: 'Berhasil dikirim',
    hint: 'Terverifikasi di Accurate',
    icon: CheckCheck,
    variant: 'success',
  },
  {
    key: 'draft',
    label: 'Draft',
    hint: 'Perlu review sebelum submit',
    icon: FilePenLine,
    variant: 'secondary',
  },
  {
    key: 'failed',
    label: 'Gagal / perlu diperiksa',
    hint: 'Pengiriman perlu ditinjau',
    icon: CircleAlert,
    variant: 'destructive',
  },
  {
    key: 'redeem',
    label: 'Full redeem',
    hint: 'Tersimpan tanpa pengiriman',
    icon: Gift,
    variant: 'info',
  },
  {
    key: 'processing',
    label: 'Sedang dikirim',
    hint: 'Antrean dan proses Accurate',
    icon: Clock3,
    variant: 'warning',
  },
] as const;

export function ImportHistoryView({
  branches,
  filters,
  onFilters,
  revision,
  opening,
  onUpload,
  onOpen,
  onDelete,
}: {
  branches: Branch[];
  filters: ImportHistoryFilters;
  onFilters: (filters: ImportHistoryFilters) => void;
  revision: number;
  opening: boolean;
  onUpload: () => void;
  onOpen: (id: string) => void;
  onDelete: (entry: History) => void;
}) {
  const { data, busy, error, load } = useImportOverview(filters, revision);
  useEffect(() => {
    if (data && !busy) {
      const last = Math.max(1, Math.ceil(data.total / 10));
      if (filters.page > last) onFilters({ ...filters, page: last });
    }
  }, [data, busy, filters, onFilters]);
  const update = (next: Partial<ImportHistoryFilters>) =>
    onFilters({ ...filters, ...next, page: 1 });
  return (
    <section aria-label="Riwayat Faktur Penjualan" className="flex min-w-0 flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Ringkasan status invoice">
        {statuses.map(({ key, label, hint, icon: Icon }) => (
          <SummaryFilterCard
            key={key}
            label={label}
            value={data?.summary[key]}
            hint={hint}
            icon={Icon}
            className="last:col-span-2 lg:last:col-span-1"
            tone={key === 'sent' ? 'brand' : key === 'failed' ? 'highlight' : 'default'}
            active={filters.status === key}
            loading={!data && !error}
            disabled={opening}
            controls="invoice-upload-history"
            onSelect={() => update({ status: filters.status === key ? '' : key })}
          />
        ))}
      </div>
      <Card className="import-history" id="invoice-upload-history">
        <CardHeader className="flex-wrap items-start">
          <div>
            <CardTitle>Riwayat upload</CardTitle>
            <CardDescription>
              Batch tersimpan, dikelompokkan berdasarkan waktu upload.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || opening}
            onClick={() => void load()}
          >
            <RefreshCw data-icon="inline-start" />
            Muat ulang
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-5">
          <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
            <Field>
              <FieldLabel htmlFor="history-search">Cari riwayat</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="history-search"
                  placeholder="Nomor invoice, customer, file, atau batch"
                  maxLength={100}
                  value={filters.search}
                  onChange={(event) => update({ search: event.target.value })}
                />
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="history-company">Perusahaan</FieldLabel>
              <SelectField
                id="history-company"
                value={filters.branch}
                onValueChange={(event) => update({ branch: event })}
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
              <FieldLabel htmlFor="history-period">Periode upload</FieldLabel>
              <UploadPeriodPicker
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                onChange={update}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="history-status">Status invoice</FieldLabel>
              <SelectField
                id="history-status"
                value={filters.status}
                onValueChange={(event) => {
                  const status = statuses.find(({ key }) => key === event)?.key ?? '';
                  update({ status });
                }}
              >
                <SelectFieldOption value="">Semua status</SelectFieldOption>
                {statuses.map(({ key, label }) => (
                  <SelectFieldOption key={key} value={key}>
                    {label}
                  </SelectFieldOption>
                ))}
              </SelectField>
            </Field>
          </FieldGroup>
          <p className="m-0 text-xs text-muted-foreground">
            Ringkasan mengikuti pencarian, perusahaan, dan periode. Filter status menampilkan batch
            yang memuat invoice dengan status tersebut.
          </p>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        {!data && !error ? (
          <div role="status" aria-label="Memuat riwayat" className="flex flex-col gap-3 px-5 pb-5">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : data?.items.length ? (
          <div className="overflow-x-auto" aria-busy={busy}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BATCH / INVOICE</TableHead>
                  <TableHead>WAKTU UPLOAD</TableHead>
                  <TableHead>PERUSAHAAN</TableHead>
                  <TableHead>STATUS INVOICE</TableHead>
                  <TableHead className="text-right">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex max-w-64 flex-col gap-1.5">
                        <strong className="text-xs font-medium">
                          {entry.invoiceCount} invoice{' '}
                          <span className="font-normal text-muted-foreground">
                            · {entry.id.slice(0, 8)}
                          </span>
                        </strong>
                        <span
                          className="truncate text-xs text-muted-foreground"
                          title={entry.references.join(', ')}
                        >
                          {entry.references.join(', ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{dateTime(entry.createdAt)}</TableCell>
                    <TableCell>
                      {branches.find((branch) => branch.id === entry.branchId)?.name ??
                        entry.branchId}
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-72 flex-wrap gap-2">
                        {statuses.map(
                          ({ key, label, variant }) =>
                            entry.counts[key] > 0 && (
                              <Badge key={key} variant={variant}>
                                {entry.counts[key]} {label}
                              </Badge>
                            ),
                        )}
                        {entry.counts.simulation > 0 && (
                          <Badge variant="outline">{entry.counts.simulation} Simulasi</Badge>
                        )}
                        {entry.counts.local > 0 && (
                          <Badge variant="outline">{entry.counts.local} Consultation lokal</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={opening}
                          onClick={() => onOpen(entry.id)}
                          aria-label={`Buka batch ${entry.id.slice(0, 8)}`}
                        >
                          Buka
                          <ArrowRight data-icon="inline-end" />
                        </Button>
                        {entry.status === 'PREVIEW' && (
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            disabled={opening}
                            onClick={() => onDelete(entry)}
                            aria-label={`Hapus riwayat ${entry.id.slice(0, 8)}`}
                          >
                            <Trash2 data-icon="inline-start" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          !error && (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FilePenLine />
                </EmptyMedia>
                <EmptyTitle>
                  {filters.search ||
                  filters.branch ||
                  filters.dateFrom ||
                  filters.dateTo ||
                  filters.status
                    ? 'Tidak ada riwayat yang sesuai'
                    : 'Belum ada batch upload'}
                </EmptyTitle>
                <EmptyDescription>
                  Upload invoice baru atau sesuaikan filter untuk menemukan batch Anda.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (
                      filters.search ||
                      filters.branch ||
                      filters.dateFrom ||
                      filters.dateTo ||
                      filters.status
                    )
                      onFilters({
                        search: '',
                        branch: '',
                        dateFrom: '',
                        dateTo: '',
                        status: '',
                        page: 1,
                      });
                    else onUpload();
                  }}
                >
                  {filters.search ||
                  filters.branch ||
                  filters.dateFrom ||
                  filters.dateTo ||
                  filters.status
                    ? 'Reset filter'
                    : 'Mulai upload'}
                </Button>
              </EmptyContent>
            </Empty>
          )
        )}
        {data && (
          <ImportPagination
            label="Halaman riwayat"
            page={filters.page}
            total={data.total}
            pageSize={10}
            onPage={(page) => onFilters({ ...filters, page })}
            disabled={busy || opening}
          />
        )}
      </Card>
    </section>
  );
}
