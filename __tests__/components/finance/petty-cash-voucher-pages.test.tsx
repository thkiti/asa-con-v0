import { renderToStaticMarkup } from "react-dom/server"
import { PettyCashVoucherEditorPage } from "@/components/finance/PettyCashVoucherEditorPage"
import { PettyCashVoucherListPage } from "@/components/finance/PettyCashVoucherListPage"

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
  useFinanceCurrentReturnPath: () => "/finance/petty-cash-vouchers/pcv-1",
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

jest.mock("@/lib/finance-ui/petty-cash-vouchers", () => ({
  fetchPettyCashVouchers: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
  fetchPettyCashVoucher: jest.fn(),
  createPettyCashVoucherDraft: jest.fn(),
  updatePettyCashVoucherDraft: jest.fn(),
  deleteDraftPettyCashVoucher: jest.fn(),
  submitPettyCashVoucher: jest.fn(),
  confirmPettyCashVoucher: jest.fn(),
  cancelPettyCashVoucher: jest.fn(),
  postPettyCashVoucher: jest.fn(),
}))

jest.mock("@/lib/finance-ui/gl-accounts", () => ({
  fetchGlAccounts: jest.fn().mockResolvedValue({
    view: "flat",
    accounts: [
      {
        id: "acc-petty-1011",
        code: "1011",
        name: "เงินสดย่อย",
        accountType: "ASSET",
        isActive: true,
        deleted: false,
      },
    ],
    total: 1,
  }),
}))

import {
  filterPavPayFromAccountOptions,
  PAV_PAY_FROM_ACCOUNT_CODES,
} from "@/lib/finance-ui/pav-pay-from-accounts"
import type { GlAccountListRow } from "@/lib/finance/gl-account-list"
import type { PettyCashVoucherRead } from "@/lib/finance-ui/petty-cash-vouchers"

function asEntry(data: Record<string, unknown>): PettyCashVoucherRead {
  return data as PettyCashVoucherRead
}

function baseEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "pcv-1",
    entryNo: "PCV-260001",
    status: "DRAFT",
    branchId: "branch-1",
    legalEntityCode: "AS",
    entryDate: "2026-06-21T12:00:00.000Z",
    pettyCashAccountId: "acc-petty-1011",
    pettyCashAccountCode: "1011",
    pettyCashAccountName: "เงินสดย่อย",
    payeeName: "ABC Co.",
    refNo: null,
    description: "Supplies",
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
        glAccountId: "acc-petty-1011",
        accountCode: "1011",
        accountName: "เงินสดย่อย",
        debit: "0.00",
        credit: "1500.00",
        memo: "Petty cash payment",
      },
    ],
    ...overrides,
  }
}

describe("PettyCashVoucherEditorPage create", () => {
  it("renders locked petty cash account, muted cheque placeholder, and aligned balance box", () => {
    const html = renderToStaticMarkup(<PettyCashVoucherEditorPage mode="create" />)
    expect(html).toContain('data-testid="petty-cash-voucher-editor"')
    expect(html).toContain('data-testid="pcv-entry-meta-row-2"')
    expect(html).toContain('data-testid="field-petty-cash-account"')
    expect(html).toContain('readOnly=""')
    expect(html).toContain('aria-readonly="true"')
    expect(html).toContain('data-testid="field-cheque-no"')
    expect(html).toContain('placeholder="Cheque No."')
    expect(html).toContain('disabled=""')
    expect(html).toContain('data-testid="field-payee-name"')
    expect(html).toContain('data-testid="field-description"')
    expect(html).toContain("pcv-entry-meta-locked")
    expect(html).toContain('data-testid="pcv-petty-cash-balance"')
    expect(html).toContain("pcv-petty-cash-balance-box")
    expect(html).toContain("pcv-balance-table")
    expect(html).toContain("pcv-entry-meta-locked")
    expect(html).not.toContain("pcv-entry-meta-disabled")
    const pettyCashField = html.slice(
      html.indexOf('data-testid="field-petty-cash-account"') - 120,
      html.indexOf('data-testid="field-petty-cash-account"') + 80
    )
    expect(pettyCashField).toContain("pcv-entry-meta-locked")
    expect(pettyCashField).not.toContain("pcv-entry-meta-readonly")
    expect(html).toContain('data-testid="pcv-balance-current-row"')
    expect(html).toContain('data-testid="pcv-balance-this-voucher-row"')
    expect(html).toContain('data-testid="pcv-balance-after-row"')
    expect(html).toContain('data-testid="pcv-balance-current"')
    expect(html).toContain('data-testid="pcv-balance-this-voucher"')
    expect(html).toContain('data-testid="pcv-balance-after"')
    const currentRow = html.slice(
      html.indexOf('data-testid="pcv-balance-current-row"'),
      html.indexOf('data-testid="pcv-balance-this-voucher-row"')
    )
    const thisVoucherRow = html.slice(
      html.indexOf('data-testid="pcv-balance-this-voucher-row"'),
      html.indexOf('data-testid="pcv-balance-after-row"')
    )
    expect(currentRow.indexOf('data-testid="pcv-balance-current"')).toBeGreaterThan(
      currentRow.indexOf("<td></td>")
    )
    expect(thisVoucherRow.indexOf('data-testid="pcv-balance-this-voucher"')).toBeLessThan(
      thisVoucherRow.indexOf("<td></td>", thisVoucherRow.indexOf('data-testid="pcv-balance-this-voucher"') + 1)
    )
    expect(html).not.toContain("not available yet")
    expect(html.indexOf('data-testid="field-petty-cash-account"')).toBeLessThan(
      html.indexOf('data-testid="field-cheque-no"')
    )
    expect(html.indexOf('data-testid="field-cheque-no"')).toBeLessThan(
      html.indexOf('data-testid="field-payee-name"')
    )
    expect(html.indexOf('data-testid="field-payee-name"')).toBeLessThan(
      html.indexOf('data-testid="field-description"')
    )
  })
})

