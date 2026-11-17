'use client';
import { EmptyState, Modal, StatusBadge } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { ImportPagination } from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Toast } from '@/components/ui/toast';
import { ImportDeliveryNotice } from './import-delivery-notice';
import { AccurateMappingPanel } from './accurate-mapping-panel';
import { ImportValidationNotice } from './import-validation-notice';
import { RedemptionNotice } from './redemption-notice';
import { chargeableItems, isFullRedemption, isLocalOnlyInvoice } from '../utils/redemption';
import { AddImportItem } from '@/features/imports/components/add-import-item';
import { EditableImportItem } from '@/features/imports/components/editable-import-item';
import { PackageDetailNotice } from '@/features/imports/components/package-detail-notice';
import { SourcePreview } from '@/features/imports/components/source-preview';
import { ImportHistoryView } from './import-history';
import { NewBatchDialog } from './new-batch-dialog';
import { ProgressiveList } from '@/components/ui/progressive-list';
import {
  getBatch,
  markReviewed,
  removeBatch,
  removeFile,
  removeItem,
  reparseFile as reparseSourceFile,
  reviewStatus,
  submitBatch,
  templateBlob,
} from '@/features/imports/services/imports.service';
import { uploadInvoiceBatch, type UploadProgress } from '@/features/imports/services/upload';
import type { Batch, History, Row, ImportHistoryFilters } from '@/features/imports/types';
import { cn } from '@/lib/cn';
import { dateOnly, dateTime, money } from '@/lib/format';
import { type Branch } from '@/types';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
export function ImportsView({
  branches,
  onConfigure,
}: {
  branches: Branch[];
  onConfigure?: () => void;
}) {
  const [uploadState, setUploadState] = useState<
    | ({
        stage: 'uploading' | 'processing' | 'failed';
      } & UploadProgress)
    | null
  >(null);
  const uploadController = useRef<AbortController | null>(null);
  useEffect(() => () => uploadController.current?.abort(), []);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<History | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [branch, setBranch] = useState(branches.find((b) => b.active)?.id ?? '');
  const [batch, setBatch] = useState<Batch | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reparseFileId, setReparseFileId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState<'history' | 'workflow'>('history');
  const [historyRevision, setHistoryRevision] = useState(0);
  const [historyFilters, setHistoryFilters] = useState<ImportHistoryFilters>({
    search: '',
    branch: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    page: 1,
  });
  function invalidateHistory() {
    setHistoryRevision((revision) => revision + 1);
  }
  useEffect(() => {
    const content = document.querySelector<HTMLElement>('main.workspace-content');
    if (content) content.scrollTop = 0;
  }, [screen]);
  const [notice, setNotice] = useState('');
  const closeNotice = useCallback(() => setNotice(''), []);
  const [drag, setDrag] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState('UNKNOWN');
  const [previouslyReviewed, setPreviouslyReviewed] = useState(false);
  const [detailPage, setDetailPage] = useState(1);
  const [sourcePage, setSourcePage] = useState(1);
  useEffect(() => {
    setDetailPage(1);
    setSourcePage(1);
  }, [detailId]);
  const input = useRef<HTMLInputElement>(null);
  const closeDetail = useCallback(() => {
    setDetailId(null);
    setEditingItemId(null);
    setDeletingItemId(null);
  }, []);
  const cancelItemDelete = useCallback(() => {
    if (!busy) {
      setDeletingItemId(null);
      setError('');
    }
  }, [busy]);
  useEffect(() => {
    if (!branch && branches.some((b) => b.active)) setBranch(branches.find((b) => b.active)!.id);
  }, [branch, branches]);
  useEffect(() => {
    if (screen !== 'workflow' || !batch || batch.status !== 'SUBMITTED') return;
    const timer = setInterval(
      () =>
        getBatch(batch.id)
          .then(setBatch)
          .catch((e) => setError(e.message)),
      4000,
    );
    return () => clearInterval(timer);
  }, [screen, batch?.id, batch?.status]);
  const eligible = batch?.rows.filter((r) => !r.errors.length && r.status !== 'CONFLICT') ?? [];
  const duplicateCount = eligible.filter((r) => r.status === 'DUPLICATE').length;
  const localSaveCount = eligible.filter(
    (r) => r.status !== 'DUPLICATE' && isLocalOnlyInvoice(r.candidate),
  ).length;
  const newInvoiceCount = eligible.length - duplicateCount - localSaveCount;
  const localOnlyBatch =
    batch?.mode === 'local' ||
    (!!batch?.rows.length && batch.rows.every((r) => isLocalOnlyInvoice(r.candidate)));
  const selection = eligible.map((r) => r.id);
  const visiblePage = Math.min(page, Math.max(1, Math.ceil((batch?.rows.length ?? 0) / pageSize)));
  const visibleRows = batch?.rows.slice((visiblePage - 1) * pageSize, visiblePage * pageSize) ?? [];
  const totalSelected =
    batch?.rows
      .filter((r) => selection.includes(r.id) && r.status !== 'DUPLICATE')
      .reduce((n, r) => n + r.candidate.total, 0) ?? 0;
  const detail = batch?.rows.find((r) => r.id === detailId);
  const itemToDelete = detail?.candidate.items.find((item) => item.id === deletingItemId);
  const previewFile = batch?.files.find((f) => f.id === previewFileId);
  const deleteFile = batch?.files.find((f) => f.id === deleteFileId);
  const failedRead = (row: Row) => !!batch?.files.find((f) => f.id === row.fileId)?.error;
  async function reparseFile(fileId: string) {
    if (!batch) return;
    await action(async () => {
      setReparseFileId(fileId);
      try {
        adopt(await reparseSourceFile(batch.id, fileId, { version: batch.version }));
        closeDetail();
        setNotice('PDF berhasil dibaca ulang. Periksa hasilnya sebelum submit.');
      } finally {
        setReparseFileId(null);
      }
    });
  }
  function inspectionComplete(row: Row) {
    return (
      !!row.candidate.accountingReviewedAt ||
      (batch?.status === 'SUBMITTED' && (!!row.invoiceId || row.status === 'DUPLICATE'))
    );
  }
  function openDetail(row: Row) {
    setEditingItemId(null);
    setDeletingItemId(null);
    setDraftStatus(row.candidate.businessStatus);
    setPreviouslyReviewed(inspectionComplete(row));
    setError('');
    setDetailId(row.id);
  }
  async function saveInspection() {
    if (!batch || !detail) return;
    if (batch.status !== 'PREVIEW') {
      closeDetail();
      return;
    }
    if (
      previouslyReviewed &&
      !window.confirm(
        'Perbarui pemeriksaan invoice ini? Jika dilanjutkan, data pemeriksaan lama akan ditimpa dengan data terbaru.',
      )
    )
      return;
    await action(async () => {
      let latest = batch;
      if (draftStatus !== detail.candidate.businessStatus) {
        latest = await reviewStatus(batch.id, detail.id, {
          version: latest.version,
          businessStatus: draftStatus,
        });
        adopt(latest);
      }
      latest = await markReviewed(batch.id, detail.id, { version: latest.version });
      adopt(latest);
      closeDetail();
      const saved = latest.rows.find((row) => row.id === detail.id);
      setNotice(
        saved && (saved.errors.length || saved.status === 'CONFLICT')
          ? 'Pemeriksaan tersimpan. Invoice belum siap dikirim; lihat alasan pada Hasil validasi.'
          : previouslyReviewed
            ? 'Pemeriksaan invoice berhasil diperbarui.'
            : 'Invoice sudah diperiksa Accounting.',
      );
    });
  }
  async function action(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Proses gagal.');
    } finally {
      setBusy(false);
    }
  }
  function adopt(next: Batch) {
    if (batch?.id !== next.id) setPage(1);
    setBatch(next);
    setScreen('workflow');
    setReviewed(false);
  }
  function addFiles(incoming: File[]) {
    const all = [...files, ...incoming];
    if (all.length > 20) {
      setError('Maksimal 20 file per batch.');
      return;
    }
    if (
      all.some((f) => f.size > 5 * 1024 * 1024) ||
      all.reduce((n, f) => n + f.size, 0) > 25 * 1024 * 1024
    ) {
      setError('Maksimal 5 MB per file dan total 25 MB per batch.');
      return;
    }
    if (all.some((f) => !/\.(pdf|xlsx)$/i.test(f.name))) {
      setError('Pilih PDF receipt Zenoti atau Excel XLSX Sales Accrual Zenoti.');
      return;
    }
    setUploadState(null);
    setFiles(all);
    setError('');
  }
  async function download(example = false) {
    await action(async () => {
      const url = URL.createObjectURL(await templateBlob(example));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${example ? 'contoh' : 'template'}-sales-accrual.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  function startNewUpload() {
    setBatch(null);
    setFiles([]);
    setReviewed(false);
    closeDetail();
    setError('');
    setNotice('');
    setUploadState(null);
    setPage(1);
    setScreen('workflow');
    document.querySelector<HTMLElement>('main.workspace-content')?.scrollTo({ top: 0 });
  }
  function returnToHistory() {
    setScreen('history');
    closeDetail();
    setError('');
    setNotice('');
  }
  return (
    <div className="imports-view">
      <div className="page-heading mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Faktur Penjualan.</h1>
          <p>Pantau riwayat invoice dan kelola pengiriman Faktur Penjualan ke Accurate.</p>
        </div>
        {screen === 'history' && (
          <Button onClick={startNewUpload} disabled={busy}>
            <UploadCloud data-icon="inline-start" />
            Upload invoice
          </Button>
        )}
      </div>
      {error && (
        <Alert
          className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 warning"
          role="alert"
          variant="destructive"
        >
          <AlertDescription>
            <AlertCircle size={19} />
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      )}
      {notice && <Toast message={notice} onClose={closeNotice} />}
      {screen === 'history' ? (
        <ImportHistoryView
          branches={branches}
          filters={historyFilters}
          onFilters={setHistoryFilters}
          revision={historyRevision}
          opening={busy}
          onDelete={setDeleteTarget}
          onOpen={(id) => void action(async () => adopt(await getBatch(id)))}
          onUpload={startNewUpload}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            {batch && (
              <NewBatchDialog
                draft={batch.status === 'PREVIEW'}
                disabled={busy}
                onConfirm={startNewUpload}
              />
            )}
            <span className="text-sm text-muted-foreground">
              Upload, periksa, lalu submit invoice Anda.
            </span>
          </div>

          <div className="import-steps grid grid-cols-[repeat(3,_1fr)] gap-3 mb-5.5 mobile:gap-1.75">
            {[
              ['1', 'Upload file', UploadCloud],
              ['2', 'Preview Accounting', Eye],
              ['3', 'Submit & pantau', Send],
            ].map(([step, label, Icon]) => {
              const I = Icon as typeof UploadCloud;
              return (
                <div
                  key={String(step)}
                  className={
                    (batch ? (batch.status === 'SUBMITTED' ? '3' : '2') : '1') === step
                      ? 'active'
                      : ''
                  }
                >
                  <span>{String(step)}</span>
                  <I size={17} />
                  <strong>{String(label)}</strong>
                </div>
              );
            })}
          </div>
          <ImportDeliveryNotice batch={batch} onConfigure={onConfigure} />
          <div className="import-batch-heading flex items-center justify-between gap-3.5 mb-4.5 flex-wrap">
            <Button variant="outline" disabled={busy} onClick={returnToHistory}>
              <ChevronLeft data-icon="inline-start" />
              Kembali ke riwayat
            </Button>
            {batch && (
              <>
                <span>
                  {dateTime(batch.createdAt)} · {batch.files.length} file · {batch.rows.length}{' '}
                  invoice
                </span>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => action(async () => adopt(await getBatch(batch.id)))}
                >
                  <RefreshCw data-icon="inline-start" /> Refresh preview
                </Button>
              </>
            )}
          </div>
          {!batch ? (
            <Card className="panel overflow-hidden import-upload-panel">
              <CardHeader className="panel-head gap-4 px-6 py-5 mobile:px-4">
                <div>
                  <CardTitle>Upload invoice dalam satu batch</CardTitle>
                  <CardDescription>
                    Pilih banyak PDF sekaligus, atau satu Excel yang berisi banyak invoice.
                  </CardDescription>
                </div>
                <FileText size={22} />
              </CardHeader>
              <CardContent className="p-0">
                <FieldGroup className="import-upload-body gap-5 px-6 pb-6 mobile:px-4 mobile:pb-4">
                  <Field className="max-w-110" data-disabled={busy}>
                    <FieldLabel htmlFor="upload-branch" className="flex-row justify-start">
                      Perusahaan tujuan
                    </FieldLabel>
                    <SelectField
                      id="upload-branch"
                      aria-label="Perusahaan tujuan upload"
                      value={branch}
                      disabled={busy}
                      onValueChange={(e) => setBranch(e)}
                    >
                      <SelectFieldOption value="">Pilih perusahaan</SelectFieldOption>
                      {branches
                        .filter((b) => b.active)
                        .map((b) => (
                          <SelectFieldOption key={b.id} value={b.id}>
                            {b.name}
                          </SelectFieldOption>
                        ))}
                    </SelectField>
                  </Field>
                  <input
                    ref={input}
                    type="file"
                    multiple
                    accept=".pdf,.xlsx"
                    className="import-file-input absolute w-0.25 h-0.25 opacity-0 overflow-hidden pointer-events-none"
                    aria-label="Pilih file invoice"
                    disabled={busy}
                    onChange={(e) => {
                      addFiles(Array.from(e.target.files ?? []));
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    className={cn(
                      'import-dropzone h-auto min-h-52 w-full flex-col items-center justify-center gap-3 px-6 py-8 text-center whitespace-normal mobile:min-h-48 mobile:px-4 mobile:py-6',
                      drag && 'dragging',
                    )}
                    aria-describedby="upload-file-limits"
                    disabled={busy}
                    onClick={() => input.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDrag(true);
                    }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDrag(false);
                      if (!busy) addFiles(Array.from(e.dataTransfer.files));
                    }}
                    variant="upload"
                  >
                    <span
                      className="import-drop-icon flex size-12 items-center justify-center rounded-xl border border-primary/15 bg-accent text-primary"
                      aria-hidden="true"
                    >
                      <UploadCloud data-icon="inline-start" />
                    </span>
                    <strong className="text-base font-semibold text-foreground mobile:text-sm">
                      Tarik file ke sini, atau klik untuk memilih
                    </strong>
                    <span
                      id="upload-file-limits"
                      className="flex max-w-md flex-col gap-1 text-xs leading-relaxed text-muted-foreground"
                    >
                      <span>PDF Zenoti / Excel XLSX · Banyak file dapat dipilih sekaligus</span>
                      <span>Maksimal 20 file · 5 MB per file · Total 25 MB</span>
                    </span>
                  </Button>
                  {!!files.length && (
                    <div
                      className={cn(
                        'import-selected-files grid max-h-60 gap-2.5 overflow-auto rounded-lg border-0 bg-transparent',
                        busy && 'is-uploading',
                      )}
                    >
                      {files.map((file, index) => (
                        <div key={`${file.name}-${index}`}>
                          <FileText size={17} />
                          <div>
                            <strong>{file.name}</strong>
                            <span>{Math.ceil(file.size / 1024)} KB</span>
                          </div>
                          <Button
                            className="icon-button inline-flex items-center justify-center mobile:min-w-8.5"
                            disabled={busy}
                            onClick={() =>
                              setFiles((current) => current.filter((_, i) => i !== index))
                            }
                            aria-label={`Hapus ${file.name}`}
                            variant="ghost"
                            size="icon"
                          >
                            <Trash2 size={16} data-icon="inline-start" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {uploadState && (
                    <Card
                      className={cn(
                        `upload-progress-panel p-4.5 mt-4.5 mobile:p-3.5 ${uploadState.stage}`,
                      )}
                      aria-live="polite"
                    >
                      <div className="upload-progress-heading flex justify-between items-center gap-3 text-[12px] text-accent-foreground mobile:text-[11px] mobile:items-start">
                        <span>
                          {uploadState.stage === 'failed' ? (
                            <AlertCircle size={18} />
                          ) : (
                            <RefreshCw
                              className="spin animate-[spin_1.3s_linear_infinite]"
                              size={18}
                            />
                          )}
                          <strong>
                            {uploadState.stage === 'processing'
                              ? 'Upload selesai. Menyiapkan preview...'
                              : uploadState.stage === 'failed'
                                ? 'Upload belum berhasil'
                                : `Mengunggah ${files.length} file...`}
                          </strong>
                        </span>
                        <span>
                          {uploadState.stage === 'processing'
                            ? 'Memeriksa data'
                            : uploadState.stage === 'failed'
                              ? 'Periksa koneksi / file'
                              : uploadState.percent !== null
                                ? `${uploadState.percent}%`
                                : 'Mengirim file'}
                        </span>
                      </div>
                      <Progress
                        className={cn(
                          `upload-progress-track h-1.75 rounded-[20px] bg-accent/60 overflow-hidden mt-3.5 mr-0 mb-2.5 ml-0 ${uploadState.stage === 'processing' || uploadState.percent === null ? 'indeterminate' : ''}`,
                        )}
                        role="progressbar"
                        aria-label={
                          uploadState.stage === 'processing'
                            ? 'Menyiapkan preview invoice'
                            : 'Progres upload file'
                        }
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={
                          uploadState.stage === 'uploading' && uploadState.percent !== null
                            ? uploadState.percent
                            : undefined
                        }
                        aria-valuetext={
                          uploadState.stage === 'processing'
                            ? 'File terkirim, menunggu hasil pemeriksaan'
                            : uploadState.stage === 'failed'
                              ? 'Upload belum berhasil'
                              : undefined
                        }
                        value={uploadState.stage === 'uploading' ? uploadState.percent : null}
                      ></Progress>
                      <p>
                        {uploadState.stage === 'processing'
                          ? 'File sudah diterima. Kami sedang membaca invoice dan memeriksa nilainya sebelum menampilkan hasil.'
                          : uploadState.stage === 'failed'
                            ? 'File pilihan tetap tersedia. Periksa riwayat sebelum mengunggah ulang.'
                            : `${Math.ceil(uploadState.loaded / 1024).toLocaleString('id-ID')} KB terkirim${uploadState.total !== null ? ' dari ' + Math.ceil(uploadState.total / 1024).toLocaleString('id-ID') + ' KB' : ''}. Mohon tunggu hingga preview siap.`}
                      </p>
                    </Card>
                  )}
                  <div className="import-upload-footer flex items-center justify-between gap-4 border-t border-border pt-5 mobile:flex-col mobile:items-stretch mobile:gap-3">
                    <div className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {files.length} file dipilih
                      </span>
                      <span>Tidak ada pengiriman sebelum submit</span>
                    </div>
                    <Button
                      className="mobile:w-full"
                      disabled={busy || !files.length || !branch}
                      onClick={() =>
                        action(async () => {
                          const form = new FormData();
                          form.append('branchId', branch);
                          for (const file of files) form.append('files', file);
                          const controller = new AbortController();
                          uploadController.current = controller;
                          setUploadState({
                            stage: 'uploading',
                            loaded: 0,
                            total: null,
                            percent: 0,
                          });
                          try {
                            const result = await uploadInvoiceBatch<Batch>(
                              form,
                              (progress) => setUploadState({ stage: 'uploading', ...progress }),
                              () =>
                                setUploadState((current) =>
                                  current
                                    ? { ...current, stage: 'processing', percent: 100 }
                                    : null,
                                ),
                              controller.signal,
                            );
                            adopt(result);
                            setUploadState(null);
                            setFiles([]);
                            invalidateHistory();
                          } catch (error) {
                            setUploadState((current) =>
                              current ? { ...current, stage: 'failed' } : null,
                            );
                            throw error;
                          } finally {
                            uploadController.current = null;
                          }
                        })
                      }
                      variant="default"
                    >
                      {busy ? (
                        <RefreshCw
                          className="spin animate-[spin_1.3s_linear_infinite]"
                          size={16}
                          data-icon="inline-start"
                        />
                      ) : (
                        <ArrowRight size={16} data-icon="inline-start" />
                      )}
                      Upload & buat preview
                    </Button>
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card
                className="panel upload-results-panel overflow-hidden mb-4.5"
                aria-label="File berhasil diunggah"
                role="region"
              >
                <CardHeader className="panel-head flex items-center justify-between py-5 px-5.25 gap-3.75 wide:p-5.75 compact:py-4.5 compact:px-4.25">
                  <div>
                    <CardTitle>Hasil upload</CardTitle>
                    <CardDescription>
                      {batch.files.length} file tersimpan. Preview dokumen sebelum memeriksa
                      invoice.
                    </CardDescription>
                  </div>
                  <span className="small-tag inline-flex items-center text-[10px] border border-solid border-line rounded-[5px] py-1 px-2 text-muted-foreground whitespace-nowrap">
                    {batch.status === 'PREVIEW'
                      ? 'DRAFT UPLOAD'
                      : localOnlyBatch
                        ? 'TERSIMPAN'
                        : 'SUDAH DISUBMIT'}
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  <ProgressiveList
                    key={batch.id}
                    className="upload-result-grid py-4.5 px-5.5 grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-3 source-stack:grid-cols-[1fr] mobile:p-3.5"
                    items={batch.files.map((file) => {
                      const rows = batch.rows.filter((row) => row.fileId === file.id),
                        needsReview = rows.some((row) => row.errors.length > 0) || !!file.error;
                      return (
                        <article
                          className={cn(
                            `upload-result-card flex gap-3 items-center p-4.25 rounded-[12px] bg-success-soft border border-solid border-border min-w-0 flex-wrap mobile:p-3.5 mobile:gap-2.5 ${file.error ? 'has-error' : needsReview ? 'needs-check' : 'ready'}`,
                          )}
                          key={file.id}
                        >
                          <div className="upload-result-icon h-11 w-11 grid place-items-center shrink-0 rounded-[12px] bg-success-soft text-success-foreground">
                            {file.format === 'XLSX' ? (
                              <FileSpreadsheet size={23} />
                            ) : (
                              <FileText size={23} />
                            )}
                          </div>
                          <div className="upload-result-copy flex-1 min-w-30">
                            <strong title={file.name}>{file.name}</strong>
                            <span>
                              {file.format} | {Math.ceil(file.size / 1024).toLocaleString('id-ID')}{' '}
                              KB | {rows.length} invoice
                            </span>
                            <p>
                              {file.error ? (
                                <>
                                  <AlertCircle size={14} /> Terunggah, data belum terbaca
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} /> Upload selesai
                                  {needsReview ? ' - Perlu review Accounting' : ''}
                                </>
                              )}
                            </p>
                          </div>
                          <div className="upload-result-actions flex gap-1.75 items-center flex-wrap source-stack:ml-auto mobile:w-full mobile:ml-13.5">
                            {file.error && file.format === 'PDF' && batch.status === 'PREVIEW' && (
                              <Button
                                className="button inline-flex items-center justify-center whitespace-nowrap secondary"
                                disabled={busy}
                                onClick={() => reparseFile(file.id)}
                                variant="outline"
                              >
                                <RefreshCw size={15} data-icon="inline-start" />
                                {reparseFileId === file.id ? 'Membaca PDF...' : 'Baca ulang'}
                              </Button>
                            )}
                            <Button
                              className="button inline-flex items-center justify-center whitespace-nowrap secondary"
                              disabled={busy}
                              onClick={() => setPreviewFileId(file.id)}
                              aria-label={`Preview file ${file.name}`}
                              variant="outline"
                            >
                              <Eye size={15} data-icon="inline-start" /> Preview
                            </Button>
                            {batch.status === 'PREVIEW' && (
                              <Button
                                className="button inline-flex items-center justify-center whitespace-nowrap upload-delete-button"
                                disabled={busy}
                                onClick={() => {
                                  setError('');
                                  setDeleteFileId(file.id);
                                }}
                                aria-label={`Hapus file ${file.name}`}
                                variant="ghost"
                              >
                                <Trash2 size={15} data-icon="inline-start" /> Hapus
                              </Button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  />
                </CardContent>
              </Card>
              <div className="import-summary-grid grid grid-cols-[repeat(4,_1fr)] gap-3.5 mb-5 mobile:grid-cols-[repeat(2,_1fr)] mobile:gap-2.5">
                <div>
                  <span>Total invoice</span>
                  <strong>{batch.rows.length}</strong>
                </div>
                <div>
                  <span>Siap dikonfirmasi</span>
                  <strong>{eligible.length}</strong>
                </div>
                <div>
                  <span>Duplikat / konflik</span>
                  <strong>
                    {batch.rows.filter((r) => ['DUPLICATE', 'CONFLICT'].includes(r.status)).length}
                  </strong>
                </div>
                <div>
                  <span>Belum siap dikirim</span>
                  <strong>
                    {batch.rows.filter((r) => r.errors.length || r.status === 'CONFLICT').length}
                  </strong>
                </div>
              </div>
              <Card className="panel overflow-hidden">
                <CardHeader className="panel-head flex items-center justify-between py-5 px-5.25 gap-3.75 wide:p-5.75 compact:py-4.5 compact:px-4.25">
                  <div>
                    <CardTitle>
                      {batch.status === 'SUBMITTED'
                        ? localOnlyBatch
                          ? 'Hasil penyimpanan batch'
                          : 'Hasil pengiriman batch'
                        : localOnlyBatch
                          ? 'Preview sebelum penyimpanan'
                          : 'Preview sebelum pengiriman'}
                    </CardTitle>
                    <CardDescription>
                      {branches.find((b) => b.id === batch.branchId)?.name ?? batch.branchId} ·
                      Sumber total tidak diubah oleh parser
                    </CardDescription>
                  </div>
                  <span className="small-tag inline-flex items-center text-[10px] border border-solid border-line rounded-[5px] py-1 px-2 text-muted-foreground whitespace-nowrap">
                    {batch.status === 'SUBMITTED'
                      ? localOnlyBatch
                        ? 'TERSIMPAN'
                        : 'SUDAH DISUBMIT'
                      : 'REVIEW ACCOUNTING'}
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="table-scroll overflow-auto">
                    <Table className="import-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>PEMERIKSAAN</TableHead>
                          <TableHead>INVOICE / CUSTOMER</TableHead>
                          <TableHead>ITEM</TableHead>
                          <TableHead>TOTAL SUMBER</TableHead>
                          <TableHead>PEMBAYARAN</TableHead>
                          <TableHead>STATUS BISNIS</TableHead>
                          <TableHead>HASIL VALIDASI</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Button
                                type="button"
                                disabled={busy}
                                onClick={() => openDetail(row)}
                                className={cn(
                                  inspectionComplete(row)
                                    ? 'invoice-review-status inline-flex cursor-pointer checked'
                                    : 'invoice-review-status inline-flex cursor-pointer',
                                )}
                                title={
                                  inspectionComplete(row)
                                    ? 'Sudah diperiksa Accounting'
                                    : 'Belum diperiksa Accounting'
                                }
                                aria-label={
                                  inspectionComplete(row)
                                    ? 'Sudah diperiksa Accounting'
                                    : 'Belum diperiksa Accounting'
                                }
                                variant="ghost"
                              >
                                {inspectionComplete(row) ? (
                                  <CheckCircle2 size={20} data-icon="inline-start" />
                                ) : (
                                  <Clock3 size={20} data-icon="inline-start" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                className="invoice-link"
                                onClick={() => openDetail(row)}
                                variant="link"
                              >
                                {row.candidate.sourceInvoiceNumber ||
                                  row.candidate.number ||
                                  'File perlu diperiksa'}
                              </Button>
                              <span className="cell-sub block mt-1.25 text-[10px] text-muted-foreground">
                                {row.candidate.customer ||
                                  batch.files.find((f) => f.id === row.fileId)?.name}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{row.candidate.items.length} layanan</span>
                                {row.candidate.items.some((item) => item.redeemed) && (
                                  <Badge variant="secondary">
                                    {isFullRedemption(row.candidate)
                                      ? 'Full redeem'
                                      : `${row.candidate.items.filter((item) => item.redeemed).length} item redeem`}
                                  </Badge>
                                )}
                              </div>
                              <span className="cell-sub block mt-1.25 text-[10px] text-muted-foreground">
                                {row.candidate.packageName
                                  ? 'Breakdown paket'
                                  : row.candidate.sourceFormat}
                              </span>
                            </TableCell>
                            <TableCell className="amount font-semibold whitespace-nowrap tabular-nums">
                              {failedRead(row) ? 'Belum terbaca' : money(row.candidate.total)}
                            </TableCell>
                            <TableCell>
                              <span className="amount font-semibold whitespace-nowrap tabular-nums">
                                {failedRead(row) ? 'Belum terbaca' : money(row.candidate.totalPaid)}
                              </span>
                              <span className="cell-sub block mt-1.25 text-[10px] text-muted-foreground">
                                {failedRead(row)
                                  ? 'Periksa dokumen sumber'
                                  : `Outstanding ${money(row.candidate.outstanding)}`}
                              </span>
                            </TableCell>
                            <TableCell>
                              {row.candidate.businessStatus === 'UNKNOWN' ? (
                                <span className="badge inline-flex items-center gap-1.25 rounded-[5px] whitespace-nowrap font-medium bg-muted/50 text-muted-foreground text-[10px] py-1.25 px-2 mobile:text-[9px] needs_review leading-[1.2]">
                                  Perlu konfirmasi
                                </span>
                              ) : (
                                <StatusBadge status={row.candidate.businessStatus} />
                              )}
                            </TableCell>
                            <TableCell>
                              {row.invoiceId || row.syncStatus ? (
                                <StatusBadge status={row.syncStatus ?? 'PROCESSING'} />
                              ) : row.errors.length || row.status === 'CONFLICT' ? (
                                <div className="flex max-w-64 flex-col items-start gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => openDetail(row)}
                                    aria-label={`Lengkapi validasi ${row.candidate.sourceInvoiceNumber || row.candidate.number || 'file'}`}
                                    aria-describedby={`validation-${row.id}`}
                                  >
                                    <AlertCircle data-icon="inline-start" />
                                    {row.status === 'CONFLICT'
                                      ? 'Konflik data'
                                      : inspectionComplete(row)
                                        ? 'Belum siap dikirim'
                                        : 'Perlu diperiksa'}
                                  </Button>
                                  <p
                                    id={`validation-${row.id}`}
                                    className="text-xs leading-relaxed text-muted-foreground break-words whitespace-normal"
                                  >
                                    {row.errors[0] ||
                                      'Nomor invoice sudah tercatat dengan data berbeda.'}
                                    {row.errors.length > 1
                                      ? ` (+${row.errors.length - 1} lainnya)`
                                      : ''}
                                  </p>
                                </div>
                              ) : (
                                <Badge variant={row.status === 'DUPLICATE' ? 'info' : 'success'}>
                                  {row.status === 'DUPLICATE' ? 'Sudah ada' : 'Valid'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                className="icon-button inline-flex items-center justify-center mobile:min-w-8.5"
                                onClick={() => openDetail(row)}
                                aria-label={`Periksa ${row.candidate.number || 'file'}`}
                                variant="ghost"
                                size="icon"
                              >
                                <Eye size={17} data-icon="inline-start" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ImportPagination
                    label="Halaman invoice"
                    page={visiblePage}
                    total={batch.rows.length}
                    pageSize={pageSize}
                    onPage={setPage}
                    onPageSize={(size) => {
                      setPageSize(size);
                      setPage(1);
                    }}
                  />
                  {batch.status === 'PREVIEW' ? (
                    <div className="import-submit-area p-5.5 border-t border-solid border-t-line bg-muted/50 mobile:p-4.25">
                      {duplicateCount > 0 && (
                        <Alert
                          className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 info"
                          role="status"
                          variant="info"
                        >
                          <AlertDescription>
                            <CheckCircle2 size={18} />
                            <div>
                              <strong>{duplicateCount} invoice sudah tercatat sebelumnya</strong>
                              <p>
                                Invoice berstatus Sudah ada tidak dikirim ulang. Anda tetap dapat
                                mencentang konfirmasi Accounting dan menyelesaikan batch ini; sistem
                                akan menggunakan transaksi yang sudah ada.
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                      {!selection.length && (
                        <Alert
                          className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 warning"
                          variant="destructive"
                        >
                          <AlertDescription>
                            <AlertCircle size={18} />
                            <div>
                              <p>
                                Belum ada invoice yang siap dikirim. Centang pemeriksaan menandakan
                                review tersimpan; seluruh validasi juga harus terpenuhi.
                              </p>
                              <p>Klik status pada kolom Hasil validasi untuk melengkapi data.</p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                      <label className="checkbox-label flex-row items-center gap-2 font-normal text-[11px]">
                        <Checkbox
                          checked={reviewed}
                          aria-describedby={
                            !selection.length ? 'import-confirmation-help' : undefined
                          }
                          disabled={busy || !selection.length}
                          onCheckedChange={(checked) => setReviewed(checked === true)}
                        />
                        <span>
                          Saya telah memeriksa item, diskon, pajak, pembayaran, status bisnis, dan
                          total invoice yang akan diproses. Data sudah sesuai dengan dokumen sumber.
                          {localSaveCount > 0 &&
                            ' Invoice tanpa item yang dikirim ke Accurate hanya disimpan di intgrte.'}
                        </span>
                      </label>
                      {!selection.length && (
                        <p
                          id="import-confirmation-help"
                          className="mt-2 text-xs text-muted-foreground"
                        >
                          Konfirmasi aktif setelah minimal satu invoice lolos validasi.
                        </p>
                      )}
                      <div>
                        <p>
                          <strong>
                            {newInvoiceCount} invoice baru - {money(totalSelected)}
                            {localSaveCount > 0
                              ? ` - ${localSaveCount} invoice disimpan lokal`
                              : null}
                            {duplicateCount > 0 ? ` - ${duplicateCount} sudah ada` : null}
                          </strong>
                          <span>
                            Invoice baru yang valid dikirim setelah konfirmasi, termasuk pada
                            halaman lain. Invoice yang sudah ada dilewati tanpa membuat transaksi
                            baru. Invoice bermasalah atau konflik tetap ditahan. Invoice tanpa item
                            untuk Accurate disimpan tanpa pengiriman ke Accurate.
                          </span>
                        </p>
                        <Button
                          className="button inline-flex items-center justify-center whitespace-nowrap primary"
                          disabled={busy || !reviewed || !selection.length}
                          onClick={() =>
                            action(async () => {
                              const result = await submitBatch(batch.id, {
                                version: batch.version,
                                rowIds: selection,
                                accountingReviewed: true,
                              });
                              setBatch(result);
                              setNotice(
                                newInvoiceCount
                                  ? batch.mode === 'live'
                                    ? 'Batch disubmit. Worker mengirim Faktur Penjualan ke Accurate.'
                                    : 'Batch disubmit. Worker memproses invoice dalam simulasi.'
                                  : localSaveCount
                                    ? 'Invoice tersimpan lokal di intgrte. Tidak ada pengiriman ke Accurate.'
                                    : 'Review batch selesai. Semua invoice sudah ada; tidak ada transaksi atau antrean baru dibuat.',
                              );
                              invalidateHistory();
                            })
                          }
                          variant="default"
                        >
                          <Send size={17} data-icon="inline-start" />
                          {busy
                            ? 'Memproses…'
                            : localOnlyBatch || (localSaveCount > 0 && newInvoiceCount === 0)
                              ? 'Simpan invoice'
                              : localSaveCount && newInvoiceCount
                                ? 'Simpan & submit invoice'
                                : newInvoiceCount || !duplicateCount
                                  ? batch.mode === 'live'
                                    ? 'Submit Faktur ke Accurate'
                                    : 'Submit ke Accurate (simulasi)'
                                  : 'Selesaikan review (sudah ada)'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="import-complete flex gap-3 p-5.75 text-muted-foreground border-t border-solid border-t-line bg-success-soft mobile:p-4.25">
                      <CheckCircle2 size={22} />
                      <div>
                        <strong>Batch telah diselesaikan setelah review Accounting</strong>
                        <p>
                          {localOnlyBatch
                            ? 'Invoice tersimpan lokal di intgrte. Tidak ada transaksi atau antrean pengiriman ke Accurate.'
                            : batch.mode === 'live'
                              ? 'Faktur diproses ke Accurate. Periksa status pengiriman dan nomor target pada tiap invoice.'
                              : 'Invoice diproses dalam simulasi lokal. Tidak ada transaksi yang dikirim ke Accurate asli.'}{' '}
                          Invoice berstatus Sudah ada tidak dikirim ulang.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
      {batch && previewFile && (
        <Modal
          title="Preview dokumen upload"
          wide
          className="upload-document-modal"
          onClose={() => setPreviewFileId(null)}
        >
          <SourcePreview key={previewFile.id} batchId={batch.id} file={previewFile} />
          <div className="modal-footer py-4.5 px-6.5 border-t border-solid border-t-line flex justify-between items-center gap-3.75 mobile:py-3.75 mobile:px-4.5 mobile:flex-wrap">
            <span>Dokumen sumber upload</span>
            <Button
              className="button inline-flex items-center justify-center whitespace-nowrap primary"
              onClick={() => {
                setPreviewFileId(null);
                document
                  .querySelector('.import-table')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              variant="default"
            >
              Periksa invoice
            </Button>
          </div>
        </Modal>
      )}
      {batch && deleteFile && (
        <Modal
          destructive
          title="Hapus file upload?"
          onClose={() => {
            if (!busy) setDeleteFileId(null);
          }}
        >
          <div className="import-detail pt-0 pr-5.75 pb-5 pl-5.75 mobile:pt-0 mobile:pr-4 mobile:pb-4.5 mobile:pl-4">
            <p>
              <strong>{deleteFile.name}</strong> dan{' '}
              {batch.rows.filter((row) => row.fileId === deleteFile.id).length} invoice terkait akan
              dihapus dari draft upload ini.
            </p>
            <p>
              File lain dalam batch tetap tersedia. Penghapusan hanya berlaku sebelum submit dan
              dicatat pada audit.
            </p>
            {error && <p role="alert">{error}</p>}
          </div>
          <div className="modal-footer py-4.5 px-6.5 border-t border-solid border-t-line flex justify-between items-center gap-3.75 mobile:py-3.75 mobile:px-4.5 mobile:flex-wrap">
            <Button
              className="button inline-flex items-center justify-center whitespace-nowrap secondary"
              disabled={busy}
              onClick={() => setDeleteFileId(null)}
              variant="outline"
            >
              Batal
            </Button>
            <Button
              className="button inline-flex items-center justify-center whitespace-nowrap primary"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  const result = await removeFile(batch.id, deleteFile.id, {
                    version: batch.version,
                  });
                  if (result.deleted) {
                    setBatch(null);
                    setDetailId(null);
                    setReviewed(false);
                  } else if (result.batch) adopt(result.batch);
                  setDeleteFileId(null);
                  setPreviewFileId(null);
                  invalidateHistory();
                  setNotice('File dihapus dari draft upload.');
                })
              }
              variant="default"
            >
              <Trash2 size={15} data-icon="inline-start" /> Hapus file
            </Button>
          </div>
        </Modal>
      )}
      {deleteTarget && (
        <Modal destructive title="Hapus riwayat upload?" onClose={() => setDeleteTarget(null)}>
          <div className="import-detail pt-0 pr-5.75 pb-5 pl-5.75 mobile:pt-0 mobile:pr-4 mobile:pb-4.5 mobile:pl-4">
            <p>Batch {deleteTarget.id.slice(0, 8)} akan dihapus dari daftar riwayat.</p>
            <p>
              Data transaksi, audit, dan penanda duplikat tetap disimpan. Pengiriman yang sudah
              berjalan tidak dibatalkan.
            </p>
            {error && <p role="alert">{error}</p>}
          </div>
          <div className="modal-footer py-4.5 px-6.5 border-t border-solid border-t-line flex justify-between items-center gap-3.75 mobile:py-3.75 mobile:px-4.5 mobile:flex-wrap">
            <Button
              className="button inline-flex items-center justify-center whitespace-nowrap secondary"
              disabled={busy}
              onClick={() => setDeleteTarget(null)}
              variant="outline"
            >
              Batal
            </Button>
            <Button
              className="button inline-flex items-center justify-center whitespace-nowrap primary"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await removeBatch(deleteTarget.id, { version: deleteTarget.version });
                  if (batch?.id === deleteTarget.id) setBatch(null);
                  setDeleteTarget(null);
                  invalidateHistory();
                  setNotice('Riwayat upload dihapus.');
                })
              }
              variant="default"
            >
              <Trash2 size={15} data-icon="inline-start" /> Hapus riwayat
            </Button>
          </div>
        </Modal>
      )}
      {batch && detail && (
        <Modal
          destructive={!!itemToDelete}
          title={itemToDelete ? 'Hapus item?' : 'Konfirmasi dan Periksa Invoice sebelum di Submit'}
          wide={!itemToDelete}
          className={itemToDelete ? 'import-item-delete-modal' : 'import-review-modal'}
          onClose={itemToDelete ? cancelItemDelete : closeDetail}
        >
          {itemToDelete ? (
            <>
              <div className="import-item-delete-content py-5.5 px-6 leading-[1.7]">
                <p>
                  Hapus item <strong>{itemToDelete.name}</strong> dari rincian invoice?
                </p>
                <p>
                  Total rincian akan dihitung ulang. Invoice perlu diperiksa kembali; selisih dengan
                  sumber akan menghalangi submit.
                </p>
                {error && (
                  <p className="package-error text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <div className="modal-footer py-4.5 px-6.5 border-t border-solid border-t-line flex justify-between items-center gap-3.75 mobile:py-3.75 mobile:px-4.5 mobile:flex-wrap">
                <Button
                  type="button"
                  className="button inline-flex items-center justify-center whitespace-nowrap secondary"
                  disabled={busy}
                  onClick={cancelItemDelete}
                  variant="outline"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  className="button inline-flex items-center justify-center whitespace-nowrap primary item-delete-confirm"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      const next = await removeItem(batch.id, detail.id, itemToDelete.id, {
                        version: batch.version,
                      });
                      adopt(next);
                      setDeletingItemId(null);
                      const count =
                        next.rows.find((row) => row.id === detail.id)?.candidate.items.length ?? 0;
                      setDetailPage((current) =>
                        Math.min(current, Math.max(1, Math.ceil(count / 25))),
                      );
                      setNotice('Item dihapus. Periksa kembali rincian dan total sebelum submit.');
                    })
                  }
                  variant="destructive"
                >
                  {busy ? 'Menghapus...' : 'Ya'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="import-review-columns grid grid-cols-[minmax(0,_1.1fr)_minmax(0,_1fr)] min-h-0 flex-1 overflow-hidden tablet:block tablet:overflow-auto">
                <div className="import-detail pt-0 pr-5.75 pb-5 pl-5.75 mobile:pt-0 mobile:pr-4 mobile:pb-4.5 mobile:pl-4">
                  <div className="detail-header pt-6.25 pr-6.5 pb-5 pl-6.5 flex items-center justify-between gap-3.75 mobile:py-5 mobile:px-4.5">
                    <div>
                      <span className="eyebrow font-bold tracking-[1.7px] text-brand flex items-center gap-2.25 text-[10px]">
                        PREVIEW {detail.candidate.sourceFormat}
                      </span>
                      <h2>
                        {detail.candidate.sourceInvoiceNumber ||
                          detail.candidate.number ||
                          'File tidak terbaca'}
                      </h2>
                      {detail.candidate.sourceInvoiceNumber && (
                        <p>Receipt: {detail.candidate.number}</p>
                      )}
                      <p>
                        {detail.candidate.customer} ·{' '}
                        {detail.candidate.date
                          ? dateOnly(detail.candidate.date)
                          : 'Tanggal belum terbaca'}
                      </p>
                    </div>
                    <div className="import-review-form border-t border-solid border-t-line pt-5 mt-6 import-header-status">
                      <label>
                        <span className="eyebrow font-bold tracking-[1.7px] text-brand flex items-center gap-2.25 text-[10px]">
                          STATUS INVOICES
                        </span>
                        <SelectField
                          aria-label="Status Invoices"
                          disabled={busy || !!editingItemId || batch.status !== 'PREVIEW'}
                          value={draftStatus}
                          onValueChange={(e) => setDraftStatus(e)}
                        >
                          <SelectFieldOption value="UNKNOWN" disabled>
                            Pilih setelah memeriksa di Zenoti
                          </SelectFieldOption>
                          <SelectFieldOption value="OPEN">Open / Unclosed</SelectFieldOption>
                          <SelectFieldOption value="CLOSED">Closed</SelectFieldOption>
                        </SelectField>
                      </label>
                      <p>Pilih Status Pembayaran/Invoices</p>
                    </div>
                  </div>
                  {error && (
                    <Alert
                      className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 warning"
                      role="alert"
                      variant="destructive"
                    >
                      <AlertDescription>
                        <AlertCircle size={18} />
                        <p>{error}</p>
                      </AlertDescription>
                    </Alert>
                  )}
                  {failedRead(detail) && (
                    <Alert
                      className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 warning"
                      role="alert"
                      variant="destructive"
                    >
                      <AlertDescription>
                        <AlertCircle size={18} />
                        <div>
                          <strong>Data invoice belum terbaca</strong>
                          <p>{batch.files.find((f) => f.id === detail.fileId)?.error}</p>
                          {batch.status === 'PREVIEW' &&
                            detail.candidate.sourceFormat === 'PDF' && (
                              <Button
                                className="button inline-flex items-center justify-center whitespace-nowrap secondary"
                                disabled={busy}
                                onClick={() => reparseFile(detail.fileId)}
                                variant="outline"
                              >
                                {reparseFileId === detail.fileId
                                  ? 'Membaca PDF...'
                                  : 'Baca ulang PDF'}
                              </Button>
                            )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  {batch.status === 'PREVIEW' && <ImportValidationNotice row={detail} />}
                  <RedemptionNotice candidate={detail.candidate} />
                  {batch.mode === 'live' && !isLocalOnlyInvoice(detail.candidate) && (
                    <AccurateMappingPanel
                      key={detail.id}
                      batch={batch}
                      row={detail}
                      busy={busy}
                      onSaved={adopt}
                      onBusyChange={setBusy}
                      onConfigure={
                        onConfigure
                          ? () => {
                              closeDetail();
                              onConfigure();
                            }
                          : undefined
                      }
                    />
                  )}
                  {!!detail.candidate.sourceEntries?.length && (
                    <section className="source-group-detail mt-3.75 mr-0 mb-5.5 ml-0">
                      <h3>Baris sumber invoice {detail.candidate.sourceInvoiceNumber}</h3>
                      <p>
                        {detail.candidate.sourceEntries.length} baris Excel digabung berdasarkan
                        Center Code dan Invoice No yang sama.
                      </p>
                      <div className="table-scroll overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>BARIS EXCEL</TableHead>
                              <TableHead>INVOICE NO</TableHead>
                              <TableHead>RECEIPT NO</TableHead>
                              <TableHead>ITEM</TableHead>
                              <TableHead>QTY</TableHead>
                              <TableHead>FINAL SUMBER</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detail.candidate.sourceEntries
                              .slice((sourcePage - 1) * 25, sourcePage * 25)
                              .map((entry) => (
                                <TableRow key={entry.row}>
                                  <TableCell>{entry.row}</TableCell>
                                  <TableCell>{entry.invoiceNumber}</TableCell>
                                  <TableCell>{entry.receiptNumber || '-'}</TableCell>
                                  <TableCell>{entry.itemName}</TableCell>
                                  <TableCell>{entry.quantity}</TableCell>
                                  <TableCell>{money(entry.total)}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                      <ImportPagination
                        label="Halaman baris invoice"
                        page={sourcePage}
                        total={detail.candidate.sourceEntries.length}
                        pageSize={25}
                        onPage={setSourcePage}
                      />
                    </section>
                  )}
                  {batch.status === 'PREVIEW' &&
                    detail.candidate.packageParents?.map((parent) => (
                      <PackageDetailNotice
                        key={parent.id}
                        parent={parent}
                        current={detail.candidate.items}
                      />
                    ))}
                  <div className="import-item-toolbar flex justify-end mt-4 mr-0 mb-2.5 ml-0">
                    <Button
                      type="button"
                      className="button inline-flex items-center justify-center whitespace-nowrap secondary"
                      disabled={busy || !!editingItemId || batch.status !== 'PREVIEW'}
                      title={
                        batch.status !== 'PREVIEW'
                          ? 'Invoice yang sudah disubmit tidak dapat diubah.'
                          : undefined
                      }
                      onClick={() => {
                        setError('');
                        setEditingItemId('__new__');
                      }}
                      variant="outline"
                    >
                      <Plus size={15} data-icon="inline-start" />
                      Tambah item
                    </Button>
                  </div>
                  {editingItemId === '__new__' && (
                    <AddImportItem
                      key={detail.id}
                      batchId={batch.id}
                      rowId={detail.id}
                      version={batch.version}
                      previouslyReviewed={previouslyReviewed}
                      disabled={busy}
                      onCancel={() => setEditingItemId(null)}
                      onSaving={setBusy}
                      onSaved={(next) => {
                        const updated = next;
                        adopt(updated);
                        setEditingItemId(null);
                        const count =
                          updated.rows.find((r) => r.id === detail.id)?.candidate.items.length ?? 1;
                        setDetailPage(Math.max(1, Math.ceil(count / 25)));
                        setNotice(
                          'Item ditambahkan. Periksa kembali rincian dan total sebelum submit.',
                        );
                      }}
                    />
                  )}
                  {!!detail.candidate.items.length && (
                    <div className="table-scroll overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>LAYANAN / ITEM</TableHead>
                            <TableHead>QTY</TableHead>
                            <TableHead>HARGA AWAL</TableHead>
                            <TableHead>DISKON (%)</TableHead>
                            <TableHead>SETELAH DISKON</TableHead>
                            <TableHead>PAJAK</TableHead>
                            <TableHead>FINAL ITEM</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.candidate.items
                            .slice((detailPage - 1) * 25, detailPage * 25)
                            .map((i) => (
                              <EditableImportItem
                                key={i.id}
                                item={i}
                                batchId={batch.id}
                                rowId={detail.id}
                                version={batch.version}
                                editable={batch.status === 'PREVIEW'}
                                editing={editingItemId === i.id}
                                disabled={busy || (!!editingItemId && editingItemId !== i.id)}
                                previouslyReviewed={previouslyReviewed}
                                onEdit={() => setEditingItemId(i.id)}
                                onDelete={() => {
                                  setError('');
                                  setDeletingItemId(i.id);
                                }}
                                onCancel={() => setEditingItemId(null)}
                                onSaving={(saving) => {
                                  setBusy(saving);
                                  if (saving) {
                                    setNotice('');
                                    setError('');
                                  }
                                }}
                                onSaved={(next) => {
                                  adopt(next);
                                  setNotice(
                                    'Koreksi item disimpan. Periksa kembali sebelum submit.',
                                  );
                                }}
                              />
                            ))}
                        </TableBody>
                        <TableFooter className="import-table-totals">
                          <TableRow>
                            <TableHead scope="row">
                              {editingItemId
                                ? 'Total tersimpan'
                                : detail.candidate.items.some((item) => item.redeemed)
                                  ? 'Total non-redeem'
                                  : 'Total'}
                            </TableHead>
                            <TableCell>
                              {chargeableItems(detail.candidate.items).reduce(
                                (n, i) => n + i.quantity,
                                0,
                              )}
                            </TableCell>
                            <TableCell>
                              {money(
                                chargeableItems(detail.candidate.items).reduce(
                                  (n, i) => n + i.unitPrice * i.quantity,
                                  0,
                                ),
                              )}
                            </TableCell>
                            <TableCell aria-label="Persentase diskon tidak dijumlahkan">
                              {'\u2014'}
                            </TableCell>
                            <TableCell>
                              {money(
                                chargeableItems(detail.candidate.items).reduce(
                                  (n, i) => n + i.unitPrice * i.quantity - i.discount,
                                  0,
                                ),
                              )}
                            </TableCell>
                            <TableCell>
                              {money(
                                chargeableItems(detail.candidate.items).reduce(
                                  (n, i) => n + i.tax,
                                  0,
                                ),
                              )}
                            </TableCell>
                            <TableCell className="amount font-semibold whitespace-nowrap tabular-nums">
                              {money(
                                chargeableItems(detail.candidate.items).reduce(
                                  (n, i) => n + i.unitPrice * i.quantity - i.discount + i.tax,
                                  0,
                                ),
                              )}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  )}
                  {detail.candidate.items.length > 25 && (
                    <ImportPagination
                      label="Halaman item invoice"
                      disabled={busy || !!editingItemId}
                      page={detailPage}
                      total={detail.candidate.items.length}
                      pageSize={25}
                      onPage={(next) => {
                        if (!editingItemId) setDetailPage(next);
                      }}
                    />
                  )}
                  {!failedRead(detail) && <h3>Pembayaran sumber</h3>}
                  {detail.candidate.payments.map((p) => (
                    <div
                      className="payment-row py-4.75 px-0 border-b border-solid border-b-line flex justify-between gap-3.75 text-muted-foreground text-[11px]"
                      key={p.id}
                    >
                      <div>
                        <strong>{p.method.toUpperCase()}</strong>
                        <span className="cell-sub block mt-1.25 text-[10px] text-muted-foreground">
                          {dateOnly(p.paidAt)}
                        </span>
                      </div>
                      <strong>{money(p.amount)}</strong>
                    </div>
                  ))}
                  {!failedRead(detail) && (
                    <p className="import-outstanding text-[11px] text-muted-foreground mt-3.5 mr-0 mb-5.5 ml-0">
                      Total dibayar: {money(detail.candidate.totalPaid)} · Outstanding:{' '}
                      {money(detail.candidate.outstanding)}
                    </p>
                  )}
                  {detail.candidate.warnings.map((w, i) => (
                    <p
                      className="import-warning-note flex gap-1.75 items-start text-muted-foreground text-[10px] my-2.5 mx-0 leading-[1.7]"
                      key={i}
                    >
                      <AlertCircle size={14} />
                      {w}
                    </p>
                  ))}
                </div>
                {batch.files.find((f) => f.id === detail.fileId) && (
                  <SourcePreview
                    key={detail.id}
                    rowId={detail.id}
                    batchId={batch.id}
                    file={batch.files.find((f) => f.id === detail.fileId)!}
                    sourceRows={detail.candidate.sourceRows}
                    sourceSheet={detail.candidate.sourceSheet}
                  />
                )}
              </div>
              <div className="modal-footer py-4.5 px-6.5 border-t border-solid border-t-line flex justify-between items-center gap-3.75 mobile:py-3.75 mobile:px-4.5 mobile:flex-wrap">
                <span>
                  <ShieldCheck size={15} /> Total harus identik dengan invoice sumber
                </span>
                <Button
                  className="button inline-flex items-center justify-center whitespace-nowrap primary"
                  disabled={
                    busy || !!editingItemId || (batch.status === 'PREVIEW' && failedRead(detail))
                  }
                  onClick={saveInspection}
                  variant="default"
                >
                  {batch.status !== 'PREVIEW'
                    ? 'Tutup'
                    : previouslyReviewed
                      ? 'Perbarui Pemeriksaan'
                      : 'Selesai memeriksa'}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
