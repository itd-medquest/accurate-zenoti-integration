import type { Page } from '@playwright/test';
import type { Actor } from '../../src/types';
import type { Batch } from '../../src/features/easyrecap/imports/types';
import type { ReceiptDetail, ReceiptRow } from '../../src/features/easyrecap/receipts/types';

export async function workspaceRoutingApi(
  page: Page,
  options: { role?: string; signedIn?: boolean } = {},
) {
  const actor: Actor = {
    id: 'routing-user',
    name: 'Routing User',
    email: 'routing@example.test',
    role: options.role ?? 'super_admin',
    active: true,
  };
  const state = { signedIn: options.signedIn ?? true };
  const reads: string[] = [];
  const writes: string[] = [];
  const completedReads: string[] = [];
  page.on('requestfinished', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'GET' && path.startsWith('/api/')) completedReads.push(path.slice(4));
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const batch: Batch = {
    id: 'route-batch',
    branchId: 'company',
    status: 'PREVIEW',
    version: 1,
    mode: 'simulation',
    createdAt: '2026-11-24T03:00:00Z',
    submittedAt: null,
    files: [],
    rows: [
      {
        id: 'row-route',
        fileId: 'source',
        invoiceId: null,
        status: 'VALID',
        syncStatus: null,
        errors: [],
        candidate: {
          sourceId: 'source',
          number: 'INV-ROUTING',
          sourceInvoiceNumber: 'INV-ROUTING',
          customer: 'Customer Routing',
          customerId: 'CUSTOMER-1',
          date: '2026-11-24',
          businessStatus: 'CLOSED',
          currency: 'IDR',
          subtotal: 100000,
          discount: 0,
          tax: 0,
          total: 100000,
          totalPaid: 100000,
          outstanding: 0,
          packageName: null,
          sourceFormat: 'PDF',
          warnings: [],
          items: [
            {
              id: 'item-1',
              name: 'Service Routing',
              quantity: 1,
              unitPrice: 100000,
              discount: 0,
              tax: 0,
            },
          ],
          payments: [],
          benefits: [],
        },
      },
    ],
  };
  const detail: ReceiptDetail = {
    draft: {
      id: 'route-receipt',
      invoiceId: 'invoice-route',
      branchId: 'company',
      databaseId: '99',
      number: 'RC-ROUTING',
      mappingId: null,
      mappingVersion: null,
      bank: null,
      method: null,
      sourceMethod: 'qris',
      grossAmount: 100000,
      rateBps: 0,
      feeAmount: 0,
      netAmount: 0,
      paymentDate: '2026-11-24',
      paymentReference: 'REFERENCE-ROUTING',
      notes: '',
      version: 1,
      status: 'DRAFT',
      targetId: null,
      targetNumber: null,
      bankAccountNo: null,
      bankAccountName: null,
      feeAccountNo: null,
      feeAccountName: null,
      error: null,
      completedAt: null,
      attemptedAt: null,
    },
    receiptNumber: 'RC-ROUTING',
    invoice: { number: 'INV-ROUTING', customer: 'Customer Routing', total: 100000 },
    source: {
      receiptNumber: 'RC-ROUTING',
      method: 'qris',
      paidAt: '2026-11-24',
      gross: 100000,
      grouped: false,
      payments: [{ id: 'payment-1', amount: 100000, method: 'qris', paidAt: '2026-11-24' }],
    },
    configuration: {
      database: { id: '99', name: 'Company Routing' },
      mappings: [],
      destinations: [],
      banks: ['BCA', 'BNI'],
      methods: ['CREDIT_CARD', 'DEBIT_CARD', 'QRIS', 'BANK_TRANSFER'],
      rates: { CREDIT_CARD: 200, DEBIT_CARD: 180, QRIS: 70, BANK_TRANSFER: 0 },
      rounding: 'ceil',
    },
    validation: { editable: true, message: null },
    delivery: { enabled: false, message: 'Review only' },
    balance: null,
    actions: { canCheck: false, canReopen: false, canSetNumber: false },
  };
  const receiptRow: ReceiptRow = {
    invoiceId: 'invoice-route',
    invoiceNumber: 'INV-ROUTING',
    customer: 'Customer Routing',
    branchId: 'company',
    branchName: 'Company Routing',
    sourceKey: 'source-1',
    sourceMethod: 'qris',
    paidAt: '2026-11-24T00:00:00Z',
    gross: 100000,
    grouped: false,
    paymentCount: 1,
    status: 'DRAFT',
    draft: detail.draft,
    error: null,
  };
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    (request.method() === 'GET' ? reads : writes).push(path);
    const json = (value: unknown, status = 200) => route.fulfill({ json: value, status });
    if (path === '/auth/sign-in/email') {
      state.signedIn = true;
      return json({ user: actor, redirect: false });
    }
    if (path === '/auth/sign-out') {
      state.signedIn = false;
      return json({ success: true });
    }
    if (path === '/auth/get-session')
      return json(
        state.signedIn
          ? {
              user: actor,
              session: {
                id: 'routing-session',
                userId: actor.id,
                expiresAt: '2099-01-01T00:00:00Z',
              },
            }
          : null,
      );
    if (path === '/me') return json(actor);
    if (path === '/branches')
      return json([
        {
          id: 'company',
          name: 'Company Routing',
          centerId: 'CENTER',
          accurateDatabaseId: '99',
          accurateBranchId: '300',
          active: true,
        },
      ]);
    if (path === '/dashboard')
      return json({
        summary: {
          total: 0,
          synced: 0,
          processing: 0,
          failed: 0,
          pending: 0,
          closed: 0,
          open: 0,
          outstanding: 0,
        },
        rate: 0,
        trend: [],
        recent: [],
        errors: [],
      });
    if (path === '/invoices') return json({ rows: [], total: 0, page: 1, pageSize: 5 });
    if (path === '/imports/overview')
      return json({
        items: [
          {
            id: batch.id,
            status: batch.status,
            branchId: batch.branchId,
            createdAt: batch.createdAt,
            version: 1,
            invoiceCount: 1,
            references: ['INV-ROUTING'],
            counts: {
              sent: 0,
              draft: 1,
              failed: 0,
              redeem: 0,
              processing: 0,
              simulation: 0,
              local: 0,
            },
          },
        ],
        total: 1,
        summary: { sent: 0, draft: 1, failed: 0, redeem: 0, processing: 0 },
      });
    if (path === '/imports/route-batch') return json(batch);
    if (path === '/receipts/route-receipt') return json(detail);
    if (path === '/receipts')
      return json({
        items: [receiptRow],
        total: 1,
        page: 1,
        pageSize: 25,
        summary: { review: 0, draft: 1, processing: 0, succeeded: 0, attention: 0 },
      });
    if (path === '/accurate/status')
      return json({ enabled: false, configured: false, mode: 'simulation' });
    if (path === '/settings')
      return json({
        enabled: false,
        accurate: { mode: 'simulation', configured: false },
        ocr: { packageTaxPolicy: 'proportional' },
      });
    if (path === '/audit/overview')
      return json({ items: [], total: 0, page: 1, pageSize: 25, actions: [], actors: [] });
    if (path === '/jobs' || path === '/users') return json([]);
    return json({ error: 'Fixture record unavailable.' }, 404);
  });
  return { actor, state, batch, reads, completedReads, writes, errors };
}
