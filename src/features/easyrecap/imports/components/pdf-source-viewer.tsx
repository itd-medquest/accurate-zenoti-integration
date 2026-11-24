'use client';
import { Button } from '@/components/ui/button';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { loadSourcePdf } from '../services/imports.service';
const assets = '/vendor/pdfjs-6.4.299/';
export function PdfSourceViewer({ endpoint }: { endpoint: string }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(100),
    [error, setError] = useState(''),
    [rendered, setRendered] = useState(false);
  const [containerWidth, setContainerWidth] = useState(600);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    let pending: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(pending);
      pending = setTimeout(() => setContainerWidth(Math.round(node.clientWidth)), 120);
    });
    setContainerWidth(Math.round(node.clientWidth));
    observer.observe(node);
    return () => {
      clearTimeout(pending);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    let active = true,
      task: PDFDocumentLoadingTask | undefined;
    const controller = new AbortController();
    setDocument(null);
    setPage(1);
    setError('');
    setRendered(false);
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = assets + 'pdf.worker.min.mjs';
      const data = await loadSourcePdf(endpoint, controller.signal);
      if (!active) return;
      task = pdfjs.getDocument({
        data,
        enableXfa: false,
        standardFontDataUrl: assets + 'standard_fonts/',
        cMapUrl: assets + 'cmaps/',
        cMapPacked: true,
        wasmUrl: assets + 'wasm/',
      });
      const pdf = await task.promise;
      if (pdf.numPages > 20) throw new Error('Preview PDF maksimal 20 halaman.');
      if (active) setDocument(pdf);
    })().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
      controller.abort();
      void task?.destroy();
    };
  }, [endpoint]);
  useEffect(() => {
    let active = true,
      render: RenderTask | undefined;
    setRendered(false);
    if (!document || !canvas.current) return;
    (async () => {
      const source = await document.getPage(page);
      if (!active || !canvas.current) return;
      const base = source.getViewport({ scale: 1 });
      const width = Math.max(200, containerWidth - 32);
      const scale = (Math.min(2, width / base.width) * zoom) / 100;
      const viewport = source.getViewport({ scale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const node = canvas.current;
      node.width = Math.ceil(viewport.width * pixelRatio);
      node.height = Math.ceil(viewport.height * pixelRatio);
      node.style.width = `${viewport.width}px`;
      node.style.height = `${viewport.height}px`;
      render = source.render({
        canvas: node,
        viewport,
        transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });
      await render.promise;
      if (active) setRendered(true);
    })().catch((e) => {
      if (active && e.name !== 'RenderingCancelledException') setError(e.message);
    });
    return () => {
      active = false;
      render?.cancel();
    };
  }, [document, page, zoom, containerWidth]);
  return (
    <div className="pdf-canvas-viewer flex flex-col gap-3 flex-1 min-h-0 tablet:min-h-100">
      <div className="source-controls flex gap-3.5 flex-wrap text-[12px] items-center">
        <Button
          className="button inline-flex items-center justify-center whitespace-nowrap secondary [&_svg:not([class*='size-'])]:size-5"
          disabled={!document || page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label="Halaman PDF sebelumnya"
          variant="outline"
          size="icon"
        >
          <ChevronLeft data-icon="inline-start" />
        </Button>
        <span>
          Halaman {page} / {document?.numPages ?? '…'}
        </span>
        <Button
          className="button inline-flex items-center justify-center whitespace-nowrap secondary [&_svg:not([class*='size-'])]:size-5"
          disabled={!document || page >= document.numPages}
          onClick={() => setPage(page + 1)}
          aria-label="Halaman PDF berikutnya"
          variant="outline"
          size="icon"
        >
          <ChevronRight data-icon="inline-start" />
        </Button>
        <SelectField
          className="w-22 shrink-0"
          aria-label="Zoom PDF sumber"
          value={zoom}
          onValueChange={(e) => setZoom(Number(e))}
        >
          {[75, 100, 125, 150, 200].map((z) => (
            <SelectFieldOption key={z} value={z}>
              {z}%
            </SelectFieldOption>
          ))}
        </SelectField>
      </div>
      {error ? <p role="alert">{error} Gunakan Unduh sumber.</p> : null}
      <div
        className="pdf-canvas-scroll flex-1 overflow-auto min-h-75 bg-accent/60 border border-solid border-border rounded-[9px] p-4 tablet:max-h-145"
        ref={container}
        tabIndex={0}
      >
        {!rendered && !error && <p>Memuat halaman PDF…</p>}
        <canvas
          ref={canvas}
          role="img"
          aria-label={`PDF sumber halaman ${page}`}
          data-rendered={rendered}
          className={rendered ? 'visible' : 'invisible'}
        />
      </div>
    </div>
  );
}
