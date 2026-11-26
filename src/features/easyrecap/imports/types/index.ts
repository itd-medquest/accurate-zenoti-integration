import type {
  AccurateDestination,
  AccurateSelection,
} from '@/features/easyrecap/invoices/types/accurate';
export type Candidate = {
  receiptNumber?: string;
  accurateSelection?: AccurateSelection;
  sourceId: string;
  sourceRows?: number[];
  sourceInvoiceNumber?: string;
  sourceEntries?: {
    row: number;
    invoiceNumber: string;
    receiptNumber: string;
    itemName: string;
    quantity: number;
    net: number;
    tax: number;
    total: number;
  }[];
  accountingReviewedAt?: string;
  reviewException?: {
    reason: string;
    actorId: string;
    reviewedAt: string;
    fingerprint: string;
    errors: string[];
  };
  extractionMethod?: 'text' | 'ocr';
  sourceSheet?: string;
  packageParents?: PackageLine[];
  number: string;
  customer: string;
  customerId: string;
  date: string;
  businessStatus: string;
  currency: string;
  subtotal: number;
  sourceSubtotalBeforeDiscount?: number;
  discount: number;
  tax: number;
  total: number;
  totalPaid: number;
  outstanding: number;
  packageName: string | null;
  sourceFormat: string;
  warnings: string[];
  items: {
    id: string;
    name: string;
    redeemed?: boolean;
    redemptionNote?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    discountPercent?: number;
    tax: number;
  }[];
  payments: { id: string; method: string; amount: number; paidAt: string }[];
  benefits: {
    name: string;
    unitPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    netAmount: number;
  }[];
};

export type Row = {
  exceptionReview?: { errors: string[]; allowed: boolean; blockers: string[]; accepted: boolean };
  syncError?: string | null;
  delivery?: { status: string; targetId: string | null; targetNumber: string | null } | null;
  id: string;
  fileId: string;
  invoiceId: string | null;
  candidate: Candidate;
  status: string;
  errors: string[];
  syncStatus: string | null;
};

export type Batch = {
  accurateDestination?: AccurateDestination;
  id: string;
  branchId: string;
  status: string;
  version: number;
  createdAt: string;
  submittedAt: string | null;
  mode: string;
  files: { id: string; name: string; size: number; format: string; error: string | null }[];
  rows: Row[];
};

export type History = Pick<Batch, 'id' | 'status' | 'createdAt' | 'branchId' | 'version'>;

export type ImportSummary = {
  sent: number;
  draft: number;
  failed: number;
  redeem: number;
  processing: number;
};
export type ImportHistoryEntry = History & {
  invoiceCount: number;
  references: string[];
  counts: ImportSummary & { simulation: number; local: number };
};
export type ImportOverview = {
  items: ImportHistoryEntry[];
  total: number;
  summary: ImportSummary;
};
export type ImportHistoryFilters = {
  search: string;
  branch: string;
  dateFrom: string;
  dateTo: string;
  status: '' | keyof ImportSummary;
  page: number;
};

export type EditableItem = {
  redeemed?: boolean;
  redemptionNote?: string;
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountPercent?: number;
  discountRoundingAdjustment?: number;
  tax: number;
  taxPercent?: number;
  taxRoundingAdjustment?: number;
};

export type PackageLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountPercent?: number;
  tax: number;
  taxPercent?: number;
};

export type Sheet = {
  name: string;
  totalRows: number;
  rows: { number: number; cells: string[] }[];
};
