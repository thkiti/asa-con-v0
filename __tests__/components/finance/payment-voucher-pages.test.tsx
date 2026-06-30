import { renderToStaticMarkup } from "react-dom/server"
import { PaymentVoucherEditorPage } from "@/components/finance/PaymentVoucherEditorPage"
import { PaymentVoucherListPage } from "@/components/finance/PaymentVoucherListPage"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock("@/lib/finance-ui/finance-voucher-local-font", () => ({
  financeVoucherLocalFont: {
    variable: "font-finance-voucher",
    className: "font-finance-voucher",
  },
}))

jest.mock("@/lib/finance-ui/use-finance-current-return-path", () => ({
  useFinanceCurrentReturnPath: () => "/finance/payment-vouchers/pav-1",
}))

jest.mock("@/lib/finance-ui/payment-vouchers", () => ({
  fetchPaymentVouchers: jest.fn().mockResolvedValue({
    entries: [
      {
        id: "pav-1",
        entryNo: "PAV-260001",
        status: "DRAFT",
        branchId: "branch-1",
        legalEntityCode: "AS",
        entryDate: "2026-06-21T12:00:00.000Z",
        payeeName: "ABC Co.",
        totalAmount: "1500.00",
        lineCount: 1,
        createdByStaffId: "staff-1",
        postedAt: null,
        createdAt: "2026-06-21T12:00:00.000Z",
      },
    ],
    total: 1,
  }),
  fetchPaymentVoucher: jest.fn(),
  createPaymentVoucherDraft: jest.fn(),
  updatePaymentVoucherDraft: jest.fn(),
  deleteDraftPaymentVoucher: jest.fn(),
  submitPaymentVoucher: jest.fn(),
  confirmPaymentVoucher: jest.fn(),
  cancelPaymentVoucher: jest.fn(),
  postPaymentVoucher: jest.fn(),
}))

jest.mock("@/lib/finance-ui/manual-journal-entry-session", () => ({
  fetchManualJournalSessionContext: jest.fn().mockResolvedValue({
    staffId: "staff-1",
    branchId: "branch-1",
    branchCode: "HO999",
    branchName: "Head Office",
    documentEntityCode: "AS",
  }),
}))

jest.mock("@/components/document-archive/DocumentArchiveVaultActions", () => ({
  DocumentArchiveVaultActions: () => (
    <button type="button" data-testid="action-upload-pdf">
      Upload PDF
    </button>
  ),
}))

jest.mock("@/lib/document-archive-ui/client", () => ({
  fetchDocumentArchivePdfStatus: jest.fn().mockResolvedValue(false),
  uploadDocumentArchivePdf: jest.fn(),
}))

const mockPayFromAccounts = [
  {
    id: "acc-bank-1021001",
    code: "1021001",
    name: "เงินฝากธนาคารกรุงเทพ - บัญชีกระแสรายวัน 0266",
    accountType: "ASSET",
    isActive: true,
    deleted: false,
  },
  {
    id: "acc-bank-1021002",
    code: "1021002",
    name: "เงินฝากธนาคารกรุงเทพ - บัญชีออมทรัพย์ 0274",
    accountType: "ASSET",
    isActive: true,
    deleted: false,
  },
  {
    id: "acc-bank-1021003",
    code: "1021003",
    name: "เงินฝากธนาคารกรุงเทพ - บัญชีออมทรัพย์ 0806",
    accountType: "ASSET",
    isActive: true,
    deleted: false,
  },
  {
    id: "acc-bank-other",
    code: "10101001",
    name: "Kasikorn Current",
    accountType: "ASSET",
    isActive: true,
    deleted: false,
  },
  {
    id: "acc-petty",
    code: "11030100",
    name: "Petty Cash",
    accountType: "ASSET",
    isActive: true,
    deleted: false,
  },
]

jest.mock("@/lib/finance-ui/gl-accounts", () => ({
  fetchGlAccounts: jest.fn().mockImplementation(async (filter?: { search?: string }) => {
    if (filter?.search) {
      const match = mockPayFromAccounts.find((row) => row.code === filter.search)
      return {
        view: "flat",
        accounts: match ? [match] : [],
        total: match ? 1 : 0,
      }
    }
    return {
      view: "flat",
      accounts: mockPayFromAccounts,
      total: mockPayFromAccounts.length,
    }
  }),
}))

