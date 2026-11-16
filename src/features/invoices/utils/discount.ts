export function percentageDiscountAmount(base: number, percent: number): number {
  if (
    !Number.isSafeInteger(base) ||
    base < 0 ||
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > 100
  )
    return NaN;
  const text = percent.toFixed(6);
  if (Number(text) !== percent) return NaN;
  const numerator = BigInt(text.replace('.', '')) * BigInt(base);
  const divisor = 100000000n;
  if (numerator % divisor !== 0n) return NaN;
  const result = Number(numerator / divisor);
  return Number.isSafeInteger(result) ? result : NaN;
}
export function lineDiscountPercent(line: {
  quantity: number;
  unitPrice: number;
  discount: number;
  discountPercent?: number;
}) {
  const base = line.quantity * line.unitPrice;
  return line.discountPercent ?? (base > 0 ? (line.discount / base) * 100 : 0);
}
export function formatDiscountPercent(line: {
  quantity: number;
  unitPrice: number;
  discount: number;
  discountPercent?: number;
}) {
  const percent = lineDiscountPercent(line);
  return Number.isFinite(percent)
    ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 }).format(percent) + '%'
    : '-';
}

export function validUnitPrice(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 2147483647 &&
    Number(value.toFixed(6)) === value
  );
}
