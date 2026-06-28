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

jest.mock("@/lib/finance/pos-settlement/execute-bank-deposit-post", () => ({
  executeBankDepositSettlementPost: jest.fn(),
}))

import { NextRequest } from "next/server"
import { POST } from "@/app/api/finance/pos-settlement/bank-deposit/post/route"
import { getSession, PeriodAdminAuthError, requirePeriodAdminActor } from "@/lib/auth"
import { executeBankDepositSettlementPost } from "@/lib/finance/pos-settlement/execute-bank-deposit-post"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement/pos-settlement-errors"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"

const mockExecute = executeBankDepositSettlementPost as jest.Mock

const financeActor = { staffId: "staff-finance", role: "HO_FINANCE" as const }
const sessionAs = { documentEntityCode: "AS" as const, staffId: "staff-finance", role: "HO_FINANCE" }

const sampleResult = {
  voucherId: "voucher-2",
  voucherNo: "V-2026-06-00002",
  refNo: "COL-SH001-202606-0001",
  collectNo: "COL-SH001-202606-0001",
  collectorReportId: "collector-report-1",
  amount: "1000.00",
  documentCode: "PSV-BANK-DEP",
  refType: FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
  legalEntityCode: "AS",
  lines: [
    {
      accountCode: DEFAULT_ACCOUNT_CODES.BANK,
      accountName: "Bank",
      debit: "1000.00",
      credit: "0.00",
      memo: "Bank — cash deposit from collector in transit",
    },
    {
      accountCode: DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR,
      accountName: "Cash in Transit",
      debit: "0.00",
      credit: "1000.00",
      memo: "Cash in transit — bank deposit",
    },
  ],
}

function postRequest(body: object) {
  return new NextRequest(
    "http://localhost/api/finance/pos-settlement/bank-deposit/post",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  )
}

describe("POST /api/finance/pos-settlement/bank-deposit/post", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue(financeActor)
    mockExecute.mockResolvedValue(sampleResult)
  })

  it("posts bank deposit settlement for finance user", async () => {
    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(sampleResult)
    expect(mockExecute).toHaveBeenCalledWith({
      collectorReportId: "collector-report-1",
      legalEntityCode: "AS",
    })
  })

  it("rejects non-finance shop staff", async () => {
    ;(requirePeriodAdminActor as jest.Mock).mockImplementation(() => {
      throw new PeriodAdminAuthError(
        "Insufficient permissions for period admin",
        "FORBIDDEN",
        403
      )
    })

    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" })
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it("rejects AD session entity for POS settlement", async () => {
    ;(getSession as jest.Mock).mockResolvedValue({
      documentEntityCode: "AD",
      staffId: "staff-finance",
      role: "HO_FINANCE",
    })

    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      code: PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
    })
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it("returns 409 for duplicate source", async () => {
    mockExecute.mockRejectedValue(
      new PosSettlementError(
        "Bank deposit settlement already posted for this collector report",
        PosSettlementErrorCodes.DUPLICATE_SOURCE,
        409
      )
    )

    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({
      code: PosSettlementErrorCodes.DUPLICATE_SOURCE,
    })
  })

  it("returns 409 when collector pickup not posted", async () => {
    mockExecute.mockRejectedValue(
      new PosSettlementError(
        "Collector pickup settlement must be posted before bank deposit",
        PosSettlementErrorCodes.COLLECTOR_PICKUP_NOT_POSTED,
        409
      )
    )

    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({
      code: PosSettlementErrorCodes.COLLECTOR_PICKUP_NOT_POSTED,
    })
  })

  it("requires collectorReportId in body", async () => {
    const res = await POST(postRequest({}))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" })
    expect(mockExecute).not.toHaveBeenCalled()
  })
})
