'use client';
import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldTitle, FieldDescription } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { CheckCircle2, Pencil, Search, Loader2 } from 'lucide-react';
import { searchAccurateMasters } from '../services/accurate.service';
import type { AccurateMaster } from '../types/accurate';

export function AccurateMasterPicker({
  kind,
  label,
  initialSearch = '',
  selected,
  disabled,
  onSelect,
  emptyAction,
  branchId,
  draftSelection = false,
}: {
  kind: 'customer' | 'item' | 'branch';
  branchId?: string;
  label: string;
  initialSearch?: string;
  selected?: { code: string; name: string; unitName?: string };
  disabled?: boolean;
  onSelect: (id: string, master: AccurateMaster) => Promise<void>;
  draftSelection?: boolean;
  emptyAction?: (onSaved: () => void) => ReactNode;
}) {
  const id = useId();
  const [search, setSearch] = useState(initialSearch);
  const [results, setResults] = useState<AccurateMaster[] | null>(null);
  const [choice, setChoice] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const searching = !selected || editing;
  async function find(nextPage = 1) {
    setBusy(true);
    setError('');
    try {
      const result = await searchAccurateMasters(kind, search, nextPage, branchId);
      setResults(result.items);
      setChoice('');
      setPage(nextPage);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Pencarian gagal.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Field className="gap-3 rounded-lg border border-border p-4" aria-labelledby={`${id}-label`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {searching ? (
          <FieldLabel id={`${id}-label`} htmlFor={`${id}-search`}>
            {label}
          </FieldLabel>
        ) : (
          <FieldTitle id={`${id}-label`}>{label}</FieldTitle>
        )}
        {selected && (
          <Badge variant={draftSelection ? 'info' : 'success'}>
            <CheckCircle2 aria-hidden="true" />
            {draftSelection ? 'Pilihan baru' : 'Tersimpan'}
          </Badge>
        )}
      </div>
      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <strong className="break-words text-sm font-medium">{selected.name}</strong>
            <span className="break-words text-xs text-muted-foreground">
              {selected.code}
              {selected.unitName ? ` · Satuan: ${selected.unitName}` : ''}
            </span>
          </div>
          {!editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || disabled}
              aria-label={`Ubah ${label}`}
              onClick={() => {
                setEditing(true);
                setError('');
                setResults(null);
                setChoice('');
              }}
            >
              <Pencil data-icon="inline-start" />
              Ubah
            </Button>
          )}
        </div>
      )}
      {searching && (
        <>
          <div className="flex flex-wrap gap-2">
            <Input
              id={`${id}-search`}
              aria-invalid={!!error}
              aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
              value={search}
              maxLength={100}
              placeholder="Cari nama atau kode di Accurate"
              className="min-w-0 flex-1"
              disabled={busy || disabled}
              onChange={(event) => {
                setSearch(event.target.value);
                setResults(null);
                setChoice('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void find();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy || disabled}
              onClick={() => find()}
            >
              {busy ? (
                <Loader2
                  className="animate-spin motion-reduce:animate-none"
                  data-icon="inline-start"
                />
              ) : (
                <Search data-icon="inline-start" />
              )}
              Cari
            </Button>
          </div>
          {results && (
            <>
              <SelectField
                aria-label={`Hasil pencarian ${label}`}
                value={choice}
                disabled={busy || disabled}
                onValueChange={(event) => setChoice(event)}
              >
                <SelectFieldOption value="">
                  {results.length ? 'Pilih data Accurate' : 'Tidak ada hasil'}
                </SelectFieldOption>
                {results.map((master) => (
                  <SelectFieldOption key={master.id} value={master.id}>
                    {master.code} · {master.name}
                  </SelectFieldOption>
                ))}
              </SelectField>
              {results.length === 0 &&
                page === 1 &&
                emptyAction?.(() => {
                  setEditing(false);
                  setResults(null);
                  setChoice('');
                  setError('');
                })}
              {(results.length > 0 || page > 1) && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || disabled || page === 1}
                    onClick={() => find(page - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-xs text-muted-foreground">Halaman {page}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || disabled || results.length < 20}
                    onClick={() => find(page + 1)}
                  >
                    Berikutnya
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="ml-auto"
                    disabled={!choice || busy || disabled}
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        const master = results.find((item) => item.id === choice);
                        if (!master)
                          throw new Error('Pilih hasil pencarian Accurate terlebih dahulu.');
                        await onSelect(choice, master);
                        setResults(null);
                        setChoice('');
                        setEditing(false);
                      } catch (error) {
                        setError(
                          error instanceof Error ? error.message : 'Mapping gagal disimpan.',
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {draftSelection ? 'Gunakan pilihan' : 'Simpan pilihan'}
                  </Button>
                </div>
              )}
            </>
          )}
          <FieldDescription id={`${id}-help`}>
            {draftSelection
              ? 'Pilihan Accurate akan disimpan bersama item baru.'
              : selected
                ? 'Pilihan tersimpan tetap digunakan sampai Anda berhasil menyimpan penggantinya.'
                : 'Cari data Accurate, pilih hasil yang sesuai, lalu simpan pilihan.'}
          </FieldDescription>
          {selected && (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || disabled}
                onClick={() => {
                  setEditing(false);
                  setResults(null);
                  setChoice('');
                  setError('');
                }}
              >
                Batal mengubah
              </Button>
            </div>
          )}
        </>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </Field>
  );
}
