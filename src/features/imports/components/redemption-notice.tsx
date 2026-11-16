import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { money } from '@/lib/format';
import type { Candidate } from '../types';
import { isFullRedemption, redemptionAmount, isFreeConsultation } from '../utils/redemption';

export function RedemptionNotice({ candidate }: { candidate: Candidate }) {
  const count = candidate.items.filter((item) => item.redeemed).length;
  const consultationCount = candidate.items.filter(isFreeConsultation).length;
  if (!count && !consultationCount) return null;
  const full = isFullRedemption(candidate);
  return (
    <Alert variant="info" className="mb-5" aria-label="Informasi redeem invoice">
      <ShieldCheck />
      <AlertTitle>
        {full
          ? 'Full redeem — hanya disimpan di intgrte'
          : count
            ? 'Invoice dengan item redeem'
            : 'Consultation gratis — tidak dikirim ke Accurate'}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>
          {full
            ? 'Layanan redeem dan Consultation gratis, jika ada, disimpan sebagai referensi. Setelah diperiksa, invoice disimpan tanpa pengiriman ke Accurate dan tanpa mapping item.'
            : 'Item Redeemed dan Consultation gratis tetap tersimpan sebagai referensi tanpa dikirim ke Accurate. Item gratis lainnya tetap mengikuti pengiriman biasa.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {count > 0 && <Badge variant="secondary">{count} item redeem</Badge>}
          {consultationCount > 0 && (
            <Badge variant="secondary">{consultationCount} Consultation gratis</Badge>
          )}
          {count > 0 && <span>Nilai redeem: {money(redemptionAmount(candidate.items))}</span>}
          <span>Total tagihan: {money(candidate.total)}</span>
        </div>
        <p>
          Subtotal sumber:{' '}
          {money(candidate.sourceSubtotalBeforeDiscount ?? candidate.subtotal + candidate.discount)}{' '}
          · Diskon: {money(candidate.discount)} · Pajak: {money(candidate.tax)}
        </p>
      </AlertDescription>
    </Alert>
  );
}