import type { PaymentVoucherRead } from "@/lib/finance-ui/payment-vouchers"
import {
  filterPavPayFromAccountOptions,
  formatPavPayFromOptionLabel,
  isPettyCashGlAccount,
  PAV_PAY_FROM_ACCOUNT_CODES,
  shortenPavPayFromDisplayName,
} from "@/lib/finance-ui/pav-pay-from-accounts"
import { formatThaiBahtAmountInWords } from "@/lib/finance-ui/format-thai-baht-words"
import type { GlAccountListRow } from "@/lib/finance/gl-account-list"

function asEntry(data: Record<string, unknown>): PaymentVoucherRead {
  return data as PaymentVoucherRead
}

function baseEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "pav-1",
    entryNo: "PAV-260001",
    status: "DRAFT",
    branchId: "branch-1",
    legalEntityCode: "AS",
    entryDate: "2026-06-21T12:00:00.000Z",
    payFromAccountId: "acc-bank-1",
    payFromAccountCode: "10101001",
    payFromAccountName: "Kasikorn Current",
    payeeName: "ABC Co.",
    refNo: "INV-1",
    chequeNo: null,
    description: "Office supplies",
    totalAmount: "1500.00",
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
    createdAt: "2026-06-21T12:00:00.000Z",
    updatedAt: "2026-06-21T12:00:00.000Z",
    lines: [
      {
        id: "line-1",
        lineNo: 1,
        glAccountId: "acc-exp",
        accountCode: "50101001",
        accountName: "Office supplies",
        debit: "1500.00",
        credit: "0.00",
        memo: "June",
      },
      {
        id: "line-2",
        lineNo: 2,
        glAccountId: "acc-bank-1",
        accountCode: "10101001",
        accountName: "Kasikorn Current",
        debit: "0.00",
        credit: "1500.00",
        memo: "Payment",
      },
    ],
    ...overrides,
  }
}

describe("PaymentVoucherListPage", () => {
  it("renders list filters, search, and entry link", () => {
    const html = renderToStaticMarkup(<PaymentVoucherListPage />)
    expect(html).toContain('data-testid="payment-voucher-list"')
    expect(html).toContain("filter-search")
    expect(html).toContain("filter-status")
    expect(html).toContain("filter-legal-entity")
    expect(html).toContain("Loading payment vouchers")
    expect(html).toContain("/finance/payment-vouchers/new")
    expect(html).toContain("New PAV")
  })
})

describe("PaymentVoucherEditorPage create", () => {
  it("renders compact header, MJV-style debit/credit lines, and journal total footer", () => {
    const html = renderToStaticMarkup(<PaymentVoucherEditorPage mode="create" />)
    expect(html).toContain('data-testid="payment-voucher-editor"')
    expect(html).toContain('data-testid="pav-entry-shell"')
    expect(html).toContain('data-testid="pav-entry-meta-row-1"')
    expect(html).toContain('data-testid="pav-entry-meta-row-2"')
    expect(html).toContain("Draft / Pending number")
    expect(html).toContain("Ref. No.:")
    expect(html).toContain("Date prepared:")
    expect(html).toContain("pav-entry-meta-row-2")
    expect(html).toContain("pav-entry-meta-pay-from")
    expect(html).toContain("pav-entry-meta-cheque")
    expect(html).toContain("pav-entry-meta-payee")
    expect(html).toContain("pav-entry-meta-description")
    expect(html).toContain('placeholder="Description"')
    expect(html).toContain('placeholder="Cheque No."')
    expect(html).toContain('placeholder="Payee"')
    expect(html).toContain('data-testid="field-pay-from-select"')
    expect(html).toContain('data-testid="field-description"')
    expect(html.indexOf('data-testid="pav-entry-meta-row-2"')).toBeLessThan(
      html.indexOf('data-testid="field-pay-from-select"')
    )
    expect(html.indexOf('data-testid="field-pay-from-select"')).toBeLessThan(
      html.indexOf('data-testid="field-cheque-no"')
    )
    expect(html.indexOf('data-testid="field-cheque-no"')).toBeLessThan(
      html.indexOf('data-testid="field-payee-name"')
    )
    expect(html.indexOf('data-testid="field-payee-name"')).toBeLessThan(
      html.indexOf('data-testid="field-description"')
    )
    const row1Start = html.indexOf('data-testid="pav-entry-meta-row-1"')
    const row2Start = html.indexOf('data-testid="pav-entry-meta-row-2"')
    expect(html.slice(row1Start, row2Start)).not.toContain('data-testid="field-description"')
    expect(html).not.toContain("Pay from account:")
    expect(html).not.toContain('data-testid="field-pay-from-code"')
    expect(html).not.toContain("Petty Cash")
    expect(html).not.toContain('data-testid="derived-credit-preview"')
    expect(html).not.toContain("Derived credit (not editable)")
    expect(html).not.toContain("allocation-warning")
    expect(html).toContain('data-testid="pav-amount-in-words"')
    expect(html).toContain("## ศูนย์บาทถ้วน ##")
    expect(html).toContain(">Account</th>")
    expect(html).toContain(">Debit</th>")
    expect(html).toContain(">Credit</th>")
    expect(html).toContain(">Memo</th>")
    expect(html).not.toContain(">Description</th>")
    expect(html).not.toContain(">Name</th>")
    expect(html).toContain('data-testid="line-account-code"')
    expect(html).toContain('data-testid="line-debit"')
    expect(html).toContain('data-testid="line-credit"')
    expect(html).toContain('data-testid="line-memo"')
    expect(html).toContain('data-testid="pav-entry-totals"')
    expect(html).toContain(">Total</td>")
    expect(html).toContain('data-testid="line-total-debit"')
    expect(html).toContain('data-testid="line-total-credit"')
    expect(html).not.toContain("Debit total")
    expect(html.indexOf('data-testid="pav-entry-totals"')).toBeLessThan(
      html.indexOf('data-testid="workflow-actions"')
    )
    expect(html).toContain('data-testid="action-save"')
    expect(html).toContain('data-testid="action-submit"')
    expect(html).not.toContain('data-testid="action-delete"')
    expect(html).not.toContain("finance-legacy-pdf-snapshot")
  })
})

