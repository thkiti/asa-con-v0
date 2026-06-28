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

jest.mock("@/lib/finance/pos-settlement/execute-collector-pickup-post", () => ({
  executeCollectorPickupSettlementPost: jest.fn(),
}))

import { NextRequest } from "next/server"
import { POST } from "@/app/api/finance/pos-settlement/collector-pickup/post/route"
import { getSession, PeriodAdminAuthError, requirePeriodAdminActor } from "@/lib/auth"
import { executeCollectorPickupSettlementPost } from "@/lib/finance/pos-settlement/execute-collector-pickup-post"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement/pos-settlement-errors"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"

const mockExecute = executeCollectorPickupSettlementPost as jest.Mock

const financeActor = { staffId: "staff-finance", role: "HO_FINANCE" as const }
const sessionAs = { documentEntityCode: "AS" as const, staffId: "staff-finance", role: "HO_FINANCE" }

const sampleResult = {
  voucherId: "voucher-1",
  voucherNo: "V-2026-06-00001",
  refNo: "COL-SH001-202606-0001",
  collectNo: "COL-SH001-202606-0001",
  collectorReportId: "collector-report-1",
  amount: "1000.00",
  documentCode: "PSV-COL-PICK",
  refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
  legalEntityCode: "AS",
  lines: [
    {
      accountCode: DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR,
      accountName: "Cash in Transit",
      debit: "1000.00",
      credit: "0.00",
      memo: "Cash in transit — collector pickup",
    },
    {
      accountCode: DEFAULT_ACCOUNT_CODES.CASH,
      accountName: "Cash in Drawer",
      debit: "0.00",
      credit: "1000.00",
      memo: "Cash in drawer — collector pickup",
    },
  ],
}

function postRequest(body: object) {
  return new NextRequest(
    "http://localhost/api/finance/pos-settlement/collector-pickup/post",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  )
}

describe("POST /api/finance/pos-settlement/collector-pickup/post", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue(financeActor)
    mockExecute.mockResolvedValue(sampleResult)
  })

  it("posts collector pickup settlement for finance user", async () => {
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

  it("rejects unauthenticated requests", async () => {
    ;(requirePeriodAdminActor as jest.Mock).mockImplementation(() => {
      throw new PeriodAdminAuthError("Authentication required", "UNAUTHENTICATED", 401)
    })

    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))

    expect(res.status).toBe(401)
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it("rejects AD session entity for POS settlement", async () => {
    ;(getSession as jest.Mock).mockResolvedValue({
      ...sessionAs,
      documentEntityCode: "AD",
    })

    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      code: PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
    })
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it("requires collectorReportId in body", async () => {
    const res = await POST(postRequest({}))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" })
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it("maps DUPLICATE_SOURCE to 409", async () => {
    mockExecute.mockRejectedValue(
      new PosSettlementError(
        "Collector pickup settlement already posted for this report",
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

  it("maps non-COLLECT report to 400 INVALID_SOURCE", async () => {
    mockExecute.mockRejectedValue(
      new PosSettlementError(
        "Collector pickup requires a COLLECT mode collector report",
        PosSettlementErrorCodes.INVALID_SOURCE
      )
    )

    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: PosSettlementErrorCodes.INVALID_SOURCE,
    })
  })

  it("maps zero amount to 400 INVALID_AMOUNT", async () => {
    mockExecute.mockRejectedValue(
      new PosSettlementError(
        "Collector pickup cash amount must be greater than zero",
        PosSettlementErrorCodes.INVALID_AMOUNT
      )
    )

    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: PosSettlementErrorCodes.INVALID_AMOUNT,
    })
  })

  it("maps closed period to 409 PERIOD_CLOSED", async () => {
    mockExecute.mockRejectedValue(
      new FinancePostingError("period closed", "PERIOD_CLOSED")
    )

    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({ code: "PERIOD_CLOSED" })
  })

  it("returns journal lines with only 1031 debit and 1001 credit", async () => {
    const res = await POST(postRequest({ collectorReportId: "collector-report-1" }))
    const body = await res.json()

    expect(body.lines).toHaveLength(2)
    expect(body.lines.map((l: { accountCode: string }) => l.accountCode).sort()).toEqual([
      DEFAULT_ACCOUNT_CODES.CASH,
      DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR,
    ])
    const forbidden = [
      DEFAULT_ACCOUNT_CODES.REVENUE,
      DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
      DEFAULT_ACCOUNT_CODES.CARD_CLEARING,
      DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING,
      DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING,
      DEFAULT_ACCOUNT_CODES.BANK,
    ]
    for (const code of forbidden) {
      expect(body.lines.some((l: { accountCode: string }) => l.accountCode === code)).toBe(
        false
      )
    }
  })
})
