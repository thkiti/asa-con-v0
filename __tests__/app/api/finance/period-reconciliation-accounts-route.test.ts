import { NextRequest } from "next/server"
import { GET } from "@/app/api/finance/period-reconciliation/accounts/route"
import {
  listBankReconciliationAccounts,
  listCashReconciliationAccounts,
} from "@/lib/finance/period-reconciliation-accounts"

jest.mock("@/app/api/finance/shared/voucher-api-scope", () => ({
  requireFinanceVoucherScope: jest.fn(async () => ({
    actor: { id: "actor-1" },
    legalEntityCode: "AS",
  })),
}))

jest.mock("@/lib/finance/period-reconciliation-accounts", () => ({
  listBankReconciliationAccounts: jest.fn(),
  listCashReconciliationAccounts: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

const mockListBank = listBankReconciliationAccounts as jest.MockedFunction<
  typeof listBankReconciliationAccounts
>
const mockListCash = listCashReconciliationAccounts as jest.MockedFunction<
  typeof listCashReconciliationAccounts
>

describe("GET /api/finance/period-reconciliation/accounts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns bank reconciliation accounts scoped to the request legal entity", async () => {
    mockListBank.mockResolvedValue([
      { id: "bank-2", code: "1021002", name: "Bangkok Bank Current" },
      { id: "bank-3", code: "1021003", name: "Bangkok Bank Savings" },
    ])

    const response = await GET(
      new NextRequest("http://localhost/api/finance/period-reconciliation/accounts?role=BANK")
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.items).toEqual([
      { id: "bank-2", code: "1021002", name: "Bangkok Bank Current" },
      { id: "bank-3", code: "1021003", name: "Bangkok Bank Savings" },
    ])
    expect(mockListBank).toHaveBeenCalledWith(expect.anything(), "AS")
  })

  it("returns cash reconciliation accounts", async () => {
    mockListCash.mockResolvedValue([{ id: "cash-1", code: "1001", name: "Cash drawer" }])

    const response = await GET(
      new NextRequest("http://localhost/api/finance/period-reconciliation/accounts?role=CASH")
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.items).toEqual([{ id: "cash-1", code: "1001", name: "Cash drawer" }])
    expect(mockListCash).toHaveBeenCalled()
  })
})
