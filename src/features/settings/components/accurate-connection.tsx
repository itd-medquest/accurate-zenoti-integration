'use client';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field';
import { SavedCredentialField } from './saved-credential-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { configureConnection, testConnection } from '../services/settings.service';
import type { Settings } from '../types';
import { PlugZap } from 'lucide-react';
export function AccurateConnection({
  settings,
  run,
  refresh,
  branchId,
}: {
  settings: Settings;
  run: (task: () => Promise<unknown>, message: string) => Promise<void>;
  refresh: () => Promise<void>;
  branchId?: string;
}) {
  const connection = settings.connections.find((connection) => connection.id === 'accurate');
  const [enabled, setEnabled] = useState(connection?.enabled ?? false);
  const [mode, setMode] = useState<'simulation' | 'live'>(settings.accurate.mode);
  const [apiToken, setApiToken] = useState('');
  const [signatureSecret, setSignatureSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle>Accurate Online</CardTitle>
          <CardDescription>
            Kredensial disimpan terenkripsi dan ditampilkan sebagai penanda tersamarkan.
          </CardDescription>
        </div>
        <PlugZap className="size-5 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="pb-5">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setTestMessage('');
            try {
              await run(async () => {
                await configureConnection(
                  'accurate',
                  {
                    enabled,
                    accurate: {
                      mode,
                      ...(apiToken ? { apiToken } : {}),
                      ...(signatureSecret ? { signatureSecret } : {}),
                    },
                  },
                  branchId,
                );
                setApiToken('');
                setSignatureSecret('');
                await refresh();
              }, 'Konfigurasi Accurate disimpan.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <FieldGroup>
            <Field
              orientation="horizontal"
              className="gap-3 rounded-lg border border-border bg-muted/40 p-4"
            >
              <Checkbox
                id="accurate-enabled"
                checked={enabled}
                disabled={busy}
                onCheckedChange={(value) => setEnabled(value === true)}
              />
              <FieldContent>
                <FieldLabel htmlFor="accurate-enabled">Aktifkan koneksi Accurate</FieldLabel>
                <FieldDescription>
                  Izinkan pemrosesan faktur sesuai mode pengiriman yang dipilih.
                </FieldDescription>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="accurate-mode">Mode pengiriman</FieldLabel>
              <SelectField
                id="accurate-mode"
                disabled={busy}
                value={mode}
                onValueChange={(event) => setMode(event === 'live' ? 'live' : 'simulation')}
              >
                <SelectFieldOption value="simulation">Simulasi lokal</SelectFieldOption>
                <SelectFieldOption value="live">
                  Aktual — membuat Faktur Penjualan di Accurate
                </SelectFieldOption>
              </SelectField>
              <FieldDescription>
                Pengiriman aktual berjalan setelah Finance menekan Submit pada batch yang telah
                diperiksa.
              </FieldDescription>
            </Field>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <SavedCredentialField
                id="accurate-token"
                label="API Token"
                saved={settings.accurate.hasApiToken}
                revision={settings}
                value={apiToken}
                maxLength={8000}
                disabled={busy}
                onChange={setApiToken}
              />
              <SavedCredentialField
                id="accurate-signature"
                label="Signature Secret"
                saved={settings.accurate.hasSignatureSecret}
                revision={settings}
                value={signatureSecret}
                maxLength={2000}
                disabled={busy}
                onChange={setSignatureSecret}
              />
            </FieldGroup>
            <p className="text-sm text-muted-foreground">
              Non-pajak: harga item memakai nilai akhir setelah diskon dan termasuk pajak dokumen.
              Modul ini hanya mengirim Faktur Penjualan.
            </p>
            {testMessage && (
              <p className="text-sm" role="status">
                {testMessage}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5 [&>button]:w-full sm:[&>button]:w-auto">
              <Button
                type="button"
                variant="outline"
                disabled={busy || !connection?.enabled}
                onClick={async () => {
                  setBusy(true);
                  setTestMessage('');
                  try {
                    await run(async () => {
                      const result = await testConnection('accurate', branchId);
                      setTestMessage(result.message);
                    }, 'Pengujian koneksi selesai.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Uji koneksi tersimpan
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Memproses…' : 'Simpan koneksi'}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
