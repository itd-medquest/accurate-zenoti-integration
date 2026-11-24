import { Alert, AlertDescription } from '@/components/ui/alert';
import type { PackageLine } from '@/features/easyrecap/imports/types';
import { Info } from 'lucide-react';
export function PackageDetailNotice({
  parent,
  current,
}: {
  parent: PackageLine;
  current: PackageLine[];
}) {
  const children = current.filter((item) => item.id.startsWith(parent.id + ':detail:'));
  const parentPresent = current.some((item) => item.id === parent.id);
  const incomplete =
    !children.length ||
    parentPresent ||
    children.some(
      (item) => !item.name.trim() || !Number.isInteger(item.quantity) || item.quantity <= 0,
    );
  const targetNet = parent.quantity * parent.unitPrice - parent.discount;
  const mismatch =
    children.reduce((sum, item) => sum + item.quantity * item.unitPrice - item.discount, 0) !==
      targetNet || children.reduce((sum, item) => sum + item.tax, 0) !== parent.tax;
  if (!incomplete && !mismatch) return null;
  return (
    <Alert
      className="alert flex gap-2.5 items-start py-3.5 px-4 mb-5 info package-detail-notice"
      role="status"
      variant="info"
    >
      <AlertDescription>
        <Info size={18} aria-hidden="true" />
        <div>
          <strong>
            {incomplete
              ? 'Rincian item belum terbaca lengkap'
              : 'Nilai rincian belum sesuai invoice sumber'}
          </strong>
          <p>
            {parent.name}.{' '}
            {parentPresent
              ? 'Hapus baris paket induk yang belum dipecah, lalu gunakan Tambah item untuk mengisi layanan penyusunnya.'
              : incomplete
                ? 'Gunakan Tambah item atau ikon edit pada tabel untuk melengkapi rincian.'
                : 'Periksa dan sesuaikan rincian melalui ikon edit, Tambah item, atau ikon hapus pada tabel.'}{' '}
            Nilai rincian dan pajak harus tetap sama dengan invoice sumber.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
