import { renderToStaticMarkup } from "react-dom/server"
import { RevenueVoucherEditorPage } from "@/components/finance/RevenueVoucherEditorPage"
import { RevenueVoucherListPage } from "@/components/finance/RevenueVoucherListPage"
import {
  filterRevReceiveToAccountOptions,
  REV_RECEIVE_TO_ACCOUNT_CODES,
} from "@/lib/finance-ui/rev-receive-to-accounts"
import type { GlAccountListRow } from "@/lib/finance/gl-account-list"
import type { RevenueVoucherRead } from "@/lib/finance-ui/revenue-vouchers"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock("@/lib/finance-ui/use-finance-current-return-path", () => ({
  useFinanceCurrentReturnPath: () => "/finance/revenue-vouchers/rev-1",
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

jest.mock("@/lib/finance-ui/revenue-vouchers", () => ({
  fetchRevenueVouchers: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
  fetchRevenueVoucher: jest.fn(),
  createRevenueVoucherDraft: jest.fn(),
  updateRevenueVoucherDraft: jest.fn(),
  deleteDraftRevenueVoucher: jest.fn(),
  submitRevenueVoucher: jest.fn(),
  confirmRevenueVoucher: jest.fn(),
  cancelRevenueVoucher: jest.fn(),
  postRevenueVoucher: jest.fn(),
}))

jest.mock("@/lib/finance-ui/gl-accounts", () => ({
  fetchGlAccounts: jest.fn().mockResolvedValue({
    view: "flat",
    accounts: [
      {
        id: "acc-bank-1021001",
        code: "1021001",
        name: "เงินฝากธนาคารกรุงเทพ - บัญชีกระแสรายวัน 0266",
        accountType: "ASSET",
        isActive: true,
        deleted: false,
      },
      {
        id: "acc-petty-1011",
        code: "1011",
        name: "เงินสดย่อย",
        accountType: "ASSET",
        isActive: true,
        deleted: false,
      },
    ],
    total: 2,
  }),
}))

function asEntry(data: Record<string, unknown>): RevenueVoucherRead {
  return data as RevenueVoucherRead
}

function baseEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "rev-1",
    entryNo: "REV-260001",
    status: "DRAFT",
    branchId: "branch-1",
    legalEntityCode: "AS",
    entryDate: "2026-06-21T12:00:00.000Z",
    receiveToAccountId: "acc-bank-1021001",
    receiveToAccountCode: "1021001",
    receiveToAccountName: "เงินฝากธนาคารกรุงเทพ - บัญชีกระแสรายวัน 0266",
    receivedFromName: "Customer A",
    refNo: null,
    receiptNo: "RC-001",
    description: "Consulting",
    totalAmount: "3000.00",
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
        glAccountId: "acc-rev",
        accountCode: "40101001",
        accountName: "Service revenue",
        debit: "0.00",
        credit: "3000.00",
        memo: "June",
      },
    ],
    ...overrides,
  }
}

describe("RevenueVoucherEditorPage create", () => {
  it("renders receive-to dropdown, credit lines, derived debit, and amount in words", () => {
    const html = renderToStaticMarkup(<RevenueVoucherEditorPage mode="create" />)
    expect(html).toContain('data-testid="revenue-voucher-editor"')
    expect(html).toContain('data-testid="field-receive-to-select"')
    expect(html).toContain('data-testid="field-receipt-no"')
    expect(html).toContain('data-testid="field-received-from-name"')
    expect(html).toContain('data-testid="field-description"')
    expect(html).toContain('data-testid="line-credit"')
    expect(html).not.toContain('data-testid="line-debit"')
    expect(html).toContain('data-testid="rev-amount-in-words"')
    expect(html).toContain("ศูนย์บาทถ้วน")
  })
})

describe("RevenueVoucherEditorPage edit DRAFT", () => {
  it("renders derived debit line under debit column", () => {
    const html = renderToStaticMarkup(
      <RevenueVoucherEditorPage
        mode="edit"
        entryId="rev-1"
        initialEntry={asEntry(baseEntry({ status: "DRAFT" }))}
      />
    )
    expect(html).toContain("REV-260001")
    expect(html).toContain('data-testid="rev-derived-debit-line"')
    expect(html).toContain('data-testid="derived-debit-amount"')
    expect(html).toContain("3,000.00")
  })
})

describe("RevenueVoucherListPage", () => {
  it("renders list with new REV link", () => {
    const html = renderToStaticMarkup(<RevenueVoucherListPage />)
    expect(html).toContain('data-testid="revenue-voucher-list"')
    expect(html).toContain("/finance/revenue-vouchers/new")
  })
})

describe("REV receive-to whitelist", () => {
  it("uses bank accounts only and excludes petty cash", () => {
    expect(REV_RECEIVE_TO_ACCOUNT_CODES).toEqual(["1021001", "1021002", "1021003"])
    const options = filterRevReceiveToAccountOptions([
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
  })
})

describe("MJV/PAV/PCV untouched by REV", () => {
  const fs = require("fs") as typeof import("fs")
  const path = require("path") as typeof import("path")
  const ROOT = path.join(__dirname, "..", "..", "..")

  it("PaymentVoucherEditorPage does not use REV test ids", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "components/finance/PaymentVoucherEditorPage.tsx"),
      "utf8"
    )
    expect(source).not.toContain("revenue-voucher-editor")
    expect(source).not.toContain("rev-derived-debit-line")
  })

  it("PettyCashVoucherEditorPage does not use REV test ids", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "components/finance/PettyCashVoucherEditorPage.tsx"),
      "utf8"
    )
    expect(source).not.toContain("revenue-voucher-editor")
  })
})