describe("PettyCashVoucherEditorPage edit DRAFT", () => {
  it("renders editable debit/credit lines and journal totals", () => {
    const html = renderToStaticMarkup(
      <PettyCashVoucherEditorPage
        mode="edit"
        entryId="pcv-1"
        initialEntry={asEntry(baseEntry({ status: "DRAFT" }))}
      />
    )
    expect(html).toContain("PCV-260001")
    expect(html).not.toContain('data-testid="pcv-derived-credit-line"')
    expect(html).toContain('data-testid="line-credit"')
    expect(html).toContain('data-testid="pcv-entry-totals"')
    expect(html).toContain('data-testid="pcv-balance-this-voucher"')
    expect(html).toContain("1,500.00")
  })
})

describe("PettyCashVoucherEditorPage edit POSTED", () => {
  it("renders POSTED print sheet without archived PDF panel", () => {
    const html = renderToStaticMarkup(
      <PettyCashVoucherEditorPage
        mode="edit"
        entryId="pcv-1"
        initialEntry={asEntry(
          baseEntry({
            status: "POSTED",
            submittedAt: "2026-06-21T13:00:00.000Z",
            confirmedAt: "2026-06-21T14:00:00.000Z",
            postedAt: "2026-06-21T15:00:00.000Z",
            postedJournalEntryId: "journal-pcv-1",
          })
        )}
      />
    )
    expect(html).toContain('data-testid="finance-voucher-print-root"')
    expect(html).toContain('data-testid="finance-voucher-print-sheet"')
    expect(html).toContain('data-testid="action-print-out"')
    expect(html).toContain("Payee")
    expect(html).toContain("Petty cash")
    expect(html).toContain("posted-journal-link")
    expect(html).not.toContain("finance-legacy-pdf-snapshot")
    expect(html).not.toContain('data-testid="action-post"')
    expect(html).not.toContain('data-testid="field-payee-name"')
  })
})

describe("PettyCashVoucherListPage", () => {
  it("renders list with new PCV link", () => {
    const html = renderToStaticMarkup(<PettyCashVoucherListPage />)
    expect(html).toContain('data-testid="petty-cash-voucher-list"')
    expect(html).toContain("/finance/petty-cash-vouchers/new")
  })
})

describe("PAV still excludes petty cash from pay-from", () => {
  it("whitelists bank accounts only", () => {
    expect(PAV_PAY_FROM_ACCOUNT_CODES).toEqual(["1021001", "1021002", "1021003"])
    const options = filterPavPayFromAccountOptions([
      {
        id: "acc-petty-1011",
        code: "1011",
        name: "เงินสดย่อย",
        accountType: "ASSET",
        isActive: true,
        deleted: false,
      },
      {
        id: "acc-bank-1021001",
        code: "1021001",
        name: "เงินฝากธนาคารกรุงเทพ - บัญชีกระแสรายวัน 0266",
        accountType: "ASSET",
        isActive: true,
        deleted: false,
      },
    ] as unknown as GlAccountListRow[])
    expect(options.map((row) => row.code)).toEqual(["1021001"])
    expect(options.every((row) => row.code !== "1011")).toBe(true)
  })
})

describe("MJV untouched by PCV", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const ROOT = path.join(__dirname, "..", "..", "..")

  it("ManualJournalEntryEditorPage does not use PCV test ids", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "components/finance/ManualJournalEntryEditorPage.tsx"),
      "utf8"
    )
    expect(source).not.toContain("petty-cash-voucher-editor")
    expect(source).not.toContain("pcv-petty-cash-balance")
  })
})
