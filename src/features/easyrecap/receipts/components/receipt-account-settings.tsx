'use client';

import { useEffect, useId, useState } from 'react';
import { Check, Info, Pencil, Search, Save, Settings2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatReceiptRate, parseReceiptRate } from '../lib/rates';
import type { Branch } from '@/types';
import {
  getReceiptConfiguration,
  saveReceiptMapping,
  searchReceiptAccounts,
} from '../services/receipts.service';
import {
  methodLabels,
  type ReceiptAccount,
  type ReceiptBank,
  type ReceiptConfiguration,
  type ReceiptMapping,
  type ReceiptMethod,
} from '../types';

function AccountPicker({
  kind,
  label,
  value,
  persistedId,
  onChange,
  branchId,
}: {
  kind: 'bank' | 'fee';
  branchId: string;
  label: string;
  value: ReceiptAccount | null;
  persistedId?: string | null;
  onChange: (value: ReceiptAccount) => void;
}) {
  const id = useId();
  const [editing, setEditing] = useState(!value);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReceiptAccount[] | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function find(nextPage = 1) {
    setBusy(true);
    setError('');
    try {
      const result = await searchReceiptAccounts(kind, search, nextPage, branchId);
      setRows(result.items);
      setPage(nextPage);
      setSelected('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pencarian akun gagal.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Field
      className="min-w-0 gap-3 rounded-lg border border-border p-4"
      aria-labelledby={`${id}-label`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editing ? (
          <FieldLabel id={`${id}-label`} htmlFor={`${id}-search`}>
            {label}
          </FieldLabel>
        ) : (
          <FieldTitle id={`${id}-label`}>{label}</FieldTitle>
        )}
        {value && !editing && (
          <Badge variant={value.id === persistedId ? 'success' : 'secondary'}>
            {value.id === persistedId ? (
              <>
                <Check data-icon="inline-start" /> Tersimpan
              </>
            ) : (
              'Dipilih · belum disimpan'
            )}
          </Badge>
        )}
      </div>
      {value && !editing ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <strong className="break-words text-sm font-medium">{value.name}</strong>
            <span className="break-words text-xs text-muted-foreground">{value.code}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil data-icon="inline-start" />
            Ubah
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <InputGroup className="min-w-0 flex-1">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                id={`${id}-search`}
                value={search}
                placeholder="Cari kode atau nama akun Accurate"
                disabled={busy}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void find();
                  }
                }}
              />
            </InputGroup>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void find()}>
              {busy ? 'Mencari…' : 'Cari'}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Batal
              </Button>
            )}
          </div>
          {rows && (
            <>
              <SelectField
                aria-label={`Hasil pencarian ${label.toLowerCase()}`}
                value={selected}
                onValueChange={setSelected}
                disabled={busy || !rows.length}
              >
                <SelectFieldOption value="">
                  {rows.length ? 'Pilih akun yang sesuai' : 'Tidak ada hasil'}
                </SelectFieldOption>
                {rows.map((row) => (
                  <SelectFieldOption key={row.id} value={row.id}>
                    {row.code} · {row.name}
                  </SelectFieldOption>
                ))}
              </SelectField>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy || page === 1}
                    onClick={() => void find(page - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-xs text-muted-foreground">Halaman {page}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy || rows.length < 20}
                    onClick={() => void find(page + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !selected}
                  onClick={() => {
                    const choice = rows.find((row) => row.id === selected);
                    if (choice) {
                      onChange(choice);
                      setEditing(false);
                    }
                  }}
                >
                  Gunakan akun
                </Button>
              </div>
            </>
          )}
          <FieldDescription>
            {kind === 'bank'
              ? 'Pilih akun kas/bank aktif dalam IDR.'
              : 'Pilih akun beban administrasi yang diizinkan di Accurate.'}
          </FieldDescription>
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </Field>
  );
}

