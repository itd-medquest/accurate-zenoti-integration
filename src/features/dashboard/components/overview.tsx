'use client';
import { EmptyState, StatusBadge } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Dashboard } from '@/features/dashboard/types';
import { type Invoice } from '@/features/invoices/types';
import { dateOnly, dateTime, money } from '@/lib/format';
import type { View } from '@/types/navigation';
import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  Database,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatCard } from './stat-card';
export function Overview({
  data,
  onInvoice,
  onNavigate,
  canUpload,
}: {
  data: Dashboard;
  onInvoice: (invoice: Invoice) => void;
  onNavigate: (view: View) => void;
  canUpload: boolean;
}) {
  const s = data.summary;
  const ringRate = Math.min(100, Math.max(0, Number.isFinite(data.rate) ? data.rate : 0));
  return (
    <>
      <div className="stats-grid grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-4 mb-5.25 wide:gap-5.25 compact:gap-2.75 tablet:grid-cols-2 mobile:grid-cols-[repeat(2,_minmax(0,_1fr))] mobile:mb-4.25">
        <StatCard
          label="Total invoice"
          value={s.total}
          hint="Invoice unik dalam periode"
          kind="total"
        />
        <StatCard
          label="Berhasil tersinkron"
          value={s.synced}
          hint="Hasil pengiriman telah tersimpan"
          kind="synced"
        />
        <StatCard
          label="Sedang diproses"
          value={s.processing}
          hint={`${s.pending} invoice masih menunggu`}
          kind="processing"
        />
        <StatCard
          label="Butuh perhatian"
          value={s.failed}
          hint="Gagal & perlu ditinjau"
          kind="failed"
        />
      </div>
      <div className="dashboard-main-grid grid grid-cols-[minmax(0,_1fr)_288px] gap-5 mb-5.25 wide:grid-cols-[minmax(0,_1fr)_340px] compact:grid-cols-[minmax(0,_1fr)_245px] compact:gap-3.75 tablet:grid-cols-[minmax(0,_1fr)] mobile:gap-4.25 mobile:mb-4.25">
        <Card className="panel overflow-hidden chart-panel">
          <CardHeader className="panel-head flex items-center justify-between py-5 px-5.25 gap-3.75 wide:p-5.75 compact:py-4.5 compact:px-4.25">
            <div>
              <CardTitle>Aktivitas sinkronisasi</CardTitle>
              <CardDescription>Distribusi invoice berdasarkan tanggal sumber</CardDescription>
            </div>
            <span className="small-tag inline-flex items-center text-[10px] border border-solid border-line rounded-[5px] py-1 px-2 text-muted-foreground whitespace-nowrap">
              Harian
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="chart-legend flex gap-4.75 py-0 px-5.5 text-[10px] text-muted-foreground">
              <span>
                <i className="legend-dot inline-block w-1.5 h-1.5 rounded-full shrink-0 purple bg-primary" />
                Total invoice
              </span>
              <span>
                <i className="legend-dot inline-block w-1.5 h-1.5 rounded-full shrink-0 green bg-[#48af91]" />
                Tersinkron
              </span>
            </div>
            <div className="trend-chart h-53 w-full pt-2.5 pr-3.75 pb-0 pl-3.75 min-w-0 wide:h-59.25 mobile:h-50">
              {data.trend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.trend}
                    margin={{ top: 10, right: 10, bottom: 0, left: -25 }}
                  >
                    <defs>
                      <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-total)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--chart-total)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--chart-grid)"
                      strokeDasharray="4 5"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => dateOnly(d).split(' ').slice(0, 2).join(' ')}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--muted)' }}
                      minTickGap={28}
                      dy={9}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    />
                    <Tooltip
                      labelFormatter={(d) => dateOnly(String(d))}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid var(--line)',
                        background: 'var(--popover)',
                        color: 'var(--foreground)',
                        fontSize: 12,
                      }}
                    />
                    <Area
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="total"
                      name="Total invoice"
                      stroke="var(--chart-total)"
                      strokeWidth={2.5}
                      fill="url(#totalFill)"
                    />
                    <Area
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="synced"
                      name="Tersinkron"
                      stroke="var(--chart-synced)"
                      strokeWidth={2.5}
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
            <div className="chart-foot flex items-center gap-1.75 mt-3.25 mr-5.25 mb-4 ml-5.25 text-[10px] text-muted-foreground mobile:text-[9px]">
              <ShieldCheck size={15} />
              <span>Satu invoice dihitung satu kali, meskipun pernah di-retry.</span>
            </div>
          </CardContent>
        </Card>
        <Card className="panel overflow-hidden health-panel">
          <CardHeader className="panel-head flex items-center justify-between py-5 px-5.25 gap-3.75 wide:p-5.75 compact:py-4.5 compact:px-4.25">
            <div>
              <CardTitle>Kesehatan integrasi</CardTitle>
              <CardDescription>Keberhasilan dalam periode terpilih</CardDescription>
            </div>
            <span className="live-dot inline-block h-1.5 w-1.5 bg-[#53b696] rounded-full shadow-[0_0_0_3px_#53b69612] shrink-0" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 p-0 tablet:grid-cols-[140px_minmax(0,1fr)] tablet:items-center tablet:gap-5 tablet:px-5 tablet:pb-5 mobile:grid-cols-[112px_minmax(0,1fr)] mobile:gap-3 mobile:px-4">
            <div
              className="progress-ring relative mx-auto my-5 size-44 rounded-full p-3 chart-health-entrance tablet:my-0 tablet:size-32 tablet:p-2.5 mobile:size-28"
              style={{ '--ring-offset': 1 - ringRate / 100 } as React.CSSProperties}
              role="img"
              aria-label={`Keberhasilan sinkronisasi ${data.rate}%`}
            >
              <svg
                className="health-ring-svg absolute inset-0 w-full h-full [transform:rotate(135deg)] overflow-visible"
                viewBox="0 0 180 180"
                aria-hidden="true"
                focusable="false"
              >
                <circle
                  cx="90"
                  cy="90"
                  r="84"
                  fill="none"
                  stroke="var(--chart-grid)"
                  strokeWidth="12"
                />
                <circle
                  className="health-ring-arc"
                  cx="90"
                  cy="90"
                  r="84"
                  fill="none"
                  stroke="var(--chart-total)"
                  strokeWidth="12"
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - ringRate / 100}
                />
              </svg>
              <div>
                <strong>
                  {data.rate}
                  <small>%</small>
                </strong>
                <span>berhasil tersinkron</span>
              </div>
            </div>
            <div className="health-breakdown flex min-w-0 flex-col gap-3 px-5 pb-5 tablet:p-0">
              <span>
                <i className="legend-dot inline-block w-1.5 h-1.5 rounded-full shrink-0 green bg-[#48af91]" />
                Tersinkron<strong>{s.synced}</strong>
              </span>
              <span>
                <i className="legend-dot inline-block w-1.5 h-1.5 rounded-full shrink-0 purple bg-primary" />
                Menunggu / diproses<strong>{s.pending + s.processing}</strong>
              </span>
              <span>
                <i className="legend-dot inline-block w-1.5 h-1.5 rounded-full shrink-0 orange bg-[#d9a365]" />
                Butuh perhatian<strong>{s.failed}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="dashboard-bottom-grid grid grid-cols-[minmax(0,_1fr)_288px] gap-5 mb-5.25 wide:grid-cols-[minmax(0,_1fr)_340px] compact:grid-cols-[minmax(0,_1fr)_245px] compact:gap-3.75 tablet:grid-cols-[minmax(0,_1fr)] mobile:gap-4.25 mobile:mb-4.25">
        <Card className="panel overflow-hidden activity-panel">
          <CardHeader className="panel-head flex items-center justify-between py-5 px-5.25 gap-3.75 wide:p-5.75 compact:py-4.5 compact:px-4.25">
            <div>
              <CardTitle>Invoice terbaru</CardTitle>
              <CardDescription>Diurutkan menurut pembaruan terakhir</CardDescription>
            </div>
            {canUpload && (
              <Button
                className="inline-flex items-center whitespace-nowrap"
                onClick={() => onNavigate('imports')}
                variant="ghost"
              >
                Riwayat upload <ArrowRight size={15} data-icon="inline-start" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="table-scroll overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>INVOICE / CUSTOMER</TableHead>
                    <TableHead>JUMLAH</TableHead>
                    <TableHead>STATUS INTEGRASI</TableHead>
                    <TableHead>PEMBARUAN</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Button
                          className="invoice-link"
                          onClick={() => onInvoice(i)}
                          variant="link"
                        >
                          {i.number}
                        </Button>
                        <span className="cell-sub block mt-1.25 text-[10px] text-muted-foreground">
                          {i.customer}
                        </span>
                      </TableCell>
                      <TableCell className="amount font-semibold whitespace-nowrap tabular-nums">
                        {money(i.total)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={i.syncStatus} />
                      </TableCell>
                      <TableCell className="muted text-muted-foreground small text-[11px]">
                        {dateTime(i.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          className="icon-button inline-flex items-center justify-center mobile:min-w-8.5"
                          aria-label={`Detail ${i.number}`}
                          onClick={() => onInvoice(i)}
                          variant="ghost"
                          size="icon"
                        >
                          <ArrowRight size={16} data-icon="inline-start" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!data.recent.length && <EmptyState />}
            </div>
          </CardContent>
        </Card>
        <div className="side-panels flex flex-col gap-4 tablet:grid tablet:grid-cols-[1fr_1fr] tablet:gap-3.75 mobile:gap-3">
          <Card className="panel overflow-hidden invoice-breakdown">
            <CardHeader className="panel-head flex items-center justify-between py-5 px-5.25 gap-3.75 wide:p-5.75 compact:py-4.5 compact:px-4.25">
              <CardTitle>Komposisi invoice</CardTitle>
              <FileText size={18} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="breakdown-row flex items-center justify-between py-2.75 px-5.25 text-[11px] text-muted-foreground tablet:py-2 tablet:px-4.25 mobile:py-2 mobile:px-3 mobile:text-[10px]">
                <span>
                  <span className="type-icon flex items-center justify-center h-6.25 w-6.25 rounded-[7px] bg-success-soft text-muted-foreground mobile:h-5 mobile:w-5">
                    <Check size={14} />
                  </span>
                  Closed invoices
                </span>
                <strong>{s.closed}</strong>
              </div>
              <div className="breakdown-row flex items-center justify-between py-2.75 px-5.25 text-[11px] text-muted-foreground tablet:py-2 tablet:px-4.25 mobile:py-2 mobile:px-3 mobile:text-[10px]">
                <span>
                  <span className="type-icon flex items-center justify-center h-6.25 w-6.25 rounded-[7px] bg-success-soft text-muted-foreground mobile:h-5 mobile:w-5 amber">
                    <Clock3 size={14} />
                  </span>
                  Unclosed invoices
                </span>
                <strong>{s.open}</strong>
              </div>
              <div className="outstanding border-t border-solid border-t-line mt-2.5 mr-5 mb-0 ml-5 pt-3.75 pr-0 pb-4.25 pl-0 flex flex-col gap-1.5 tablet:pb-3.5 mobile:mt-2.5 mobile:mr-3 mobile:mb-0 mobile:ml-3 mobile:pt-3.25">
                <span>Total outstanding</span>
                <strong>{money(s.outstanding)}</strong>
              </div>
            </CardContent>
          </Card>
          <section className="connection-card bg-success-soft border border-solid border-border rounded-[12px] p-4.25 flex gap-2.5 items-start text-muted-foreground compact:p-3.5 tablet:items-center mobile:p-3.25 mobile:flex-col mobile:items-start mobile:justify-center mobile:gap-3">
            <div className="connection-card-icon flex bg-success-soft rounded-[7px] p-1.75 mobile:p-2">
              <Database size={19} />
            </div>
            <div>
              <strong>Siap untuk diperiksa Finance</strong>
              <p>
                {data.integrationMode === 'live'
                  ? 'Faktur aktual diverifikasi melalui pembacaan kembali dari Accurate.'
                  : 'Transaksi simulasi disimpan secara lokal.'}
              </p>
            </div>
          </section>
        </div>
      </div>
      {data.errors.length > 0 && (
        <Card className="panel overflow-hidden exception-panel mt-0 mr-0 mb-5.25 ml-0">
          <CardHeader className="panel-head flex items-center justify-between py-5 px-5.25 gap-3.75 wide:p-5.75 compact:py-4.5 compact:px-4.25">
            <div>
              <CardTitle>
                <CircleAlert size={17} /> Perlu perhatian Anda
              </CardTitle>
              <CardDescription>
                Periksa penyebab sebelum menjalankan sinkronisasi kembali.
              </CardDescription>
            </div>
            {canUpload && (
              <Button
                className="inline-flex items-center whitespace-nowrap"
                onClick={() => onNavigate('imports')}
                variant="ghost"
              >
                Periksa upload <ArrowRight size={15} data-icon="inline-start" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {data.errors.map((e, i) => (
              <div
                className="exception-row flex justify-between items-center gap-3.75 py-3 px-5.25 border-t border-solid border-t-border text-[11px] text-muted-foreground mobile:py-3.25 mobile:px-4.25 mobile:text-[10px]"
                key={i}
              >
                <span>{e.message}</span>
                <span className="small-tag inline-flex items-center text-[10px] border border-solid border-line rounded-[5px] py-1 px-2 text-muted-foreground whitespace-nowrap">
                  {e.count} invoice
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
