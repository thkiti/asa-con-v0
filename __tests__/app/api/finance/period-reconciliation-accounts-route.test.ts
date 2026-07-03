import { NextRequest } from "next/server"
import { GET } from "@/app/api/finance/period-reconciliation/accounts/route"
import {
  listBankReconciliationAccounts,
  listCashReconciliationAccounts,
} from "@/lib/finance/period-reconciliation-accounts"

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

  it("returns bank reconciliation accounts", async () => {
    mockListBank.mockResolvedValue([
      { id: "bank-1", code: "1021001", name: "Bangkok Bank" },
    ])

    const response = await GET(
      new NextRequest("http://localhost/api/finance/period-reconciliation/accounts?role=BANK")
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.items).toEqual([
      { id: "bank-1", code: "1021001", name: "Bangkok Bank" },
    ])
    expect(mockListBank).toHaveBeenCalled()
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
