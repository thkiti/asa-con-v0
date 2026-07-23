jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual("@/lib/auth")
  return {
    ...actual,
    getSession: jest.fn(),
    requirePeriodAdminActor: jest.fn(),
  }
})

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-save", () => ({
  createManualJournalEntryDraft: jest.fn(),
}))

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-read", () => ({
  listManualJournalEntries: jest.fn(),
  getManualJournalEntryById: jest.fn(),
}))

jest.mock("@/lib/finance/payment-voucher/payment-voucher-save", () => ({
  createPaymentVoucherDraft: jest.fn(),
}))

jest.mock("@/lib/finance/payment-voucher/payment-voucher-read", () => ({
  listPaymentVouchers: jest.fn(),
  getPaymentVoucherById: jest.fn(),
}))

jest.mock("@/lib/finance/revenue-voucher/revenue-voucher-save", () => ({
  createRevenueVoucherDraft: jest.fn(),
}))

jest.mock("@/lib/finance/revenue-voucher/revenue-voucher-read", () => ({
  listRevenueVouchers: jest.fn(),
}))

jest.mock("@/lib/finance/petty-cash-voucher/petty-cash-voucher-save", () => ({
  createPettyCashVoucherDraft: jest.fn(),
}))

jest.mock("@/lib/finance/petty-cash-voucher/petty-cash-voucher-read", () => ({
  listPettyCashVouchers: jest.fn(),
}))

jest.mock("@/lib/finance/invoice-voucher/invoice-voucher-save", () => ({
  createInvoiceVoucherDraft: jest.fn(),
}))

jest.mock("@/lib/finance/invoice-voucher/invoice-voucher-read", () => ({
  listInvoiceVouchers: jest.fn(),
}))

jest.mock("@/lib/finance/bank-cash-journal", () => ({
  getBankCashJournal: jest.fn(),
}))

jest.mock("@/lib/finance/bank-account", () => ({
  listBankAccounts: jest.fn(),
}))

import { NextRequest } from "next/server"
import { GET as listRoute, POST as createRoute } from "@/app/api/finance/manual-journal-entries/route"
import {
  GET as pavListRoute,
  POST as pavCreateRoute,
} from "@/app/api/finance/payment-vouchers/route"
import { GET as revListRoute } from "@/app/api/finance/revenue-vouchers/route"
import { GET as pcvListRoute } from "@/app/api/finance/petty-cash-vouchers/route"
import { GET as invListRoute } from "@/app/api/finance/invoice-vouchers/route"
import { GET as bankCashJournalRoute } from "@/app/api/finance/bank-cash-journal/route"
import { GET as bankAccountsRoute } from "@/app/api/finance/bank-accounts/route"
import { GET as voucherListRoute } from "@/app/api/finance/vouchers/route"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { createManualJournalEntryDraft } from "@/lib/finance/manual-journal-entry/manual-journal-entry-save"
import {
  getManualJournalEntryById,
  listManualJournalEntries,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { createPaymentVoucherDraft } from "@/lib/finance/payment-voucher/payment-voucher-save"
import { listPaymentVouchers } from "@/lib/finance/payment-voucher/payment-voucher-read"
import { listRevenueVouchers } from "@/lib/finance/revenue-voucher/revenue-voucher-read"
import { listPettyCashVouchers } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read"
import { listInvoiceVouchers } from "@/lib/finance/invoice-voucher/invoice-voucher-read"
import { getBankCashJournal } from "@/lib/finance/bank-cash-journal"
import { listBankAccounts } from "@/lib/finance/bank-account"
import { listFinanceDocuments } from "@/lib/finance/inquiry/finance-document-inquiry"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/inquiry/finance-document-inquiry", () => {
  const actual = jest.requireActual("@/lib/finance/inquiry/finance-document-inquiry")
  return {
    ...actual,
    listFinanceDocuments: jest.fn(),
  }
})

const mockList = listManualJournalEntries as jest.Mock
const mockCreate = createManualJournalEntryDraft as jest.Mock
const mockGet = getManualJournalEntryById as jest.Mock
const mockVoucherList = listFinanceDocuments as jest.Mock
const mockPavList = listPaymentVouchers as jest.Mock
const mockPavCreate = createPaymentVoucherDraft as jest.Mock
const mockRevList = listRevenueVouchers as jest.Mock
const mockPcvList = listPettyCashVouchers as jest.Mock
const mockInvList = listInvoiceVouchers as jest.Mock
const mockBankCashJournal = getBankCashJournal as jest.Mock
const mockBankAccountsList = listBankAccounts as jest.Mock

const actor = { staffId: "staff-1", name: "Finance", role: "HO_FINANCE" }

const sessionAs = {
  documentEntityCode: "AS" as const,
  role: "HO_FINANCE" as const,
  branchCode: "HO999",
}

const sessionAdCookie = {
  documentEntityCode: "AD" as const,
  role: "HO_FINANCE" as const,
  branchCode: "HO999",
}

const asEntry = {
  id: "entry-as",
  legalEntityCode: "AS",
  entryNo: "MJV-260001",
  entryType: "MANUAL",
  status: "DRAFT",
}

