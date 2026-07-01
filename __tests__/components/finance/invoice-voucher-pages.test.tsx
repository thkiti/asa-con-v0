import { renderToStaticMarkup } from "react-dom/server"
import { InvoiceVoucherEditorPage } from "@/components/finance/InvoiceVoucherEditorPage"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock("@/lib/finance-ui/finance-voucher-local-font", () => ({
  financeVoucherLocalFont: {
    variable: "font-finance-voucher",
    className: "font-finance-voucher",
  },
}))

jest.mock("@/lib/finance-ui/use-finance-current-return-path", () => ({
  useFinanceCurrentReturnPath: () => "/finance/invoice-vouchers/inv-1",
}))

jest.mock("@/lib/finance-ui/manual-journal-entry-session", () => ({
  fetchManualJournalSessionContext: jest.fn().mockResolvedValue({
    staffId: "staff-1",
    branchId: "branch-1",
    branchCode: "HO999",
    branchName: "Head Office",
    documentEntityCode: "AS",
    role: "HO_FINANCE",
  }),
}))

jest.mock("@/lib/finance-ui/invoice-vouchers", () => ({
  fetchInvoiceVouchers: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
  fetchInvoiceVoucher: jest.fn(),
  createInvoiceVoucherDraft: jest.fn(),
  updateInvoiceVoucherDraft: jest.fn(),
  deleteDraftInvoiceVoucher: jest.fn(),
  submitInvoiceVoucher: jest.fn(),
  confirmInvoiceVoucher: jest.fn(),
  cancelInvoiceVoucher: jest.fn(),
  postInvoiceVoucher: jest.fn(),
}))

jest.mock("@/lib/finance-ui/gl-accounts", () => ({
  fetchGlAccounts: jest.fn().mockResolvedValue({
    view: "flat",
    accounts: [{ code: "1100", name: "Cash" }],
    total: 1,
  }),
}))

import type { InvoiceVoucherRead } from "@/lib/finance-ui/invoice-vouchers"

function asEntry(data: Record<string, unknown>): InvoiceVoucherRead {
  return data as InvoiceVoucherRead
}

function baseEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    entryNo: "INV-260001",
    status: "DRAFT",
    branchId: "branch-1",
    legalEntityCode: "AS",
    invoiceDate: "2026-06-14T12:00:00.000Z",
    dueDate: "2026-07-14T12:00:00.000Z",
    customerName: "Acme Co",
    description: "Test invoice",
    refNo: null,
    createdByStaffId: "staff-1",
    submittedAt: null,
    submittedByStaffId: null,
    confirmedAt: null,
    confirmedByStaffId: null,
    postedAt: null,
    postedByStaffId: null,
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    postedVoucherId: null,
    postedJournalEntryId: null,
    createdAt: "2026-06-14T12:00:00.000Z",
    updatedAt: "2026-06-14T12:00:00.000Z",
    lines: [
      {
        id: "line-1",
        lineNo: 1,
        glAccountId: "acc-1",
        accountCode: "1100",
        accountName: "Cash",
        debit: "1000.00",
        credit: "0.00",
        memo: null,
      },
      {
        id: "line-2",
        lineNo: 2,
        glAccountId: "acc-2",
        accountCode: "4100",
        accountName: "Revenue",
        debit: "0.00",
        credit: "1000.00",
        memo: null,
      },
    ],
    ...overrides,
  }
}

describe("InvoiceVoucherEditorPage edit POSTED", () => {
  it("renders POSTED print sheet with MJV-style compact actions", () => {
    const html = renderToStaticMarkup(
      <InvoiceVoucherEditorPage
        mode="edit"
        entryId="inv-1"
        initialEntry={asEntry(
          baseEntry({
            status: "POSTED",
            submittedAt: "2026-06-21T13:00:00.000Z",
            confirmedAt: "2026-06-21T14:00:00.000Z",
            postedAt: "2026-06-21T15:00:00.000Z",
            postedJournalEntryId: "journal-inv-1",
          })
        )}
      />
    )
    expect(html).toContain('data-testid="finance-voucher-print-root"')
    expect(html).toContain('data-testid="finance-document-summary-row"')
    expect(html).toContain('data-testid="posted-document-sticky-bar"')
    expect(html).toContain("posted-journal-link")
    expect(html).toContain('data-testid="legacy-pdf-missing-message"')
    expect(html).not.toContain('data-testid="action-print-out"')
    expect(html).not.toContain('data-testid="action-save-pdf"')
    expect(html).not.toContain('data-testid="action-download-pdf"')
    expect(html).toContain("finance-voucher-print-root--embedded")
    expect(html).not.toContain("branch-1")
  })
})

describe("INV document page shell", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const ROOT = path.join(__dirname, "..", "..", "..")

  it("wraps invoice voucher list and detail pages in FinanceDocumentContainer", () => {
    for (const rel of [
      "app/(main)/finance/invoice-vouchers/page.tsx",
      "app/(main)/finance/invoice-vouchers/[id]/page.tsx",
    ]) {
      const source = fs.readFileSync(path.join(ROOT, rel), "utf8")
      expect(source).toContain("FinanceDocumentContainer")
      expect(source).toContain("financeDocumentPageClass")
      expect(source).not.toContain("financeAdminPageClass")
    }
  })

  it("detail page uses INVOICE document title", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app/(main)/finance/invoice-vouchers/[id]/page.tsx"),
      "utf8"
    )
    expect(source).toContain('title="INVOICE"')
  })
})
