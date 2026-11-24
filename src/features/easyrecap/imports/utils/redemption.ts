type Line = {
  name: string;
  redeemed?: boolean;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
};

export const isConsultation = (item: { name: string }) =>
  item.name.trim().toLowerCase() === 'consultation';
export const isFreeConsultation = (item: Line) =>
  isConsultation(item) && item.unitPrice === 0 && item.discount === 0 && item.tax === 0;
export const chargeableItems = <T extends Line>(items: T[]): T[] =>
  items.filter((item) => item.redeemed !== true && !isFreeConsultation(item));

export const redemptionAmount = (items: Line[]) =>
  items.reduce(
    (sum, item) => sum + (item.redeemed ? item.quantity * item.unitPrice - item.discount : 0),
    0,
  );

export const isFullRedemption = (candidate: { items: Line[]; total: number }) =>
  candidate.total === 0 &&
  candidate.items.length > 0 &&
  candidate.items.some((item) => item.redeemed === true) &&
  candidate.items.every((item) => item.redeemed === true || isFreeConsultation(item));

export const isLocalOnlyInvoice = (candidate: { items: Line[]; total: number }) =>
  candidate.total === 0 &&
  candidate.items.length > 0 &&
  chargeableItems(candidate.items).length === 0;
