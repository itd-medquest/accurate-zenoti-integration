'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

export function InvoiceReviewLayout({
  children,
  source,
}: {
  children: ReactNode;
  source?: ReactNode;
}) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1001px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      disabled={!desktop}
      className="import-review-columns"
      resizeTargetMinimumSize={{ coarse: 28, fine: 12 }}
    >
      <ResizablePanel
        id="invoice-review-fields"
        defaultSize="52%"
        minSize="30%"
        className="min-h-0 min-w-0"
      >
        {children}
      </ResizablePanel>
      {source && (
        <>
          <ResizableHandle
            withHandle
            disabled={!desktop}
            className="tablet:hidden"
            aria-label="Ubah lebar panel pemeriksaan dan dokumen"
            title="Geser untuk mengatur lebar. Gunakan tombol panah saat fokus; klik dua kali untuk mereset."
          />
          <ResizablePanel
            id="invoice-review-source"
            defaultSize="48%"
            minSize="25%"
            className="flex min-h-0 min-w-0 flex-col"
          >
            {source}
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
