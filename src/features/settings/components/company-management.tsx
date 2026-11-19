'use client';

import { useCallback, useState } from 'react';
import { Building2, Plus, Settings2, Trash2 } from 'lucide-react';
import { Loading } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { usePolledResource } from '@/hooks/use-polled-resource';
import {
  createCompany,
  deleteCompany,
  listCompanies,
  type ManagedCompany,
} from '../services/settings.service';

const noPolling = () => false;

export function CompanyManagement({
  onChanged,
  onConfigure,
}: {
  onChanged: () => Promise<void>;
  onConfigure: (id: string) => void;
}) {
  const fetcher = useCallback((signal: AbortSignal) => listCompanies(signal), []);
  const {
    data,
    busy: loading,
    error: loadError,
    load,
  } = usePolledResource({
    fetcher,
    shouldPoll: noPolling,
    fallback: 'Daftar perusahaan gagal dimuat.',
  });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState<ManagedCompany | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function changed() {
    await load();
    await onChanged();
  }
  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle>Daftar perusahaan</CardTitle>
            <CardDescription>Kelola perusahaan dan koneksi Accurate masing-masing.</CardDescription>
          </div>
          <Button
            className="self-start sm:self-auto"
            onClick={() => {
              setName('');
              setError('');
              setAdding(true);
            }}
          >
            <Plus data-icon="inline-start" /> Tambah perusahaan
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-5" aria-busy={loading}>
          {notice && (
            <Alert variant="success" role="status">
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}
          {loadError && (
            <Alert variant="destructive">
              <AlertDescription className="flex-wrap items-center justify-between">
                <span>{loadError}</span>
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  Coba lagi
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {!data && !loadError && <Loading />}
          {data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada perusahaan. Tambahkan perusahaan untuk mulai mengatur integrasi.
            </p>
          )}
          {data?.map((company) => (
            <div
              key={company.id}
              className="flex min-w-0 flex-col items-stretch gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Building2 className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="flex min-w-0 flex-col gap-2">
                  <strong className="break-words text-sm font-medium">{company.name}</strong>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        company.connection.hasApiToken && company.connection.hasSignatureSecret
                          ? 'success'
                          : 'secondary'
                      }
                    >
                      {company.connection.hasApiToken && company.connection.hasSignatureSecret
                        ? 'Kredensial tersimpan'
                        : 'Belum diatur'}
                    </Badge>
                    <Badge variant="outline">
                      {company.connection.enabled ? 'Koneksi aktif' : 'Koneksi nonaktif'}
                    </Badge>
                  </div>
                  {company.deleteReason && (
                    <p className="text-xs text-muted-foreground">{company.deleteReason}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigure(company.id)}
                  aria-label={`Atur koneksi ${company.name}`}
                >
                  <Settings2 data-icon="inline-start" /> Atur koneksi
                </Button>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  disabled={!company.canDelete || busy}
                  aria-label={`Hapus perusahaan ${company.name}`}
                  onClick={() => {
                    setTarget(company);
                    setConfirmation('');
                    setError('');
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog
        open={adding}
        onOpenChange={(open) => {
          if (!busy) setAdding(open);
        }}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Tambah perusahaan</DialogTitle>
            <DialogDescription>
              Setelah ditambahkan, isi koneksi Accurate, pilih tujuan perusahaan, lalu atur akun
              penerimaannya.
            </DialogDescription>
          </DialogHeader>
          <form
            className="gap-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy || !name.trim()) return;
              setBusy(true);
              setError('');
              setNotice('');
              try {
                const created = await createCompany(name.trim());
                setAdding(false);
                setNotice(`${created.name} berhasil ditambahkan. Lanjutkan melalui Atur koneksi.`);
                await changed();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'Perusahaan gagal ditambahkan.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="new-company-name">Nama perusahaan</FieldLabel>
                <Input
                  id="new-company-name"
                  autoComplete="organization"
                  value={name}
                  maxLength={100}
                  required
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setAdding(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? 'Menambahkan…' : 'Tambah perusahaan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open && !busy) setTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus perusahaan?</AlertDialogTitle>
            <AlertDialogDescription>
              Perusahaan beserta koneksi dan mapping lokalnya akan dihapus. Transaksi pada Accurate
              tetap tersimpan. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="delete-company-confirmation">Ketik nama perusahaan</FieldLabel>
              <Input
                id="delete-company-confirmation"
                value={confirmation}
                autoComplete="off"
                disabled={busy}
                maxLength={100}
                onChange={(event) => setConfirmation(event.target.value)}
                aria-describedby="delete-company-hint"
              />
              <FieldDescription id="delete-company-hint">
                Masukkan <strong>{target?.name}</strong> persis seperti yang tertulis untuk
                mengonfirmasi.
              </FieldDescription>
            </Field>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={busy || !target || confirmation.trim() !== target.name}
              onClick={async () => {
                if (!target || busy || confirmation.trim() !== target.name) return;
                setBusy(true);
                setError('');
                setNotice('');
                try {
                  await deleteCompany(target.id, confirmation.trim());
                  setTarget(null);
                  setNotice(`${target.name} berhasil dihapus.`);
                  await changed();
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : 'Perusahaan gagal dihapus.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Menghapus…' : 'Hapus perusahaan'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
