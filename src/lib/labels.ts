export const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  finance: 'Finance',
  viewer: 'Viewer',
};

export const statusLabels: Record<string, string> = {
  SYNCED: 'Tersinkron',
  LOCAL_ONLY: 'Tersimpan — Full redeem',
  LOCAL_ONLY_CONSULTATION: 'Tersimpan — Consultation gratis',
  PROCESSING: 'Diproses',
  FAILED: 'Gagal',
  PENDING: 'Menunggu',
  NEEDS_REVIEW: 'Perlu ditinjau',
  CLOSED: 'Closed',
  OPEN: 'Unclosed',
  VOIDED: 'Void',
  PAID: 'Lunas',
  PARTIAL: 'Dibayar sebagian',
  UNPAID: 'Belum dibayar',
  DRAFT: 'Draft',
};
