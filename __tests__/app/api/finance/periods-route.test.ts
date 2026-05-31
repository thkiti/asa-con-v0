import { NextRequest } from "next/server"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { bootstrapPeriodIfMissing } from "@/lib/finance/period-setup"
import {
  closeAccountingPeriod,
  reopenAccountingPeriod,
} from "@/lib/finance/period-close"
import { listAccountingPeriods } from "@/lib/finance/period-list"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { CloseGateError } from "@/lib/finance/close-gate-errors"
import { getSession } from "@/lib/auth"
import { GET, PATCH, POST } from "@/app/api/finance/periods/route"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  getSession: jest.fn(),
}))

jest.mock("@/lib/finance/period-list", () => ({
  listAccountingPeriods: jest.fn(),
  toAccountingPeriodListRow: jest.requireActual("@/lib/finance/period-list")
    .toAccountingPeriodListRow,
}))

jest.mock("@/lib/finance/period-setup", () => ({
  bootstrapPeriodIfMissing: jest.fn(),
}))

jest.mock("@/lib/finance/period-close", () => ({
  closeAccountingPeriod: jest.fn(),
  reopenAccountingPeriod: jest.fn(),
}))

const mockStaffFindFirst = jest.fn()
const mockStaffFindUnique = jest.fn()

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    accountingPeriod: { findUnique: jest.fn() },
    staff: {
      findFirst: (...args: unknown[]) => mockStaffFindFirst(...args),
      findUnique: (...args: unknown[]) => mockStaffFindUnique(...args),
    },
  },
}))

jest.mock("@/lib/auth/period-admin-staff", () => ({
  ...jest.requireActual("@/lib/auth/period-admin-staff"),
  resolvePeriodAdminStaffId: jest.fn().mockResolvedValue("staff-db-1"),
}))

const mockList = listAccountingPeriods as jest.MockedFunction<
  typeof listAccountingPeriods
>
const mockBootstrap = bootstrapPeriodIfMissing as jest.MockedFunction<
  typeof bootstrapPeriodIfMissing
>
const mockClose = closeAccountingPeriod as jest.MockedFunction<
  typeof closeAccountingPeriod
>
const mockReopen = reopenAccountingPeriod as jest.MockedFunction<
  typeof reopenAccountingPeriod
>
const mockTransaction = prisma.$transaction as jest.Mock
const mockFindUnique = prisma.accountingPeriod.findUnique as jest.Mock
const mockGetSession = getSession as jest.MockedFunction<typeof getSession>

const authorizedSession = {
  sessionId: "sess-1",
  role: "HO_FINANCE" as const,
  staffId: "staff-1",
  name: "Finance User",
  branchId: "branch-1",
}

const openedAt = new Date("2026-05-01T00:00:00.000Z")
const closedAt = new Date("2026-05-31T23:59:59.000Z")

function periodRow(overrides: {
  status?: AccountingPeriodStatus
  closedAt?: Date | null
} = {}) {
  return {
    id: "period-1",
    periodKey: "2026-05",
    branchId: "branch-1",
    status: overrides.status ?? AccountingPeriodStatus.OPEN,
    openedAt,
    closedAt: overrides.closedAt === undefined ? null : overrides.closedAt,
    branch: { name: "Main Shop" },
  }
}

function periodDto(overrides: {
  status?: AccountingPeriodStatus
  closedAt?: Date | null
} = {}) {
  return {
    id: "period-1",
    periodKey: "2026-05",
    branchId: "branch-1",
    branchName: "Main Shop",
    status: overrides.status ?? AccountingPeriodStatus.OPEN,
    openedAt,
    closedAt: overrides.closedAt === undefined ? null : overrides.closedAt,
  }
}

