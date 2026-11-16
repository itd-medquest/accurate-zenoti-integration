export type Invoice = {
  id: string;
  number: string;
  sourceId: string;
  customer: string;
  branchId: string;
  date: string;
  dueDate: string | null;
  businessStatus: string;
  paymentStatus: string;
  syncStatus: string;
  total: number;
  outstanding: number;
  tax: number;
  discount: number;
  error: string | null;
  exception: string | null;
  updatedAt: string;
  items: {
    id: string;
    name: string;
    kind: string;
    quantity: number;
    unitPrice: number;
    tax: number;
    discount: number;
    discountPercent?: number;
    mapped: boolean;
    redeemed?: boolean;
    redemptionNote?: string;
  }[];
  payments: { id: string; method: string; amount: number; paidAt: string }[];
};

export type Detail = Invoice & {
  delivery?: {
    status: string;
    targetId: string | null;
    targetNumber: string | null;
    databaseId: string;
    payload: Record<string, string>;
  } | null;
  history: { id: string; status: string; message: string; response: unknown; createdAt: string }[];
  targets: {
    targetId: string;
    targetNumber: string;
    targetStatus: string;
    paymentIds: string[];
    syncedAt: string;
  }[];
};
