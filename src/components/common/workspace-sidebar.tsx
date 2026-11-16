'use client';
import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Settings, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from './brand-logo';
import { ModuleSwitch, type ModuleId } from './module-switch';
import { cn } from '@/lib/cn';
import type { Actor } from '@/types';
import type { View } from '@/types/navigation';

export function WorkspaceSidebar({
  actor,
  collapsed,
  mobile,
  activeModule,
  view,
  items,
  onModuleChange,
  onNavigate,
  onCloseMobile,
}: {
  actor: Actor;
  collapsed: boolean;
  mobile: boolean;
  activeModule: ModuleId;
  view: View;
  items: { id: View; label: string; icon: LucideIcon }[];
  onModuleChange: (module: ModuleId) => void;
  onNavigate: (view: View) => void;
  onCloseMobile: () => void;
}) {
  useEffect(() => {
    if (!mobile) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="menu"], [role="dialog"]')) {
        onCloseMobile();
        document.querySelector<HTMLButtonElement>('[aria-label="Buka navigasi"]')?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [mobile, onCloseMobile]);
  const labelClass = cn(
    'min-w-0 overflow-hidden text-left transition-opacity duration-150 motion-reduce:transition-none',
    collapsed && 'min-[761px]:hidden',
  );
  const link = (item: { id: View; label: string; icon: LucideIcon }) => {
    const Icon = item.icon;
    const [primary, secondary] = item.label.split(' (');
    return (
      <Button
        key={item.id}
        aria-label={item.label}
        title={item.label}
        aria-current={view === item.id ? 'page' : undefined}
        className={cn(
          'nav-item h-12 w-full justify-start gap-3 overflow-hidden px-3',
          collapsed &&
            'min-[761px]:mx-auto min-[761px]:size-12 min-[761px]:justify-center min-[761px]:gap-0 min-[761px]:p-0',
          view === item.id && 'active',
        )}
        size={collapsed ? 'icon' : 'default'}
        variant="ghost"
        onClick={() => onNavigate(item.id)}
      >
        <Icon data-icon="inline-start" />
        <span className={cn(labelClass, 'flex-1')}>
          <span className="block w-48 truncate">{primary}</span>
          {secondary && <small className="block w-48 truncate">({secondary}</small>}
        </span>
      </Button>
    );
  };
  return (
    <aside
      id="workspace-sidebar"
      data-collapsed={collapsed}
      aria-label="Navigasi utama"
      className={cn(
        'sidebar fixed top-3 bottom-0 left-3 z-30 flex w-[var(--sidebar-width)] flex-col overflow-x-hidden overflow-y-auto overscroll-contain rounded-tl-[28px] border-r border-surface-border bg-control/20 px-3 pt-5 pb-5 transition-[width,transform] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none mobile:inset-y-0 mobile:left-0 mobile:w-[min(288px,calc(100vw-32px))] mobile:-translate-x-full mobile:rounded-l-none mobile:rounded-r-3xl mobile:bg-background mobile:pt-[max(1.25rem,env(safe-area-inset-top))] mobile:pb-[max(1.25rem,env(safe-area-inset-bottom))]',
        mobile && 'mobile-open mobile:translate-x-0',
      )}
    >
      <div
        className={cn(
          'relative mb-6 flex h-12 shrink-0 items-center px-3',
          collapsed && 'min-[761px]:justify-center min-[761px]:px-0',
        )}
      >
        <a
          href="/"
          aria-label="intgrte beranda"
          className={cn(
            'relative inline-flex h-12 w-28 shrink-0 items-center',
            collapsed && 'min-[761px]:size-12 min-[761px]:justify-center',
          )}
        >
          <BrandLogo
            className={cn(
              'w-28 transition-opacity duration-150 motion-reduce:transition-none',
              collapsed &&
                'min-[761px]:pointer-events-none min-[761px]:absolute min-[761px]:opacity-0',
            )}
          />
          <BrandLogo
            variant="logogram"
            decorative
            className={cn(
              'absolute inset-0 m-auto size-7 opacity-0 transition-opacity duration-150 motion-reduce:transition-none',
              collapsed && 'min-[761px]:opacity-100',
            )}
          />
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto hidden mobile:inline-flex"
          aria-label="Tutup navigasi"
          onClick={onCloseMobile}
        >
          <X data-icon="inline-start" />
        </Button>
      </div>
      <ModuleSwitch value={activeModule} onChange={onModuleChange} collapsed={collapsed} />
      <div
        className={cn('mb-3 h-3 px-3 text-[10px] font-medium text-muted-foreground', labelClass)}
      >
        Ruang kerja
      </div>
      <nav aria-label="Menu modul">{items.map(link)}</nav>
      {actor.role === 'super_admin' && (
        <>
          <div
            className={cn(
              'mb-3 mt-7 h-3 px-3 text-[10px] font-medium text-muted-foreground',
              labelClass,
            )}
          >
            Pengaturan
          </div>
          <nav aria-label="Pengaturan akun" className={cn(collapsed && 'min-[761px]:mt-4')}>
            {link({ id: 'settings', label: 'Settings', icon: Settings })}
            {link({ id: 'audit', label: 'Audit Log', icon: ShieldCheck })}
          </nav>
        </>
      )}
    </aside>
  );
}
