'use client';
import { Loading } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordForm } from '@/features/auth/components/password-form';
import { getSettings, updateBranch } from '@/features/settings/services/settings.service';
import { type Settings } from '@/features/settings/types';
import { AccurateConnection } from './accurate-connection';
import { AccurateDestinations } from './accurate-destinations';
import { CompanyManagement } from './company-management';
import { ReceiptAccountSettings } from '@/features/receipts/components/receipt-account-settings';
import { type Branch } from '@/types';
import {
  ArrowRight,
  Building2,
  Clock3,
  Database,
  KeyRound,
  PlugZap,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
export function SettingsView({
  branches,
  run,
  reload,
}: {
  branches: Branch[];
  run: (task: () => Promise<unknown>, message: string) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState('connections');
  const [selectedCompany, setSelectedCompany] = useState('');
  const companyId = selectedCompany || branches[0]?.id;
  const companyBranches = branches.filter((branch) => branch.id === companyId);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setSettings(null);
    setError('');
    getSettings(companyId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setSettings(value);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Pengaturan gagal dimuat.');
      });
    return () => controller.abort();
  }, [companyId]);
  if (error)
    return (
      <Alert
        className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 warning"
        role="alert"
        variant="destructive"
      >
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!settings) return <Loading />;
  return (
    <Tabs value={tab} onValueChange={setTab} className="settings-view min-w-0 gap-6">
      <TabsList
        aria-label="Pengaturan integrasi"
        className="h-auto! w-full flex-wrap justify-start gap-1 p-1.5 sm:w-fit"
      >
        {[
          { id: 'connections', label: 'Koneksi integrasi', icon: PlugZap },
          { id: 'companies', label: 'Perusahaan', icon: Building2 },
          { id: 'branches', label: 'Tujuan perusahaan', icon: Building2 },
          { id: 'receipts', label: 'Akun penerimaan', icon: Building2 },
          { id: 'security', label: 'Keamanan akun', icon: KeyRound },
        ].map(({ id, label, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="min-h-10 flex-auto gap-2 px-4 py-2 sm:flex-none"
          >
            <Icon aria-hidden="true" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tab !== 'companies' && tab !== 'security' && (
        <Field className="max-w-md">
          <FieldLabel htmlFor="settings-company">Perusahaan yang diatur</FieldLabel>
          <SelectField
            id="settings-company"
            value={companyId ?? ''}
            onValueChange={setSelectedCompany}
            disabled={!branches.length}
          >
            {branches.map((branch) => (
              <SelectFieldOption key={branch.id} value={branch.id}>
                {branch.name}
              </SelectFieldOption>
            ))}
          </SelectField>
        </Field>
      )}
      <TabsContent value="companies">
        <CompanyManagement
          onChanged={async () => {
            await reload();
            setSelectedCompany('');
          }}
          onConfigure={(id) => {
            setSelectedCompany(id);
            setTab('connections');
          }}
        />
      </TabsContent>
      <TabsContent value="connections" className="flex flex-col gap-6 data-[state=inactive]:hidden">
        <AccurateConnection
          key={companyId ?? 'legacy'}
          branchId={companyId}
          settings={settings}
          run={run}
          refresh={async () => setSettings(await getSettings(companyId))}
        />
        <Card>
          <CardHeader className="items-start">
            <div>
              <CardTitle>Perilaku sinkronisasi</CardTitle>
              <CardDescription>Ringkasan alur pemrosesan invoice di ruang kerja.</CardDescription>
            </div>
            <ShieldCheck className="size-5 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pb-5">
            <dl className="m-0 grid gap-5 sm:grid-cols-2">
              {[
                ['Mode pengiriman', settings.mode === 'live' ? 'Aktual' : 'Simulasi'],
                ['Transaksi tujuan', 'Faktur Penjualan'],
                ['Harga item', 'Nilai akhir termasuk pajak'],
                ['Zona waktu', 'Asia/Jakarta (WIB)'],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="m-0 text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <Alert variant="info">
              <Clock3 />
              <AlertDescription>
                <p>
                  Sumber invoice adalah upload PDF atau Excel. Accounting memeriksa preview lalu
                  menekan Submit sebelum worker memproses antrean. API Zenoti tidak diperlukan.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="branches" className="flex flex-col gap-6 data-[state=inactive]:hidden">
        <AccurateDestinations key={companyId} branches={companyBranches} />
        {settings.accurate.mode === 'simulation' && (
          <Card>
            <CardHeader className="items-start">
              <div>
                <CardTitle>Mapping simulasi lokal</CardTitle>
                <CardDescription>
                  Pengaturan data simulasi. Tujuan aktual dikelola secara terpisah di atas.
                </CardDescription>
              </div>
              <Database className="size-5 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent className="flex flex-col gap-6 pb-5">
              {companyBranches.map((b) => (
                <BranchForm key={b.id} branch={b} run={run} reload={reload} />
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>
      <TabsContent value="security">
        <PasswordForm run={run} />
      </TabsContent>
      <TabsContent value="receipts">
        <ReceiptAccountSettings key={companyId} branches={companyBranches} />
      </TabsContent>
    </Tabs>
  );
}
function BranchForm({
  branch: b,
  run,
  reload,
}: {
  branch: Branch;
  run: (task: () => Promise<unknown>, message: string) => Promise<void>;
  reload: () => void;
}) {
  const [name, setName] = useState(b.name);
  const [database, setDatabase] = useState(b.accurateDatabaseId);
  const [target, setTarget] = useState(b.accurateBranchId);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="min-w-0"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await run(async () => {
          await updateBranch(b.id, {
            name,
            accurateDatabaseId: database,
            accurateBranchId: target,
          });
          reload();
        }, 'Mapping cabang disimpan.');
        setBusy(false);
      }}
    >
      <FieldGroup>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
          <span>{b.centerId}</span>
          <ArrowRight size={20} />
          <span>{b.accurateBranchId}</span>
        </div>
        <FieldGroup className="grid gap-4 lg:grid-cols-3">
          <Field>
            <FieldLabel className="flex w-full flex-col items-stretch gap-2">
              Nama perusahaan tujuan
              <Input value={name} required onChange={(e) => setName(e.target.value)} />
            </FieldLabel>
          </Field>
          <Field>
            <FieldLabel className="flex w-full flex-col items-stretch gap-2">
              ID database Accurate
              <Input value={database} required onChange={(e) => setDatabase(e.target.value)} />
            </FieldLabel>
          </Field>
          <Field>
            <FieldLabel className="flex w-full flex-col items-stretch gap-2">
              ID cabang Accurate
              <Input value={target} required onChange={(e) => setTarget(e.target.value)} />
            </FieldLabel>
          </Field>
        </FieldGroup>
        <p className="text-xs text-muted-foreground">
          Mapping tujuan dikunci setelah cabang memiliki invoice untuk mencegah transaksi terkirim
          ke tujuan berbeda.
        </p>
        <Button className="self-start" disabled={busy} variant="default">
          <Save size={16} data-icon="inline-start" /> Simpan mapping
        </Button>
      </FieldGroup>
    </form>
  );
}
