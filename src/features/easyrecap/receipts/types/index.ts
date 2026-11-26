export type ReceiptBank = 'BCA' | 'BNI';
export type ReceiptMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'QRIS' | 'BANK_TRANSFER';
export type ReceiptAmountMode = 'FULL' | 'NET' | 'GROSS';
export type ReceiptStatus =
  'TO_REVIEW' | 'DRAFT' | 'QUEUED' | 'SENDING' | 'SUCCEEDED' | 'PARTIAL' | 'NEEDS_REVIEW';
export type ReceiptStatusFilter = ReceiptStatus | 'PROCESSING';
export type ReceiptAccount = { id: string; code: string; name: string; type: string };
export type ReceiptMapping = {
  id: string;
  branchId: string;
  databaseId: string;
  bank: ReceiptBank;
  method: ReceiptMethod;
  accountId: string;
  accountNo: string;
  accountName: string;
  feeAccountId: string | null;
  feeAccountNo: string | null;
  feeAccountName: string | null;
  rateBps?: number | null;
  version: number;
};
export type ReceiptConfiguration = {
  database: { id: string; name: string };
  banks: ReceiptBank[];
  methods: ReceiptMethod[];
  mappings: ReceiptMapping[];
  rates: Record<ReceiptMethod, number>;
  rounding: 'ceil';
  destinations: { branchId: string; databaseId: string; targetBranchId: string }[];
};
export type ReceiptDraft = {
  mode?: 'simulation' | 'live';
  id: string;
  invoiceId: string;
  branchId: string;
  databaseId: string;
  number: string;
  mappingId: string | null;
  mappingVersion: number | null;
  bank: ReceiptBank | null;
  method: ReceiptMethod | null;
  sourceMethod: string;
  grossAmount: number;
  amountMode?: ReceiptAmountMode;
  inputAmount?: number | null;
  receiptSequence?: number;
  rateBps: number;
  rateOverrideBps?: number | null;
  feeAmount: number;
  netAmount: number;
  paymentDate: string;
  paymentReference: string;
  notes: string;
  version: number;
  status: ReceiptStatus;
  targetId: string | null;
  targetNumber: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  feeAccountNo: string | null;
  feeAccountName: string | null;
  error: string | null;
  completedAt: string | null;
  attemptedAt: string | null;
};
export type ReceiptRow = {
  mode?: 'simulation' | 'live';
  settlement?: {
    gross: number;
    settled: number;
    remaining: number;
    paymentCount: number;
    fee?: number;
  };
  invoiceId: string;
  invoiceNumber: string;
  customer: string;
  branchId: string;
  branchName: string;
  sourceKey: string;
  sourceMethod: string;
  paidAt: string;
  gross: number | null;
  grouped: boolean;
  paymentCount: number;
  status: ReceiptStatus;
  draft: ReceiptDraft | null;
  error: string | null;
};
export type ReceiptOverview = {
  items: ReceiptRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    review: number;
    draft: number;
    processing: number;
    succeeded: number;
    attention: number;
    partial?: number;
  };
};
export type ReceiptDetail = {
  settlement?: {
    available: number;
    settled: number;
    remaining: number;
    invoiceGross: number;
    invoiceSettled: number;
    invoiceRemaining: number;
    payments: {
      key: string;
      method: string;
      paidAt: string;
      gross: number;
      settled: number;
      remaining: number;
      receiptId: string | null;
    }[];
    history: {
      id: string;
      number: string;
      gross: number;
      fee: number;
      net: number;
      method: ReceiptMethod | null;
      status: ReceiptStatus;
      paymentDate: string;
      error: string | null;
    }[];
    feeBasis: Record<ReceiptMethod, { gross: number; fee: number }>;
    feeBasisByRate?: {
      method: ReceiptMethod | null;
      rateBps: number;
      gross: number;
      fee: number;
    }[];
  };
  draft: ReceiptDraft;
  receiptNumber: string | null;
  invoice: { number: string; customer: string; total: number };
  source: {
    key?: string;
    receiptNumber: string | null;
    method: string;
    paidAt: string;
    gross: number;
    grouped: boolean;
    payments: { id: string; amount: number; method: string; paidAt: string }[];
  };
  configuration: ReceiptConfiguration;
  validation: { editable: boolean; message: string | null };
  delivery: { enabled: boolean; message: string };
  balance: { outstanding: number; checkedAt: string } | null;
  actions: { canCheck: boolean; canReopen: boolean; canSetNumber: boolean; canContinue?: boolean };
};
export type ReceiptFilters = {
  search: string;
  branch: string;
  status: ReceiptStatusFilter | '';
  from: string;
  to: string;
  page: number;
  pageSize: number;
};
export const methodLabels: Record<ReceiptMethod, string> = {
  CREDIT_CARD: 'Kartu kredit (CC)',
  DEBIT_CARD: 'Kartu debit',
  QRIS: 'QRIS',
  BANK_TRANSFER: 'Transfer rekening langsung',
};
export const sourceMethodLabels: Record<string, string> = {
  mixed: 'Beberapa pembayaran',
  card: 'Kartu — pilih CC atau debit',
  qris: 'QRIS',
  bank: 'Transfer bank',
  cash: 'Tunai',
  gift_card: 'Gift card',
  voucher: 'Voucher',
  other: 'Perlu diperiksa',
};
export const statusLabels: Record<ReceiptStatus, string> = {
  PARTIAL: 'Diterima sebagian',
  TO_REVIEW: 'Belum direview',
  DRAFT: 'Draft',
  QUEUED: 'Dalam antrean',
  SENDING: 'Sedang dikirim',
  SUCCEEDED: 'Berhasil',
  NEEDS_REVIEW: 'Perlu diperiksa',
};
export const receiptFilterLabels: Record<ReceiptStatusFilter, string> = {
  ...statusLabels,
  PROCESSING: 'Sedang diproses',
};
