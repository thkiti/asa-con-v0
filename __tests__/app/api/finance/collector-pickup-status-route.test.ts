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

jest.mock("@/lib/finance/pos-settlement/collector-pickup-reconciliation", () => ({
  getCollectorPickupSettlementStatus: jest.fn(),
  listCollectorPickupSettlementStatuses: jest.fn(),
}))

import { NextRequest } from "next/server"
import { GET as GET_STATUS } from "@/app/api/finance/pos-settlement/collector-pickup/status/route"
import { GET as GET_STATUS_LIST } from "@/app/api/finance/pos-settlement/collector-pickup/status-list/route"
import { getSession, PeriodAdminAuthError, requirePeriodAdminActor } from "@/lib/auth"
import {
  getCollectorPickupSettlementStatus,
  listCollectorPickupSettlementStatuses,
  type CollectorPickupSettlementReconciliation,
} from "@/lib/finance/pos-settlement/collector-pickup-reconciliation"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement/pos-settlement-errors"

const mockGetStatus = getCollectorPickupSettlementStatus as jest.Mock
const mockListStatuses = listCollectorPickupSettlementStatuses as jest.Mock

const financeActor = { staffId: "staff-finance", role: "HO_FINANCE" as const }
const sessionAs = {
  documentEntityCode: "AS" as const,
  staffId: "staff-finance",
  role: "HO_FINANCE",
}

const notPostedStatus: CollectorPickupSettlementReconciliation = {
  collectorReportId: "collector-report-1",
  collectNo: "COL-SH001-202606-0001",
  mode: "COLLECT",
  branchId: "branch-1",
  branchCode: "SH001",
  branchName: "Chidlom",
  expectedAmount: "1000.00",
  voucherId: null,
  voucherNo: null,
  glDebitCashInTransit1031: "0.00",
  glCreditCashDrawer1001: "0.00",
  postedAmountEquivalent: "0.00",
  variance: "1000.00",
  status: "NOT_POSTED",
  depositStatus: "NOT_ELIGIBLE",
  inTransitAmount: "1000.00",
  bankDepositVoucherId: null,
  bankDepositVoucherNo: null,
  glDebitBank1021: "0.00",
  glCreditCashInTransit1031: "0.00",
  payInEvidenceId: null,
  payInEvidenceStatus: null,
  payInEvidenceUrl: null,
  payInSlipMissingWarning: false,
  bankDepositDate: null,
  bankAccountCode: null,
}

const postedStatus: CollectorPickupSettlementReconciliation = {
  ...notPostedStatus,
  voucherId: "voucher-1",
  voucherNo: "V-2026-06-00001",
  glDebitCashInTransit1031: "1000.00",
  glCreditCashDrawer1001: "1000.00",
  postedAmountEquivalent: "1000.00",
  variance: "0.00",
  status: "POSTED",
}

const invalidSourceStatus: CollectorPickupSettlementReconciliation = {
  ...notPostedStatus,
  mode: "Z",
  expectedAmount: "1000.00",
  variance: "0.00",
  status: "INVALID_SOURCE",
}

function statusRequest(collectorReportId?: string) {
  const url = new URL("http://localhost/api/finance/pos-settlement/collector-pickup/status")
  if (collectorReportId !== undefined) {
    url.searchParams.set("collectorReportId", collectorReportId)
  }
  return new NextRequest(url)
}

function statusListRequest(params: Record<string, string> = {}) {
  const url = new URL(
    "http://localhost/api/finance/pos-settlement/collector-pickup/status-list"
  )
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

describe("GET /api/finance/pos-settlement/collector-pickup/status", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue(financeActor)
    mockGetStatus.mockResolvedValue(notPostedStatus)
  })

  it("returns NOT_POSTED status for unposted collector report", async () => {
    const res = await GET_STATUS(statusRequest("collector-report-1"))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(notPostedStatus)
    expect(mockGetStatus).toHaveBeenCalledWith({}, "collector-report-1")
  })

  it("returns POSTED status with voucherNo and zero variance after posting", async () => {
    mockGetStatus.mockResolvedValue(postedStatus)

    const res = await GET_STATUS(statusRequest("collector-report-1"))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      status: "POSTED",
      voucherNo: "V-2026-06-00001",
      variance: "0.00",
      glDebitCashInTransit1031: "1000.00",
      glCreditCashDrawer1001: "1000.00",
    })
  })

  it("returns INVALID_SOURCE with 200 for non-COLLECT report", async () => {
    mockGetStatus.mockResolvedValue(invalidSourceStatus)

    const res = await GET_STATUS(statusRequest("collector-report-1"))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      mode: "Z",
      status: "INVALID_SOURCE",
    })
  })

  it("requires collectorReportId query param", async () => {
    const res = await GET_STATUS(statusRequest())

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" })
    expect(mockGetStatus).not.toHaveBeenCalled()
  })

  it("maps unknown collector report to 404", async () => {
    mockGetStatus.mockRejectedValue(
      new PosSettlementError(
        "Collector report not found",
        PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND,
        404
      )
    )

    const res = await GET_STATUS(statusRequest("missing-report"))

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      code: PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND,
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

    const res = await GET_STATUS(statusRequest("collector-report-1"))

    expect(res.status).toBe(403)
    expect(mockGetStatus).not.toHaveBeenCalled()
  })

  it("rejects HO_OPERATIONS", async () => {
    ;(getSession as jest.Mock).mockResolvedValue({
      ...sessionAs,
      role: "HO_OPERATIONS",
    })
    ;(requirePeriodAdminActor as jest.Mock).mockImplementation(() => {
      throw new PeriodAdminAuthError(
        "Insufficient permissions for period admin",
        "FORBIDDEN",
        403
      )
    })

    const res = await GET_STATUS(statusRequest("collector-report-1"))

    expect(res.status).toBe(403)
    expect(mockGetStatus).not.toHaveBeenCalled()
  })

  it("allows HO_ADMIN", async () => {
    ;(getSession as jest.Mock).mockResolvedValue({
      ...sessionAs,
      role: "HO_ADMIN",
    })
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue({
      staffId: "staff-admin",
      role: "HO_ADMIN",
    })

    const res = await GET_STATUS(statusRequest("collector-report-1"))

    expect(res.status).toBe(200)
    expect(mockGetStatus).toHaveBeenCalled()
  })

  it("rejects AD session entity", async () => {
    ;(getSession as jest.Mock).mockResolvedValue({
      ...sessionAs,
      documentEntityCode: "AD",
    })

    const res = await GET_STATUS(statusRequest("collector-report-1"))

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({
      code: PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
    })
    expect(mockGetStatus).not.toHaveBeenCalled()
  })
})

describe("GET /api/finance/pos-settlement/collector-pickup/status-list", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue(financeActor)
    mockListStatuses.mockResolvedValue([notPostedStatus, postedStatus])
  })

  it("returns multiple statuses for date range", async () => {
    const res = await GET_STATUS_LIST(
      statusListRequest({
        from: "2026-06-01",
        to: "2026-06-30",
        branchId: "branch-1",
      })
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      items: [notPostedStatus, postedStatus],
    })
    expect(mockListStatuses).toHaveBeenCalledWith(
      {},
      {
        branchId: "branch-1",
        from: "2026-06-01",
        to: "2026-06-30",
      }
    )
  })

  it("requires from and to query params", async () => {
    const res = await GET_STATUS_LIST(statusListRequest({ branchId: "branch-1" }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" })
    expect(mockListStatuses).not.toHaveBeenCalled()
  })
})