describe("GET finance/periods", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("calls listAccountingPeriods and returns periods DTO", async () => {
    mockList.mockResolvedValue([periodDto()])

    const req = new NextRequest(
      "http://localhost/api/finance/periods?branchId=branch-1"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      periods: [
        {
          ...periodDto(),
          openedAt: openedAt.toISOString(),
        },
      ],
    })
    expect(mockList).toHaveBeenCalledWith(prisma, {
      branchId: "branch-1",
      periodKey: undefined,
      status: undefined,
    })
  })

  it("omits branchId filter when query param is blank", async () => {
    mockList.mockResolvedValue([])

    const req = new NextRequest("http://localhost/api/finance/periods?branchId=  ")
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockList).toHaveBeenCalledWith(prisma, {
      branchId: undefined,
      periodKey: undefined,
      status: undefined,
    })
  })

  it("passes periodKey and status filters when provided", async () => {
    mockList.mockResolvedValue([])

    const req = new NextRequest(
      "http://localhost/api/finance/periods?branchId=branch-1&periodKey=2026-05&status=soft_closed"
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(mockList).toHaveBeenCalledWith(prisma, {
      branchId: "branch-1",
      periodKey: "2026-05",
      status: AccountingPeriodStatus.SOFT_CLOSED,
    })
  })

  it("returns 400 for invalid status filter", async () => {
    const req = new NextRequest(
      "http://localhost/api/finance/periods?status=ARCHIVED"
    )
    const res = await GET(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Invalid status",
      code: "INVALID_STATUS",
    })
    expect(mockList).not.toHaveBeenCalled()
  })
})

