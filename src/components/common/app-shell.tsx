'use client';
import { WorkspaceSidebar } from './workspace-sidebar';
import { AccountMenu } from './account-menu';
import { ThemeToggle } from './theme-toggle';
import { DashboardGreeting } from '@/features/dashboard/components/dashboard-greeting';
import { useWorkspaceSidebar } from '@/hooks/use-workspace-sidebar';
import { BrandLogo } from '@/components/common/brand-logo';
import { type ModuleId } from '@/components/common/module-switch';
import { Loading } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { Toast } from '@/components/ui/toast';
import { AuditView } from '@/features/audit/components/audit-view';
import { Login } from '@/features/auth/components/login';
import { PasswordForm } from '@/features/auth/components/password-form';
import { useSession } from '@/features/auth/hooks/use-session';
import { signOut } from '@/features/auth/services/auth.service';
import { Overview } from '@/features/dashboard/components/overview';
import { useDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { useJakartaClock } from '@/features/dashboard/hooks/use-jakarta-clock';
import { greetingAt } from '@/features/dashboard/utils/greeting';
import { CommandComingSoon } from '@/features/command/components/command-coming-soon';
import { NotificationMenu } from '@/features/notifications/components/notification-menu';
import { NotificationsView } from '@/features/notifications/components/notifications';
import { ImportsView } from '@/features/imports/components/imports';
import { ReceiptsView } from '@/features/receipts/components/receipts';
import { InvoiceDetail } from '@/features/invoices/components/invoice-detail';
import {
  getInvoice,
  resolveMapping,
  syncInvoice,
} from '@/features/invoices/services/invoices.service';
import { type Detail, type Invoice } from '@/features/invoices/types';
import { SettingsView } from '@/features/settings/components/settings';
import { listBranches } from '@/features/settings/services/settings.service';
import { UsersView } from '@/features/users/components/users';
import { cn } from '@/lib/cn';
import { type Branch } from '@/types';
import type { View } from '@/types/navigation';
import {
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  CircleAlert,
  LayoutDashboard,
  MapPin,
  Menu,
  FileText,
  Receipt,
  UploadCloud,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
const views: Record<
  View,
  {
    label: string;
    title: string;
    description: string;
  }
> = {
  imports: {
    label: 'Faktur Penjualan (Invoices)',
    title: 'Faktur Penjualan.',
    description: 'Pantau riwayat invoice dan kelola pengiriman Faktur Penjualan ke Accurate.',
  },
  dashboard: {
    label: 'Dashboard',
    title: 'Dashboard',
    description: 'Ringkasan integrasi Zenoti & Accurate dalam satu ruang kerja.',
  },
  receipts: {
    label: 'Penerimaan Penjualan (Receipt)',
    title: 'Penerimaan Penjualan.',
    description: 'Faktur yang telah tersimpan di Accurate sebagai dasar pencatatan penerimaan.',
  },
  users: {
    label: 'User Management',
    title: 'Tim yang terhubung.',
    description: 'Kelola anggota ruang kerja dan hak akses sesuai tanggung jawabnya.',
  },
  settings: {
    label: 'Settings',
    title: 'Atur alur integrasi Anda.',
    description: 'Kelola koneksi, mapping cabang, dan keamanan akun.',
  },
  audit: {
    label: 'Audit Log',
    title: 'Setiap tindakan, tercatat.',
    description: 'Telusuri aktivitas operasional dan perubahan konfigurasi.',
  },
  account: {
    label: 'Akun Saya',
    title: 'Keamanan akun Anda.',
    description: 'Perbarui password untuk menjaga akses ruang kerja.',
  },
  notifications: {
    label: 'Notifikasi',
    title: 'Notifikasi Anda.',
    description: 'Pantau status invoice dan hal yang membutuhkan perhatian.',
  },
};
export function AppShell() {
  const { actor, setActor, checking, authError, setAuthError, checkAuth } = useSession();
  const [activeModule, setActiveModule] = useState<ModuleId>('recap');
  const [view, setView] = useState<View>('dashboard');
  const [mobile, setMobile] = useState(false);
  const { collapsed, toggle: toggleSidebar, mainRef } = useWorkspaceSidebar();
  const closeMobile = useCallback(() => setMobile(false), []);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState('');
  const [days, setDays] = useState('30');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useJakartaClock();
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const requestRef = useRef(0);
  const contentRef = useRef<HTMLElement>(null);
  const { dashboard, setDashboard, loaded, load } = useDashboard({
    actor,
    view,
    branch,
    days,
    setError,
    requestRef,
    enabled: activeModule === 'recap',
  });
  const admin = actor?.role === 'super_admin';
  const operate = admin || actor?.role === 'finance';
  useEffect(() => {
    const expire = () => {
      ++requestRef.current;
      setActor(null);
      setDetail(null);
      setDashboard(null);
      setView('dashboard');
      setActiveModule('recap');
      setAuthError('Sesi Anda berakhir atau akses berubah. Silakan masuk kembali.');
    };
    window.addEventListener('imp:session-expired', expire);
    return () => window.removeEventListener('imp:session-expired', expire);
  }, []);
  useEffect(() => {
    if (!actor) return;
    listBranches()
      .then(setBranches)
      .catch((e) => setError(e.message));
  }, [actor]);
  const closeDetail = useCallback(() => setDetail(null), []);
  useEffect(() => {
    if (!detail || detail.syncStatus !== 'PROCESSING') return;
    const timer = setInterval(() => {
      getInvoice(detail.id)
        .then(setDetail)
        .catch(() => {});
    }, 1800);
    return () => clearInterval(timer);
  }, [detail?.id, detail?.syncStatus]);
  async function run(task: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await task();
      setToast({ text: message, error: false });
      await load();
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Tindakan gagal.', error: true });
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: View) {
    if (['imports', 'receipts', 'users'].includes(next)) setActiveModule('recap');
    setView(next);
    setMobile(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }
  async function logout() {
    setBusy(true);
    try {
      const result = await signOut();
      if (result.error) throw new Error('Gagal keluar.');
      ++requestRef.current;
      setActor(null);
      setDashboard(null);
      setDetail(null);
      setView('dashboard');
      setActiveModule('recap');
      setMobile(false);
      setError('');
      setAuthError('');
      setToast({ text: 'Anda telah keluar.', error: false });
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : 'Gagal keluar.', error: true });
    } finally {
      setBusy(false);
    }
  }
  async function openInvoice(i: Invoice) {
    await run(async () => setDetail(await getInvoice(i.id)), 'Detail invoice dimuat.');
  }
  async function sync(id: string) {
    await run(async () => {
      await syncInvoice(id);
      if (detail?.id === id) setDetail(await getInvoice(id));
    }, 'Invoice masuk antrean. Status akan diperbarui otomatis.');
  }
  if (checking)
    return (
      <div className="boot min-h-screen flex flex-col items-center justify-center">
        <BrandLogo />
        <Loading />
      </div>
    );
  if (!actor)
    return (
      <>
        {authError && (
          <div
            className="connection-error py-3 px-5 bg-destructive/10 text-warning-foreground text-[12px] fixed top-0 left-0 right-0 z-100 text-center mobile:text-[10px] mobile:py-2.25 mobile:px-3.5"
            role="alert"
          >
            {authError}{' '}
            <Button onClick={checkAuth} variant="ghost">
              Coba lagi
            </Button>
          </div>
        )}
        <Login onSuccess={checkAuth} />
      </>
    );
  const nav: {
    id: View;
    icon: typeof LayoutDashboard;
  }[] =
    activeModule === 'command'
      ? [{ id: 'dashboard', icon: LayoutDashboard }]
      : [
          { id: 'dashboard', icon: LayoutDashboard },
          ...(operate ? [{ id: 'imports' as const, icon: UploadCloud }] : []),
          ...(operate ? [{ id: 'receipts' as const, icon: Receipt }] : []),
          ...(admin ? [{ id: 'users' as const, icon: Users }] : []),
        ];
  return (
    <div
      data-sidebar-collapsed={collapsed}
      className="app-shell flex overflow-hidden [--sidebar-width:280px] data-[sidebar-collapsed=true]:[--sidebar-width:80px] mobile:[--sidebar-width:0px] mobile:data-[sidebar-collapsed=true]:[--sidebar-width:0px]"
    >
      {mobile && (
        <div
          className="sidebar-overlay hidden mobile:block mobile:fixed mobile:inset-0 mobile:z-25 mobile:bg-[#302a4355] mobile:[backdrop-filter:blur(2px)]"
          onClick={() => setMobile(false)}
        />
      )}
      <WorkspaceSidebar
        actor={actor}
        collapsed={collapsed}
        mobile={mobile}
        activeModule={activeModule}
        view={view}
        items={nav.map((item) => ({ ...item, label: views[item.id].label }))}
        onNavigate={navigate}
        onCloseMobile={closeMobile}
        onModuleChange={(module) => {
          setActiveModule(module);
          setDetail(null);
          setError('');
          navigate('dashboard');
        }}
      />
      <div
        ref={mainRef}
        className="main-shell ml-[var(--sidebar-width)] flex h-full min-h-0 w-[calc(100%_-_var(--sidebar-width))] min-w-0 flex-col mobile:ml-0 mobile:w-full"
      >
        <header className="topbar h-18.25 shrink-0 py-0 px-8.75 border-b border-solid border-b-line bg-control flex items-center justify-between gap-5 wide:py-0 wide:px-11.25 compact:py-0 compact:px-6 mobile:h-15.25 mobile:py-0 mobile:px-4.5">
          <div className="breadcrumb flex min-w-0 flex-1 items-center gap-3 text-[11px] whitespace-nowrap mobile:text-[10px] mobile:gap-2.25">
            <Button
              className="icon-button items-center justify-center mobile:min-w-8.5 mobile-menu hidden mobile:inline-flex mobile:-ml-1.25 mobile:-mr-0.75"
              aria-label="Buka navigasi"
              aria-controls="workspace-sidebar"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
              variant="ghost"
              size="icon"
            >
              <Menu size={21} data-icon="inline-start" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mobile:hidden"
              aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
              aria-expanded={!collapsed}
              aria-controls="workspace-sidebar"
              onClick={toggleSidebar}
            >
              {collapsed ? (
                <PanelLeftOpen data-icon="inline-start" />
              ) : (
                <PanelLeftClose data-icon="inline-start" />
              )}
            </Button>
            <span>{activeModule === 'command' ? 'Command' : 'Easy Recap'}</span>
            <span className="breadcrumb-slash text-muted-foreground mobile:hidden">/</span>
            <strong className="min-w-0 truncate">{views[view].label}</strong>
          </div>
          <div className="topbar-right flex items-center gap-4.5 compact:gap-3 mobile:gap-2.25">
            <span className="topbar-date text-[10px] text-muted-foreground tablet:hidden">
              {new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
              }).format(now ?? new Date())}
            </span>
            <ThemeToggle />
            <NotificationMenu
              actorId={actor.id}
              onAll={() => navigate('notifications')}
              onInvoice={openInvoice}
            />
            <AccountMenu
              actor={actor}
              busy={busy}
              onAccount={() => navigate('account')}
              onSignOut={() => void logout()}
            />
          </div>
        </header>
        <main
          ref={contentRef}
          className="workspace-content"
          tabIndex={0}
          aria-label="Konten ruang kerja"
        >
          {view !== 'imports' && (
            <div
              className={cn(
                'page-heading flex justify-between gap-5 items-center mb-5.75 wide:mb-7 compact:items-start compact:gap-2.5 tablet:flex-wrap',
                view === 'dashboard' && 'dashboard-heading',
              )}
            >
              <div>
                <h1>
                  {activeModule === 'command' && view === 'dashboard'
                    ? 'Dashboard eksekutif'
                    : view === 'dashboard'
                      ? `${now ? greetingAt(now) : 'Selamat datang'} - ${actor.name} 👋`
                      : views[view].title}
                </h1>
                <p>
                  {activeModule === 'command' && view === 'dashboard' ? (
                    'Ruang untuk insight dan ringkasan kinerja bisnis Anda.'
                  ) : view === 'dashboard' ? (
                    <DashboardGreeting />
                  ) : (
                    views[view].description
                  )}
                </p>
              </div>
              {view === 'dashboard' && operate && activeModule === 'recap' && (
                <div className="heading-actions flex flex-wrap justify-center gap-3 pt-5 mobile:w-full mobile:gap-2">
                  <Button
                    className="button inline-flex items-center justify-center whitespace-nowrap secondary"
                    disabled={busy}
                    onClick={() => navigate('imports')}
                    variant="outline"
                  >
                    <FileText data-icon="inline-start" />
                    <span>Faktur Penjualan</span>
                  </Button>
                  <Button
                    className="button inline-flex items-center justify-center whitespace-nowrap primary"
                    disabled={busy}
                    onClick={() => navigate('receipts')}
                    variant="default"
                  >
                    <Receipt data-icon="inline-start" /> Penerimaan Penjualan
                  </Button>
                </div>
              )}
            </div>
          )}
          {view === 'dashboard' && activeModule === 'recap' && (
            <div className="dashboard-toolbar">
              <div className="filter-bar flex items-center gap-2.25 mb-5.5 mobile:gap-2 mobile:flex-wrap mobile:mb-4.5">
                <SelectField
                  variant="pill"
                  icon={<MapPin />}
                  className="w-auto min-w-40 mobile:flex-1 mobile:basis-36"
                  aria-label="Filter cabang"
                  value={branch}
                  onValueChange={(e) => {
                    setBranch(e);
                  }}
                >
                  <SelectFieldOption value="">Semua cabang</SelectFieldOption>
                  {branches.map((b) => (
                    <SelectFieldOption key={b.id} value={b.id}>
                      {b.name}
                    </SelectFieldOption>
                  ))}
                </SelectField>
                <SelectField
                  variant="pill"
                  icon={<CalendarDays />}
                  className="w-auto min-w-40 mobile:flex-1 mobile:basis-36"
                  aria-label="Filter periode"
                  value={days}
                  onValueChange={(e) => {
                    setDays(e);
                  }}
                >
                  <SelectFieldOption value="7">7 hari terakhir</SelectFieldOption>
                  <SelectFieldOption value="30">30 hari terakhir</SelectFieldOption>
                  <SelectFieldOption value="90">90 hari terakhir</SelectFieldOption>
                  <SelectFieldOption value="365">1 tahun terakhir</SelectFieldOption>
                </SelectField>
                <div className="filter-meta flex items-center gap-1.5 ml-auto text-[10px] text-muted-foreground mobile:w-full mobile:mt-1.25 mobile:mr-0 mobile:mb-0 mobile:ml-0">
                  <span className="live-dot inline-block h-1.5 w-1.5 bg-[#53b696] rounded-full shadow-[0_0_0_3px_#53b69612] shrink-0" />{' '}
                  Pembaruan otomatis · WIB
                </div>
              </div>
            </div>
          )}
          {error && (
            <Alert
              className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 warning"
              role="alert"
              variant="destructive"
            >
              <AlertDescription>
                <CircleAlert size={19} />
                <p>{error}</p>
                <Button
                  className="inline-flex items-center whitespace-nowrap"
                  onClick={load}
                  variant="ghost"
                >
                  Coba lagi
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {view === 'dashboard' && activeModule === 'command' && (
            <CommandComingSoon
              onDashboard={() => {
                setActiveModule('recap');
                navigate('dashboard');
              }}
            />
          )}
          {view === 'dashboard' && activeModule === 'recap' && !loaded && !error && <Loading />}
          {loaded && view === 'dashboard' && activeModule === 'recap' && dashboard && (
            <Overview
              data={dashboard}
              onInvoice={openInvoice}
              onNavigate={navigate}
              canUpload={operate}
            />
          )}
          {view === 'imports' && operate && (
            <ImportsView
              branches={branches}
              onConfigure={admin ? () => navigate('settings') : undefined}
            />
          )}
          {view === 'receipts' && operate && (
            <ReceiptsView
              branches={branches}
              onConfigure={admin ? () => navigate('settings') : undefined}
              onInvoice={(id) =>
                void run(async () => setDetail(await getInvoice(id)), 'Detail invoice dimuat.')
              }
            />
          )}
          {view === 'settings' && admin && (
            <SettingsView
              branches={branches}
              run={run}
              reload={() =>
                listBranches()
                  .then(setBranches)
                  .catch((e) => setError(e.message))
              }
            />
          )}
          {view === 'users' && admin && <UsersView actor={actor} run={run} />}
          {view === 'audit' && admin && <AuditView />}
          {view === 'account' && <PasswordForm run={run} />}
          {view === 'notifications' && (
            <NotificationsView actorId={actor.id} onInvoice={openInvoice} />
          )}
          <footer className="page-footer pt-6 pr-0 pb-5.5 pl-0 border-t border-solid border-t-border flex items-center justify-between gap-3.75 mt-7 text-[8px] text-muted-foreground mobile:mt-6 mobile:text-[7px] mobile:gap-2">
            <div className="flex items-center gap-3">
              <BrandLogo className="w-16" />
            </div>
            <span>
              <ShieldCheck size={13} /> Secured Platform
            </span>
          </footer>
        </main>
      </div>
      {detail && (
        <InvoiceDetail
          invoice={detail}
          close={closeDetail}
          operate={operate}
          admin={admin}
          busy={busy}
          sync={sync}
          fix={(id) =>
            run(async () => {
              await resolveMapping(id);
              setDetail(await getInvoice(id));
            }, 'Mapping simulasi diperbaiki. Invoice siap di-retry.')
          }
        />
      )}
      {toast && (
        <Toast
          message={toast.text}
          error={toast.error}
          duration={6500}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
