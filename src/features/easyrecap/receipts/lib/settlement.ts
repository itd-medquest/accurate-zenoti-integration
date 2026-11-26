export type ReceiptAmountMode = 'FULL' | 'NET' | 'GROSS';
/** Work in gross allocations. Bank fees are rounded once cumulatively per source/rate. */
export function settlementAmounts(input: {
  remaining: number;
  priorGross?: number;
  priorFee?: number;
  rateBps: number;
  mode: ReceiptAmountMode;
  amount?: number | null;
}) {
  const { remaining, rateBps, mode, amount, priorGross = 0, priorFee = 0 } = input;
  if (
    ![remaining, priorGross, priorFee, rateBps].every(Number.isSafeInteger) ||
    remaining <= 0 ||
    remaining > 2147483647 ||
    priorGross < 0 ||
    priorFee < 0 ||
    rateBps < 0 ||
    rateBps >= 10000 ||
    !['FULL', 'NET', 'GROSS'].includes(mode)
  )
    throw new Error('Nominal, sisa pembayaran, atau tarif tidak valid.');
  const calculate = (gross: number) => {
    const cumulativeFee = Number((BigInt(priorGross + gross) * BigInt(rateBps) + 9999n) / 10000n);
    const fee = cumulativeFee - priorFee;
    return { gross, rateBps, fee, net: gross - fee };
  };
  let gross = remaining;
  if (mode !== 'FULL') {
    if (amount == null || !Number.isSafeInteger(amount) || amount <= 0 || amount > 2147483647)
      throw new Error('Isi nominal penerimaan dalam rupiah bulat positif.');
    if (mode === 'GROSS') gross = amount;
    else if (calculate(remaining).net !== amount) {
      let low = 1,
        high = remaining;
      while (low < high) {
        const mid = low + Math.floor((high - low) / 2);
        if (calculate(mid).net < amount) low = mid + 1;
        else high = mid;
      }
      gross = low;
      if (calculate(gross).net !== amount)
        throw new Error('Dana bersih melebihi sisa pembayaran atau tidak cocok dengan tarif bank.');
    }
  }
  const result = calculate(gross);
  if (gross > remaining || result.fee < 0 || result.net <= 0)
    throw new Error('Penerimaan melebihi sisa pembayaran atau nilai bersih tidak positif.');
  return result;
}
