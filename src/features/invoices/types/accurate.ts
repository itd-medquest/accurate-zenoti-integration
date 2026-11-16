export type AccurateMaster = { id: string; code: string; name: string; unitName: string };
export type CustomerPreparation = {
  requestId: string;
  databaseId: string;
  databaseName: string;
  customerNo: string;
  defaults: {
    categoryName: string;
    branchId: number;
    branchName: string;
    currencyCode: string;
    currencyName: string;
    priceCategoryName: string;
    discountCategoryName: string;
    termName: string;
  };
};
export type AccurateDestination = {
  branchId: string;
  databaseId: string;
  databaseName: string;
  targetBranchId: string;
  targetBranchName: string;
};
export type AccurateStatus = {
  mode: 'simulation' | 'live';
  enabled: boolean;
  configured: boolean;
  taxPolicy: 'gross-no-tax';
  destinations: AccurateDestination[];
};
export type AccurateSelection = {
  databaseId: string;
  targetBranchId: string;
  customer?: { id: string; code: string; name: string };
  items: Record<string, AccurateMaster>;
};
export type DeliveredInvoice = {
  invoiceId: string;
  number: string;
  customer: string;
  date: string;
  total: number;
  targetId: string;
  targetNumber: string;
  databaseId: string;
};