function MappingForm({
  previous,
  branchId,
  bank,
  method,
  defaultRateBps,
  onSaved,
}: {
  previous?: ReceiptMapping;
  branchId: string;
  bank: ReceiptBank;
  method: ReceiptMethod;
  defaultRateBps: number;
  onSaved: (mapping: ReceiptMapping) => void;
}) {
  const [account, setAccount] = useState<ReceiptAccount | null>(
    previous
      ? {
          id: previous.accountId,
          code: previous.accountNo,
          name: previous.accountName,
          type: 'CASH_BANK',
        }
      : null,
  );
  const [fee, setFee] = useState<ReceiptAccount | null>(
    previous?.feeAccountId
      ? {
          id: previous.feeAccountId,
          code: previous.feeAccountNo ?? '',
          name: previous.feeAccountName ?? '',
          type: 'EXPENSE',
        }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rate, setRate] = useState(formatReceiptRate(previous?.rateBps ?? defaultRateBps));
  const rateBps = parseReceiptRate(rate);
  const needsFee = method !== 'BANK_TRANSFER' || (rateBps ?? 0) > 0;
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!account || busy || rateBps === null) return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
          const saved = await saveReceiptMapping({
            branchId,
            bank,
            method,
            accountId: account.id,
            feeAccountId: needsFee ? (fee?.id ?? null) : null,
            rateBps,
            version: previous?.version ?? 0,
          });
          onSaved(saved);
          setNotice('Mapping akun berhasil disimpan.');
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Mapping gagal disimpan.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <FieldGroup className="gap-5">
        <Field data-invalid={rateBps === null} className="max-w-sm">
          <FieldLabel htmlFor="receipt-default-rate">Tarif bank default</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="receipt-default-rate"
              inputMode="decimal"
              value={rate}
              disabled={busy}
              aria-invalid={rateBps === null}
              aria-describedby="receipt-default-rate-help"
              onChange={(event) => setRate(event.target.value)}
            />
            <InputGroupAddon align="inline-end">%</InputGroupAddon>
          </InputGroup>
          <FieldDescription id="receipt-default-rate-help">
            {rateBps === null
              ? 'Isi tarif 0 - 99,99%, maksimal dua angka desimal.'
              : null}
          </FieldDescription>
        </Field>
        <FieldGroup className="grid items-start gap-4 lg:grid-cols-2">
          <AccountPicker
            branchId={branchId}
            kind="bank"
            label="Akun kas/bank penerima"
            value={account}
            persistedId={previous?.accountId}
            onChange={setAccount}
          />
          {needsFee && (
            <AccountPicker
              branchId={branchId}
              kind="fee"
              label="Akun biaya administrasi"
              value={fee}
              persistedId={previous?.feeAccountId}
              onChange={setFee}
            />
          )}
        </FieldGroup>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {notice && (
          <Alert variant="success" role="status">
            <Check aria-hidden="true" />
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Perubahan diterapkan setelah mapping disimpan.
          </p>
          <Button disabled={busy || !account || rateBps === null || (needsFee && !fee)}>
            <Save data-icon="inline-start" />
            {busy ? 'Menyimpan…' : 'Simpan mapping akun'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function ReceiptAccountSettings({ branches }: { branches: Branch[] }) {
  const [config, setConfig] = useState<ReceiptConfiguration | null>(null);
  const [selectedBranch, setBranch] = useState('');
  const branch = selectedBranch || branches[0]?.id || '';
  const [bank, setBank] = useState<ReceiptBank>('BCA');
  const [method, setMethod] = useState<ReceiptMethod>('CREDIT_CARD');
  const [error, setError] = useState('');
  async function load() {
    try {
      setConfig(await getReceiptConfiguration(branch));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pengaturan belum dapat dimuat.');
    }
  }
  useEffect(() => {
    void load();
  }, [branch]);
  const previous = config?.mappings.find(
    (row) => row.branchId === branch && row.bank === bank && row.method === method,
  );
  const destination = config?.destinations.find((row) => row.branchId === branch);
  return (
    <Card>
      <CardHeader className="items-start">
        <div className="min-w-0">
          <CardTitle>Akun Penerimaan Penjualan</CardTitle>
          <CardDescription>
            Mapping kas/bank dan biaya administrasi per perusahaan dan metode pembayaran.
          </CardDescription>
        </div>
        <Settings2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pb-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex-col">
              <p>{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
                Coba lagi
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {!config && !error && <Skeleton className="h-40" />}
        {config && (
          <>
            <FieldGroup className="grid gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="receipt-company">Perusahaan</FieldLabel>
                <SelectField id="receipt-company" value={branch} onValueChange={setBranch}>
                  {branches.map((row) => (
                    <SelectFieldOption key={row.id} value={row.id}>
                      {row.name}
                    </SelectFieldOption>
                  ))}
                </SelectField>
              </Field>
              <Field>
                <FieldLabel htmlFor="receipt-bank">Bank / penyedia</FieldLabel>
                <SelectField
                  id="receipt-bank"
                  value={bank}
                  onValueChange={(value) => {
                    const next = config.banks.find((row) => row === value);
                    if (next) setBank(next);
                  }}
                >
                  {config.banks.map((row) => (
                    <SelectFieldOption key={row} value={row}>
                      {row}
                    </SelectFieldOption>
                  ))}
                </SelectField>
              </Field>
              <Field>
                <FieldLabel htmlFor="receipt-method">Metode pembayaran</FieldLabel>
                <SelectField
                  id="receipt-method"
                  value={method}
                  onValueChange={(value) => {
                    const next = config.methods.find((row) => row === value);
                    if (next) setMethod(next);
                  }}
                >
                  {config.methods.map((row) => (
                    <SelectFieldOption key={row} value={row}>
                      {methodLabels[row]}
                    </SelectFieldOption>
                  ))}
                </SelectField>
              </Field>
            </FieldGroup>
            <Alert variant="info">
              <Info aria-hidden="true" />
              <AlertDescription>
                <p>
                  Biaya {bank}:{' '}
                  <strong>{formatReceiptRate(previous?.rateBps ?? config.rates[method])}%</strong>.
                  Pecahan rupiah selalu dibulatkan ke atas.
                </p>
              </AlertDescription>
            </Alert>
            <Separator />
            {!destination ? (
              <Alert variant="info">
                <AlertDescription>
                  Konfigurasikan tujuan perusahaan Accurate terlebih dahulu sebelum menyimpan
                  mapping akun.
                </AlertDescription>
              </Alert>
            ) : (
              <MappingForm
                key={`${branch}:${bank}:${method}`}
                branchId={branch}
                bank={bank}
                method={method}
                defaultRateBps={config.rates[method]}
                previous={previous}
                onSaved={(saved) =>
                  setConfig(
                    (current) =>
                      current && {
                        ...current,
                        mappings: [...current.mappings.filter((row) => row.id !== saved.id), saved],
                      },
                  )
                }
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
