export function parseReceiptRate(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export const formatReceiptRate = (rateBps: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(rateBps / 100);
