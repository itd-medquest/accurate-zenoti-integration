'use client';
import { Button } from '@/components/ui/button';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
export function ImportPagination({
  page,
  total,
  pageSize,
  onPage,
  onPageSize,
  label,
  disabled = false,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize)),
    current = Math.min(page, pages);
  return (
    <nav
      className="import-pagination flex justify-between items-center gap-3 flex-wrap py-3.75 px-5 text-[11px] text-muted-foreground border-t border-solid border-t-border"
      aria-label={label}
    >
      <span>
        {total ? (current - 1) * pageSize + 1 : 0}–{Math.min(current * pageSize, total)} dari{' '}
        {total}
      </span>
      <div>
        {onPageSize && (
          <label>
            Per halaman{' '}
            <SelectField
              aria-label={`${label}: jumlah per halaman`}
              disabled={disabled}
              value={pageSize}
              onValueChange={(e) => onPageSize(Number(e))}
            >
              {[10, 25, 50].map((size) => (
                <SelectFieldOption key={size} value={size}>
                  {size}
                </SelectFieldOption>
              ))}
            </SelectField>
          </label>
        )}
        <Button
          className="button inline-flex items-center justify-center whitespace-nowrap secondary"
          disabled={disabled || current === 1}
          onClick={() => onPage(current - 1)}
          aria-label={`${label}: sebelumnya`}
          variant="outline"
        >
          Sebelumnya
        </Button>
        <span>
          {current} / {pages}
        </span>
        <Button
          className="button inline-flex items-center justify-center whitespace-nowrap secondary"
          disabled={disabled || current >= pages}
          onClick={() => onPage(current + 1)}
          aria-label={`${label}: berikutnya`}
          variant="outline"
        >
          Berikutnya
        </Button>
      </div>
    </nav>
  );
}