describe("finance legal entity isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue(actor)
    mockGet.mockResolvedValue(asEntry)
    mockCreate.mockResolvedValue({ id: "entry-as" })
  })

  it("session A (AS request) list returns AS-scoped filter even when cookie is AD", async () => {
    ;(getSession as jest.Mock).mockResolvedValue(sessionAdCookie)
    mockList.mockResolvedValue({ entries: [asEntry], total: 1 })

    const req = new NextRequest(
      "http://localhost/api/finance/manual-journal-entries?legalEntityCode=AS"
    )
    const res = await listRoute(req)

    expect(res.status).toBe(200)
    expect(mockList).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ legalEntityCode: "AS" })
    )
  })

  it("session B (AD request) create uses AD scope from request not AS cookie", async () => {
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)

    const req = new NextRequest(
      "http://localhost/api/finance/manual-journal-entries?legalEntityCode=AD",
      {
        method: "POST",
        body: JSON.stringify({
          branchId: "branch-1",
          entryDate: "2026-06-14",
          entryType: "MANUAL",
          lines: [{ accountCode: "1100", debit: "100", credit: "0" }],
        }),
      }
    )

    const res = await createRoute(req)
    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ legalEntityCode: "AD" })
    )
    expect(mockGet).toHaveBeenCalledWith(prisma, "entry-as", "AD")
  })

  it("AS save stays AS when another session recently set cookie to AD", async () => {
    ;(getSession as jest.Mock).mockResolvedValue(sessionAdCookie)

    const req = new NextRequest(
      "http://localhost/api/finance/manual-journal-entries?legalEntityCode=AS",
      {
        method: "POST",
        body: JSON.stringify({
          branchId: "branch-1",
          entryDate: "2026-06-14",
          entryType: "MANUAL",
          lines: [{ accountCode: "1100", debit: "100", credit: "0" }],
        }),
      }
    )

    await createRoute(req)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ legalEntityCode: "AS" })
    )
  })

  it("voucher inquiry list API filters by request legalEntityCode", async () => {
    ;(getSession as jest.Mock).mockResolvedValue(sessionAdCookie)
    mockVoucherList.mockResolvedValue({ documents: [], total: 0 })

    const req = new NextRequest(
      "http://localhost/api/finance/vouchers?legalEntityCode=AS&refType=COL&postingState=all"
    )
    const res = await voucherListRoute(req)

    expect(res.status).toBe(200)
    expect(mockVoucherList).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ legalEntityCode: "AS" })
    )
  })

  it("bank accounts list uses AS request scope when cookie is AD", async () => {
    ;(getSession as jest.Mock).mockResolvedValue(sessionAdCookie)
    mockBankAccountsList.mockResolvedValue({ items: [], total: 0 })

    const req = new NextRequest(
      "http://localhost/api/finance/bank-accounts?legalEntityCode=AS"
    )
    const res = await bankAccountsRoute(req)

    expect(res.status).toBe(200)
    expect(mockBankAccountsList).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ legalEntityCode: "AS" })
    )
  })

  it("bank cash journal uses AS request scope when cookie is AD", async () => {
    ;(getSession as jest.Mock).mockResolvedValue(sessionAdCookie)
    mockBankCashJournal.mockResolvedValue({
      legalEntityCode: "AS",
      periodKey: "2026-01",
      beginningBalance: "0.00",
      endingBalance: "0.00",
      lines: [],
      bankAccount: {
        id: "bank-as",
        legalEntityCode: "AS",
        bankName: "BBL",
        accountNumber: "1111111111",
        accountName: "AS Current",
        currencyCode: "THB",
        glAccount: { id: "gl-1", code: "1021", name: "Bank" },
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    })

    const req = new NextRequest(
      "http://localhost/api/finance/bank-cash-journal?legalEntityCode=AS&periodKey=2026-01&bankAccountId=bank-as"
    )
    const res = await bankCashJournalRoute(req)

    expect(res.status).toBe(200)
    expect(mockBankCashJournal).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        legalEntityCode: "AS",
        periodKey: "2026-01",
        bankAccountId: "bank-as",
      })
    )
  })

  it.each([
    ["payment vouchers", "/api/finance/payment-vouchers", pavListRoute, mockPavList],
    ["revenue vouchers", "/api/finance/revenue-vouchers", revListRoute, mockRevList],
    ["petty cash vouchers", "/api/finance/petty-cash-vouchers", pcvListRoute, mockPcvList],
    ["invoice vouchers", "/api/finance/invoice-vouchers", invListRoute, mockInvList],
  ] as const)(
    "%s list uses AS request scope when cookie is AD",
    async (_label, path, route, mockFn) => {
      ;(getSession as jest.Mock).mockResolvedValue(sessionAdCookie)
      mockFn.mockResolvedValue({ entries: [], total: 0 })

      const req = new NextRequest(`http://localhost${path}?legalEntityCode=AS`)
      const res = await route(req)

      expect(res.status).toBe(200)
      expect(mockFn).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({ legalEntityCode: "AS" })
      )
    }
  )

  it("payment voucher create uses AD request scope when cookie is AS", async () => {
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    mockPavCreate.mockResolvedValue({ id: "pav-1" })

    const req = new NextRequest(
      "http://localhost/api/finance/payment-vouchers?legalEntityCode=AD",
      {
        method: "POST",
        body: JSON.stringify({
          branchId: "branch-1",
          payFromAccountId: "acc-1",
          payeeName: "Vendor",
          entryDate: "2026-06-14",
          lines: [{ accountCode: "5100", debit: "100", credit: "0" }],
        }),
      }
    )

    const res = await pavCreateRoute(req)
    expect(res.status).toBe(200)
    expect(mockPavCreate).toHaveBeenCalledWith(
      expect.objectContaining({ legalEntityCode: "AD" })
    )
  })
})
