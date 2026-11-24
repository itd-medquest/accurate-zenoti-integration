'use client';

import { useId, useState, useRef } from 'react';
import { UserPlus, Loader2, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { createAccurateCustomer, prepareAccurateCustomer } from '../services/accurate.service';
import type { AccurateMaster, CustomerPreparation } from '../types/accurate';

export function CreateAccurateCustomer({
  batchId,
  rowId,
  version,
  initialName,
  disabled,
  onSelect,
}: {
  batchId: string;
  rowId: string;
  version: number;
  initialName: string;
  disabled?: boolean;
  onSelect: (id: string) => Promise<void>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [plan, setPlan] = useState<CustomerPreparation | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [created, setCreated] = useState<AccurateMaster | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const [preparedVersion, setPreparedVersion] = useState(version);

  async function prepare() {
    const current = ++generation.current;
    setLoading(true);
    setPlan(null);
    setError('');
    setAttempted(false);
    try {
      const result = await prepareAccurateCustomer(batchId, rowId, version);
      if (current === generation.current) {
        setPlan(result);
        setPreparedVersion(version);
      }
    } catch (error) {
      if (current === generation.current)
        setError(error instanceof Error ? error.message : 'Data Accurate belum dapat dimuat.');
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  async function save() {
    if (!plan || inFlight.current) return;
    inFlight.current = true;
    setConfirm(false);
    setSaving(true);
    setError('');
    try {
      let customer = created;
      if (!customer) {
        setAttempted(true);
        customer = await createAccurateCustomer(batchId, rowId, {
          requestId: plan.requestId,
          version: preparedVersion,
          databaseId: plan.databaseId,
          customerNo: plan.customerNo,
          name: name.trim().replace(/\s+/g, ' '),
        });
        setCreated(customer);
      }
      await onSelect(customer.id);
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Customer belum dapat disimpan.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  function changeOpen(next: boolean) {
    if (inFlight.current) return;
    setOpen(next);
    if (next && !attempted && !created) {
      setName(initialName);
      void prepare();
    }
    if (!next) {
      generation.current++;
      setLoading(false);
    }
  }
  const readonly = (label: string, value: string, suffix: string) => (
    <Field>
      <FieldLabel htmlFor={`${id}-${suffix}`}>{label}</FieldLabel>
      <Input id={`${id}-${suffix}`} value={value} readOnly />
    </Field>
  );
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
        <p className="text-sm text-muted-foreground">
          Customer belum ditemukan? Tambahkan data baru di Accurate.
        </p>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={disabled}>
            <UserPlus data-icon="inline-start" />
            Tambah customer
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={!saving}
      >
        <DialogHeader className="shrink-0 border-b border-border p-5 pr-12">
          <DialogTitle>Tambah customer Accurate</DialogTitle>
          <DialogDescription>
            Periksa nama dan data default sebelum membuat customer baru.
          </DialogDescription>
        </DialogHeader>
        <form
          className="min-h-0 flex-1 gap-0"
          onSubmit={(event) => {
            event.preventDefault();
            if (!plan || saving || !name.trim()) return;
            if (attempted || created) void save();
            else setConfirm(true);
          }}
        >
          <div
            className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5"
            aria-busy={loading || saving}
          >
            {loading && (
              <div
                role="status"
                aria-label="Memeriksa nomor MPA dan master Accurate"
                className="flex flex-col gap-4"
              >
                <Skeleton className="h-12 w-full motion-reduce:animate-none" />
                <Skeleton className="h-44 w-full motion-reduce:animate-none" />
                <p className="text-sm text-muted-foreground">
                  Memeriksa nomor MPA terakhir dan master Accurate…
                </p>
              </div>
            )}
            {plan && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{plan.databaseName}</Badge>
                  <Badge variant="success">
                    <CheckCircle2 aria-hidden="true" />
                    Default terverifikasi
                  </Badge>
                </div>
                <FieldGroup>
                  <FieldSet disabled={saving} className="min-w-0 p-0">
                    <FieldLegend className="p-0">Umum</FieldLegend>
                    <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor={`${id}-name`}>Nama customer</FieldLabel>
                        <Input
                          id={`${id}-name`}
                          autoComplete="off"
                          value={name}
                          required
                          maxLength={100}
                          readOnly={attempted || !!created}
                          onChange={(event) => setName(event.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`${id}-number`}>ID pelanggan</FieldLabel>
                        <Input
                          id={`${id}-number`}
                          value={plan.customerNo}
                          readOnly
                          className="tabular-nums"
                        />
                        <FieldDescription>
                          Otomatis dari nomor MPA terbesar. Diperiksa kembali saat menyimpan.
                        </FieldDescription>
                      </Field>
                      {readonly('Kategori', plan.defaults.categoryName, 'category')}
                      {readonly('Dipakai di cabang', plan.defaults.branchName, 'branch')}
                      {readonly(
                        'Mata uang utama',
                        `${plan.defaults.currencyName} (${plan.defaults.currencyCode})`,
                        'currency',
                      )}
                    </FieldGroup>
                  </FieldSet>
                  <FieldSet disabled={saving} className="min-w-0 p-0">
                    <FieldLegend className="p-0">Penjualan</FieldLegend>
                    <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {readonly('Kategori harga', plan.defaults.priceCategoryName, 'price')}
                      {readonly('Kategori diskon', plan.defaults.discountCategoryName, 'discount')}
                      {readonly('Syarat pembayaran', plan.defaults.termName, 'term')}
                    </FieldGroup>
                  </FieldSet>
                </FieldGroup>
                <Alert variant={created ? 'success' : 'info'} role="status">
                  <Info aria-hidden="true" />
                  <AlertTitle>
                    {created
                      ? `Customer ${created.code} sudah dibuat`
                      : 'Customer langsung dibuat di Accurate'}
                  </AlertTitle>
                  <AlertDescription>
                    {created
                      ? 'Customer tidak akan dibuat ulang. Gunakan tombol di bawah untuk menyimpan mapping invoice.'
                      : 'Hanya data Umum dan Penjualan di atas yang dikirim. Invoice tetap berupa draft hingga Anda submit.'}
                  </AlertDescription>
                </Alert>
              </>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Belum dapat dilanjutkan</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!loading && !created && (
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => void prepare()}
                >
                  {plan ? 'Muat ulang nomor dan default' : 'Coba muat ulang'}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="m-0 shrink-0 rounded-none p-5">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => changeOpen(false)}
            >
              Tutup
            </Button>
            <Button
              type="submit"
              disabled={loading || saving || !plan || !name.trim() || !!disabled}
            >
              {saving ? (
                <Loader2
                  data-icon="inline-start"
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <UserPlus data-icon="inline-start" />
              )}
              {created
                ? 'Gunakan customer'
                : attempted
                  ? 'Periksa hasil'
                  : 'Buat dan gunakan customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buat customer di Accurate?</AlertDialogTitle>
            <AlertDialogDescription>
              Customer {name.trim()} dengan ID {plan?.customerNo} akan langsung disimpan di Accurate
              dan digunakan pada invoice ini. Pengiriman invoice tetap menunggu submit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction onClick={() => void save()}>Ya, buat customer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
