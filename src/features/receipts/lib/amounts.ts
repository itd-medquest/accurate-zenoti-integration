export function receiptFee(gross: number, rateBps: number) {
  if (
    !Number.isSafeInteger(gross) ||
    gross <= 0 ||
    !Number.isSafeInteger(rateBps) ||
    rateBps < 0 ||
    rateBps > 10000
  )
    throw new Error('Nominal atau tarif tidak valid.');
  const fee = Number((BigInt(gross) * BigInt(rateBps) + 9999n) / 10000n);
  return { gross, fee, net: gross - fee };
}
