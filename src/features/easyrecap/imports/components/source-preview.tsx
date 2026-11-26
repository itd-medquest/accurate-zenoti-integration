'use client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { ImportPagination } from '@/components/ui/pagination';
import { PdfSourceViewer } from '@/features/easyrecap/imports/components/pdf-source-viewer';
import { previewSource, sourceUrl } from '@/features/easyrecap/imports/services/imports.service';
import type { Sheet } from '@/features/easyrecap/imports/types';
import { AlertCircle, Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
export function SourcePreview({
  batchId,
  file,
  sourceRows,
  sourceSheet,
  rowId,
}: {
  batchId: string;
  file: {
    id: string;
    name: string;
    format: string;
  };
  sourceRows?: number[];
  sourceSheet?: string;
  rowId?: string;
}) {
  const [page, setPage] = useState(1);
  const [error, setError] = useState(''),
    [sheets, setSheets] = useState<Sheet[]>([]),
    [sheet, setSheet] = useState(''),
    [onlyInvoice, setOnlyInvoice] = useState(true);
  const endpoint = sourceUrl(batchId, file.id);
  useEffect(() => {
    let active = true;
    setError('');
    setSheets([]);
    if (file.format === 'XLSX')
      previewSource(batchId, file.id, page, sheet, sourceSheet, onlyInvoice, rowId)
        .then((data) => {
          if (active) {
            setSheets(data.sheets);
            setSheet((current) => current || sourceSheet || data.sheets[0]?.name || '');
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [endpoint, file.format, batchId, file.id, sourceSheet, sheet, page, onlyInvoice, rowId]);
  const current = sheets.find((s) => s.name === sheet);
  const visiblePage = Math.min(page, Math.max(1, Math.ceil((current?.totalRows ?? 0) / 25)));
  const visibleRows = current?.rows ?? [];
  return (
    <aside
      className="source-preview flex flex-col min-w-0 min-h-0 bg-muted/50 border-l border-solid border-l-border p-4.5 gap-3 overflow-auto tablet:min-h-140 tablet:border-l-0 tablet:border-t tablet:border-solid tablet:border-t-border"
      aria-label="Preview dokumen sumber"
    >
      <div className="source-preview-head flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow font-bold tracking-[1.7px] text-brand flex items-center gap-2.25 text-[10px]">
            DOKUMEN SUMBER
          </span>
          <h3>
            <FileText size={17} />
            {file.name}
          </h3>
        </div>
        <a
          className="button border border-solid rounded-[8px] py-2.5 px-3.75 min-h-9.75 inline-flex items-center justify-center gap-2 font-semibold text-[12px] whitespace-nowrap compact:py-2.25 compact:px-2.75 compact:text-[10px] secondary border-border bg-control text-muted-foreground"
          href={endpoint}
        >
          <Download size={15} /> Unduh sumber
        </a>
      </div>
      {error ? (
        <Alert
          className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 warning"
          role="alert"
          variant="destructive"
        >
          <AlertDescription>
            <AlertCircle size={18} />
            {error}
          </AlertDescription>
        </Alert>
      ) : file.format === 'PDF' ? (
        <PdfSourceViewer endpoint={endpoint} />
      ) : (
        <>
          <div className="source-controls flex flex-wrap text-[12px] items-center source-excel-controls gap-[10px_16px] phone:gap-2.5">
            <label>
              Sheet{' '}
              <SelectField
                aria-label="Sheet dokumen sumber"
                value={sheet}
                onValueChange={(e) => {
                  setSheet(e);
                  setPage(1);
                }}
              >
                {sheets.map((s) => (
                  <SelectFieldOption key={s.name} value={s.name}>
                    {s.name}
                  </SelectFieldOption>
                ))}
              </SelectField>
            </label>
            {sourceRows?.length && sheet === sourceSheet ? (
              <label>
                <Checkbox
                  checked={onlyInvoice}
                  onCheckedChange={(checked) => {
                    setOnlyInvoice(checked === true);
                    setPage(1);
                  }}
                />{' '}
                Hanya baris invoice ini
              </label>
            ) : null}
          </div>
          {!current ? (
            <p>Memuat data sumber…</p>
          ) : (
            <div
              className="source-sheet-scroll overflow-auto min-h-55 flex-1 border border-solid border-border bg-control rounded-[8px] tablet:max-h-125"
              tabIndex={0}
            >
              <table className="source-sheet border-collapse text-[11px] whitespace-nowrap">
                <tbody>
                  {visibleRows.map((r) => (
                    <tr
                      key={r.number}
                      className={
                        sheet === sourceSheet && sourceRows?.includes(r.number)
                          ? 'source-highlight'
                          : ''
                      }
                    >
                      <th scope="row">{r.number}</th>
                      {r.cells.map((v, i) => (
                        <td key={i}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ImportPagination
            label="Halaman sumber Excel"
            page={visiblePage}
            total={current?.totalRows ?? 0}
            pageSize={25}
            onPage={setPage}
          />
          <p className="source-caption text-[11px] text-muted-foreground m-0">
            Nilai sel dari file asli. Baris invoice terpilih ditandai ungu. Formula tidak
            dijalankan.
          </p>
        </>
      )}
      <p className="source-caption text-[11px] text-muted-foreground m-0">
        Jika preview PDF tidak didukung perangkat, gunakan Unduh sumber.
      </p>
    </aside>
  );
}
