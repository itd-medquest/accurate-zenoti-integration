'use client';

import { CalendarDays, MapPin } from 'lucide-react';
import { Loading } from '@/components/ui';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { useWorkspace } from '@/components/common/workspace-context';
import { Overview } from '../dashboard/components/overview';

export function EasyRecapDashboardFilters() {
  const { branch, setBranch, days, setDays, branches } = useWorkspace();
  return (
    <>
      <div className="dashboard-toolbar">
        <div className="filter-bar flex items-center gap-2.25 mb-5.5 mobile:gap-2 mobile:flex-wrap mobile:mb-4.5">
          <SelectField
            variant="pill"
            icon={<MapPin />}
            className="w-auto min-w-40 mobile:flex-1 mobile:basis-36"
            aria-label="Filter cabang"
            value={branch}
            onValueChange={setBranch}
          >
            <SelectFieldOption value="">Semua cabang</SelectFieldOption>
            {branches.map((branch) => (
              <SelectFieldOption key={branch.id} value={branch.id}>
                {branch.name}
              </SelectFieldOption>
            ))}
          </SelectField>
          <SelectField
            variant="pill"
            icon={<CalendarDays />}
            className="w-auto min-w-40 mobile:flex-1 mobile:basis-36"
            aria-label="Filter periode"
            value={days}
            onValueChange={setDays}
          >
            <SelectFieldOption value="7">7 hari terakhir</SelectFieldOption>
            <SelectFieldOption value="30">30 hari terakhir</SelectFieldOption>
            <SelectFieldOption value="90">90 hari terakhir</SelectFieldOption>
            <SelectFieldOption value="365">1 tahun terakhir</SelectFieldOption>
          </SelectField>
        </div>
      </div>
    </>
  );
}

export function EasyRecapDashboardPage() {
  const { dashboard, loaded, error, openInvoice, navigate, operate } = useWorkspace();
  return (
    <>
      {!loaded && !error && <Loading />}
      {loaded && dashboard && (
        <Overview
          data={dashboard}
          onInvoice={openInvoice}
          onNavigate={navigate}
          canUpload={operate}
        />
      )}
    </>
  );
}
