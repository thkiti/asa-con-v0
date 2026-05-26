import { NextRequest } from "next/server"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { bootstrapPeriodIfMissing } from "@/lib/finance/period-setup"
import {
  closeAccountingPeriod,
  reopenAccountingPeriod,
} from "@/lib/finance/period-close"
import { listAccountingPeriods } from "@/lib/finance/period-list"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { GET, PATCH, POST } from "@/app/api/finance/periods/route"
import { prisma } from "@/lib/shared/prisma"

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

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    accountingPeriod: { findUnique: jest.fn() },
  },
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
    mockTransaction.mockImplementation(async (fn) => fn(prisma))
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
    mockTransaction.mockImplementation(async (fn) => fn(prisma))
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
    })
  })

  it("REOPEN updates period status", async () => {
    mockReopen.mockResolvedValue(periodRow())
    mockFindUnique.mockResolvedValue(periodRow())

    const req = new NextRequest("http://localhost/api/finance/periods", {
      method: "PATCH",
      body: JSON.stringify({
        branchId: "branch-1",
        periodKey: "2026-05",
        action: "REOPEN",
      }),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(200)
    expect(mockReopen).toHaveBeenCalledWith(prisma, {
      branchId: "branch-1",
      periodKey: "2026-05",
    })
  })

  it("rejects reopen on a hard-closed period with 409", async () => {
    mockReopen.mockRejectedValue(
      new FinancePostingError(
        "Accounting period 2026-05 is hard closed and cannot be reopened",
        "PERIOD_ALREADY_HARD_CLOSED"
      )
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

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: "Accounting period 2026-05 is hard closed and cannot be reopened",
      code: "PERIOD_ALREADY_HARD_CLOSED",
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