describe("PaymentVoucherEditorPage edit by status", () => {
  it("renders DRAFT with pay-from select, editable credit lines, and journal totals", () => {
    const html = renderToStaticMarkup(
      <PaymentVoucherEditorPage
        mode="edit"
        entryId="pav-1"
        initialEntry={asEntry(baseEntry({ status: "DRAFT" }))}
      />
    )
    expect(html).toContain("PAV-260001")
    expect(html).toContain('data-testid="field-pay-from-select"')
    expect(html).not.toContain('data-testid="pav-derived-credit-line"')
    expect(html).toContain('data-testid="line-credit"')
    expect(html).toContain("1,500.00")
    expect(html).toContain('data-testid="pav-amount-in-words"')
    expect(html).toContain("## หนึ่งพันห้าร้อยบาทถ้วน ##")
    expect(html).toContain('data-testid="action-save"')
    expect(html).toContain('data-testid="action-submit"')
    expect(html).toContain('data-testid="action-delete"')
    expect(html).toContain('data-testid="line-account-code"')
    expect(html).not.toContain('data-testid="derived-credit-preview"')
    expect(html).not.toContain("allocation-warning")
  })

  it("renders SUBMITTED confirm and cancel with read-only lines and journal totals", () => {
    const html = renderToStaticMarkup(
      <PaymentVoucherEditorPage
        mode="edit"
        entryId="pav-1"
        initialEntry={asEntry(
          baseEntry({
            status: "SUBMITTED",
            submittedAt: "2026-06-21T13:00:00.000Z",
          })
        )}
      />
    )
    expect(html).toContain('data-testid="action-confirm"')
    expect(html).toContain('data-testid="action-cancel-open"')
    expect(html).not.toContain('data-testid="action-save"')
    expect(html).not.toContain('data-testid="line-account-code"')
    expect(html).not.toContain('data-testid="pav-derived-credit-line"')
    expect(html).toContain('data-testid="pav-entry-totals"')
    expect(html).toContain(">Total</td>")
    expect(html).toContain("read-only")
  })

  it("renders CONFIRMED post and cancel buttons", () => {
    const html = renderToStaticMarkup(
      <PaymentVoucherEditorPage
        mode="edit"
        entryId="pav-1"
        initialEntry={asEntry(
          baseEntry({
            status: "CONFIRMED",
            confirmedAt: "2026-06-21T14:00:00.000Z",
          })
        )}
      />
    )
    expect(html).toContain('data-testid="action-post"')
    expect(html).toContain('data-testid="action-cancel-open"')
    expect(html).not.toContain('data-testid="action-confirm"')
  })

  it("renders POSTED print sheet without archived PDF panel", () => {
    const html = renderToStaticMarkup(
      <PaymentVoucherEditorPage
        mode="edit"
        entryId="pav-1"
        initialEntry={asEntry(
          baseEntry({
            status: "POSTED",
            submittedAt: "2026-06-21T13:00:00.000Z",
            confirmedAt: "2026-06-21T14:00:00.000Z",
            postedAt: "2026-06-21T15:00:00.000Z",
            postedJournalEntryId: "journal-pav-1",
            totalAmount: "1500.00",
          })
        )}
      />
    )
    expect(html).toContain('data-testid="finance-voucher-print-root"')
    expect(html).toContain('data-testid="finance-voucher-print-sheet"')
    expect(html).toContain('data-testid="action-print-out"')
    expect(html).toContain('data-testid="action-upload-pdf"')
    expect(html).toContain("Payee")
    expect(html).toContain("Pay from")
    expect(html).toContain("posted-journal-link")
    expect(html).not.toContain("finance-legacy-pdf-snapshot")
    expect(html).not.toContain('data-testid="action-post"')
    expect(html).not.toContain('data-testid="field-pay-from-select"')
  })
})