describe("POST finance/periods", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue(authorizedSession)
    mockTransaction.mockImplementation(async (fn) => fn(prisma))
  })

  it("returns 401 when session is missing", async () => {
    mockGetSession.mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "POST",
      body: JSON.stringify({ branchId: "branch-1", periodKey: "2026-05" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({
      error: "Authentication required",
      code: "UNAUTHENTICATED",
    })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("creates an OPEN period via bootstrapPeriodIfMissing", async () => {
    mockBootstrap.mockResolvedValue(periodRow())
    mockFindUnique.mockResolvedValue(periodRow())

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "POST",
      body: JSON.stringify({ branchId: "branch-1", periodKey: "2026-05" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      period: {
        ...periodDto(),
        openedAt: openedAt.toISOString(),
      },
    })
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockBootstrap).toHaveBeenCalledWith(prisma, {
      branchId: "branch-1",
      periodKey: "2026-05",
    })
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        branchId_periodKey: { branchId: "branch-1", periodKey: "2026-05" },
      },
      include: { branch: { select: { name: true } } },
    })
  })

  it("is idempotent when the period already exists", async () => {
    mockBootstrap.mockResolvedValue(periodRow())
    mockFindUnique.mockResolvedValue(periodRow())

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "POST",
      body: JSON.stringify({ branchId: "branch-1", periodKey: "2026-05" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockBootstrap).toHaveBeenCalledTimes(1)
  })

  it("returns 400 when branchId or periodKey is missing", async () => {
    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "POST",
      body: JSON.stringify({ branchId: "branch-1" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "branchId and periodKey are required",
      code: "VALIDATION_ERROR",
    })
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})

describe("PATCH finance/periods", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue(authorizedSession)
    mockTransaction.mockImplementation(async (fn) => fn(prisma))
    mockStaffFindFirst.mockResolvedValue({ id: "staff-db-1" })
    mockStaffFindUnique.mockResolvedValue({ name: "Finance User" })
  })

  it("returns 403 when role is not period admin", async () => {
    mockGetSession.mockResolvedValue({
      sessionId: "sess-2",
      role: "SH_STAFF",
      staffId: "staff-2",
      name: "Shop Staff",
      branchId: "branch-1",
    })

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "PATCH",
      body: JSON.stringify({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "SOFT_CLOSE",
      }),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({
      error: "Insufficient permissions for period admin",
      code: "FORBIDDEN",
    })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("allows HO_ADMIN to mutate period status", async () => {
    mockGetSession.mockResolvedValue({
      sessionId: "sess-3",
      role: "HO_ADMIN",
      staffId: "staff-3",
      name: "Admin User",
      branchId: "branch-1",
    })
    mockClose.mockResolvedValue(
      periodRow({ status: "SOFT_CLOSED", closedAt: new Date("2026-05-31T23:59:59.000Z") })
    )
    mockFindUnique.mockResolvedValue(
      periodRow({ status: "SOFT_CLOSED", closedAt: new Date("2026-05-31T23:59:59.000Z") })
    )

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "PATCH",
      body: JSON.stringify({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "SOFT_CLOSE",
      }),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    expect(mockClose).toHaveBeenCalled()
  })

  it("SOFT_CLOSE updates period status", async () => {
    mockClose.mockResolvedValue(
      periodRow({ status: AccountingPeriodStatus.SOFT_CLOSED, closedAt })
    )
    mockFindUnique.mockResolvedValue(
      periodRow({ status: AccountingPeriodStatus.SOFT_CLOSED, closedAt })
    )

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "PATCH",
      body: JSON.stringify({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "SOFT_CLOSE",
      }),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      period: {
        ...periodDto({
          status: AccountingPeriodStatus.SOFT_CLOSED,
          closedAt,
        }),
        openedAt: openedAt.toISOString(),
        closedAt: closedAt.toISOString(),
      },
    })
    expect(mockClose).toHaveBeenCalledWith(prisma, {
      branchId: "branch-1",
      periodKey: "2026-05",
      mode: "SOFT",
    })
  })

  it("HARD_CLOSE updates period status", async () => {
    mockClose.mockResolvedValue(
      periodRow({ status: AccountingPeriodStatus.HARD_CLOSED, closedAt })
    )
    mockFindUnique.mockResolvedValue(
      periodRow({ status: AccountingPeriodStatus.HARD_CLOSED, closedAt })
    )

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "PATCH",
      body: JSON.stringify({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "HARD_CLOSE",
      }),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    expect(mockClose).toHaveBeenCalledWith(prisma, {
      branchId: "branch-1",
      periodKey: "2026-05",
      mode: "HARD",
      closedBy: {
        staffId: "staff-db-1",
        name: "Finance User",
        role: "HO_FINANCE",
      },
    })
  })

  it("returns 409 with blockers when HARD_CLOSE is blocked by close gate", async () => {
    mockClose.mockRejectedValue(
      new CloseGateError(
        "Period close blocked: 1 blocker must be resolved",
        "CLOSE_SNAPSHOT_REQUIRED",
        "BLOCKED",
        [
          {
            id: "snapshot-missing",
            group: "snapshot_evidence",
            severity: "BLOCKED",
            title: "No reconciliation snapshot for period",
            detail: "Capture a frozen reconciliation snapshot before close.",
          },
        ]
      )
    )

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "PATCH",
      body: JSON.stringify({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "HARD_CLOSE",
      }),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({
      code: "CLOSE_SNAPSHOT_REQUIRED",
      blockers: [
        expect.objectContaining({ id: "snapshot-missing", severity: "BLOCKED" }),
      ],
    })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  describe("close gate API enforcement", () => {
    it("returns full CloseGateError payload with HTTP 409 for HARD_CLOSE", async () => {
      const gateErr = new CloseGateError(
        "Period close blocked: 1 blocker must be resolved",
        "CLOSE_SNAPSHOT_REQUIRED",
        "BLOCKED",
        [
          {
            id: "snapshot-missing",
            group: "snapshot_evidence",
            severity: "BLOCKED",
            title: "No reconciliation snapshot for period",
            detail: "Capture a frozen reconciliation snapshot before close.",
          },
        ]
      )
      mockClose.mockRejectedValue(gateErr)

      const req = new NextRequest("http://localhost/api/finance/periods", {
        method: "PATCH",
        body: JSON.stringify({
          branchId: "branch-1",
          periodKey: "2026-05",
          action: "HARD_CLOSE",
        }),
      })
      const res = await PATCH(req)

      expect(res.status).toBe(409)
      await expect(res.json()).resolves.toEqual({
        error: gateErr.message,
        code: "CLOSE_SNAPSHOT_REQUIRED",
        readinessStatus: "BLOCKED",
        blockers: gateErr.blockers,
      })
      expect(mockClose).toHaveBeenCalledWith(prisma, {
        branchId: "branch-1",
        periodKey: "2026-05",
        mode: "HARD",
        closedBy: {
          staffId: "staff-db-1",
          name: "Finance User",
          role: "HO_FINANCE",
        },
      })
      expect(mockReopen).not.toHaveBeenCalled()
      expect(mockFindUnique).not.toHaveBeenCalled()
    })

    it("returns CLOSE_READINESS_FAILED payload when gate rejects WARNING under strict policy", async () => {
      mockClose.mockRejectedValue(
        new CloseGateError(
          "Period close blocked: 1 blocker must be resolved",
          "CLOSE_READINESS_FAILED",
          "WARNING",
          [
            {
              id: "snapshot-stale",
              group: "snapshot_evidence",
              severity: "WARNING",
              title: "Snapshot may be stale",
              detail: "stale",
            },
          ]
        )
      )

      const req = new NextRequest("http://localhost/api/finance/periods", {
        method: "PATCH",
        body: JSON.stringify({
          branchId: "branch-1",
          periodKey: "2026-05",
          action: "HARD_CLOSE",
        }),
      })
      const res = await PATCH(req)

      expect(res.status).toBe(409)
      await expect(res.json()).resolves.toMatchObject({
        code: "CLOSE_READINESS_FAILED",
        readinessStatus: "WARNING",
        blockers: [expect.objectContaining({ id: "snapshot-stale", severity: "WARNING" })],
      })
    })

    it("routes HARD_CLOSE only through closeAccountingPeriod with no post-close reload on gate failure", async () => {
      mockClose.mockRejectedValue(
        new CloseGateError("blocked", "CLOSE_BLOCKED", "BLOCKED", [
          {
            id: "reconciliation-missing-gl-issues",
            group: "reconciliation",
            severity: "BLOCKED",
            title: "Missing GL issues",
            detail: "resolve",
          },
        ])
      )

      const req = new NextRequest("http://localhost/api/finance/periods", {
        method: "PATCH",
        body: JSON.stringify({
          branchId: "branch-1",
          periodKey: "2026-05",
          action: "HARD_CLOSE",
        }),
      })
      const res = await PATCH(req)

      expect(res.status).toBe(409)
      expect(mockTransaction).toHaveBeenCalledTimes(1)
      expect(mockClose).toHaveBeenCalledTimes(1)
      expect(mockReopen).not.toHaveBeenCalled()
      expect(mockFindUnique).not.toHaveBeenCalled()
    })

    it("SOFT_CLOSE bypasses close gate via ungated closeAccountingPeriod mode", async () => {
      mockClose.mockResolvedValue(
        periodRow({ status: AccountingPeriodStatus.SOFT_CLOSED, closedAt })
      )
      mockFindUnique.mockResolvedValue(
        periodRow({ status: AccountingPeriodStatus.SOFT_CLOSED, closedAt })
      )

      const req = new NextRequest("http://localhost/api/finance/periods", {
        method: "PATCH",
        body: JSON.stringify({
          branchId: "branch-1",
          periodKey: "2026-05",
          action: "SOFT_CLOSE",
        }),
      })
      const res = await PATCH(req)

      expect(res.status).toBe(200)
      expect(mockClose).toHaveBeenCalledWith(prisma, {
        branchId: "branch-1",
        periodKey: "2026-05",
        mode: "SOFT",
      })
    })
  })

  it("REOPEN updates period status with reason and actor", async () => {
    mockReopen.mockResolvedValue(periodRow())
    mockFindUnique.mockResolvedValue(periodRow())

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "PATCH",
      body: JSON.stringify({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "REOPEN",
        reason: "Resume month-end",
      }),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    expect(mockReopen).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        branchId: "branch-1",
        periodKey: "2026-05",
        reason: "Resume month-end",
        reopenedBy: expect.objectContaining({
          staffId: "staff-db-1",
          role: "HO_FINANCE",
        }),
      })
    )
  })

  it("rejects REOPEN without reason when period is SOFT_CLOSED with 400", async () => {
    mockReopen.mockRejectedValue(
      new FinancePostingError("reason is required for period reopen", "VALIDATION_ERROR")
    )

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "PATCH",
      body: JSON.stringify({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "REOPEN",
      }),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
    })
    expect(mockReopen).toHaveBeenCalled()
  })

  it("rejects HARD reopen for HO_FINANCE with 403", async () => {
    mockReopen.mockRejectedValue(
      new FinancePostingError("HARD reopen requires HO_ADMIN role", "FORBIDDEN")
    )

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "PATCH",
      body: JSON.stringify({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "REOPEN",
        reason: "Should fail",
      }),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({
      error: "HARD reopen requires HO_ADMIN role",
      code: "FORBIDDEN",
    })
  })

  it("returns 400 for invalid action", async () => {
    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "PATCH",
      body: JSON.stringify({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "FREEZE",
      }),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Invalid action",
      code: "INVALID_ACTION",
    })
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})