describe("PAV entry header layout", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const ROOT = path.join(__dirname, "..", "..", "..")

  it("uses CSS grid for meta row 2 at desktop width", () => {
    const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8")
    expect(css).toMatch(/\.pav-entry-meta-row-2[\s\S]*display:\s*grid/)
    expect(css).toMatch(/\.pav-entry-meta-row-2[\s\S]*grid-template-columns:\s*240px\s*160px\s*300px\s*326px/)
    expect(css).toMatch(/\.pav-entry-meta-row-2[\s\S]*gap:\s*8px/)
  })
})

describe("PAV pay-from account options", () => {
  it("includes only whitelisted bank accounts in fixed order", () => {
    expect(PAV_PAY_FROM_ACCOUNT_CODES).toEqual(["1021001", "1021002", "1021003"])
    const options = filterPavPayFromAccountOptions(
      mockPayFromAccounts as unknown as GlAccountListRow[]
    )
    expect(options.map((row) => row.code)).toEqual(["1021001", "1021002", "1021003"])
    expect(options.map((row) => row.id)).toEqual([
      "acc-bank-1021001",
      "acc-bank-1021002",
      "acc-bank-1021003",
    ])
    expect(options.every((row) => !isPettyCashGlAccount(row))).toBe(true)
  })

  it("shortens dropdown labels without changing stored account name", () => {
    const fullName = "เงินฝากธนาคารกรุงเทพ - บัญชีกระแสรายวัน 0266"
    expect(shortenPavPayFromDisplayName(fullName)).toBe("กระแสรายวัน 0266")
    expect(formatPavPayFromOptionLabel("1021001", fullName)).toBe(
      "1021001 • กระแสรายวัน 0266"
    )
    expect(formatPavPayFromOptionLabel("1021002", "เงินฝากธนาคารกรุงเทพ - บัญชีออมทรัพย์ 0274")).toBe(
      "1021002 • ออมทรัพย์ 0274"
    )
    expect(formatPavPayFromOptionLabel("1021003", "เงินฝากธนาคารกรุงเทพ - บัญชีออมทรัพย์ 0806")).toBe(
      "1021003 • ออมทรัพย์ 0806"
    )
  })
})

describe("PAV amount in words", () => {
  it("formats zero and whole-baht totals", () => {
    expect(formatThaiBahtAmountInWords(0)).toBe("## ศูนย์บาทถ้วน ##")
    expect(formatThaiBahtAmountInWords("3000.00")).toBe("## สามพันบาทถ้วน ##")
  })
})

describe("PAV route pages keep dark EntityContextPageHeading", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const ROOT = path.join(__dirname, "..", "..", "..")

  it("new PAV page uses EntityContextPageHeading with NEW PAYMENT VOUCHER", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app/(main)/finance/payment-vouchers/new/page.tsx"),
      "utf8"
    )
    expect(source).toContain("EntityContextPageHeading")
    expect(source).toContain("NEW PAYMENT VOUCHER")
  })

  it("edit PAV page uses EntityContextPageHeading with PAYMENT VOUCHER", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app/(main)/finance/payment-vouchers/[id]/page.tsx"),
      "utf8"
    )
    expect(source).toContain("EntityContextPageHeading")
    expect(source).toContain("PAYMENT VOUCHER")
  })
})

describe("MJV files remain untouched by PAV editor refactor", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const ROOT = path.join(__dirname, "..", "..", "..")
  const mjvEditor = path.join(ROOT, "components", "finance", "ManualJournalEntryEditorPage.tsx")

  it("ManualJournalEntryEditorPage does not use PAV pay-from select test ids", () => {
    const source = fs.readFileSync(mjvEditor, "utf8")
    expect(source).not.toContain("field-pay-from-select")
    expect(source).not.toContain("pav-derived-credit-line")
    expect(source).not.toContain("pav-entry-totals")
  })
})
