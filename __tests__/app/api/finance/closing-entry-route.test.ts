jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    accountingPeriod: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
  requirePeriodAdminActor: jest.fn(),
  PeriodAdminAuthError: class PeriodAdminAuthError extends Error {
    code = "FORBIDDEN"
    httpStatus = 403
    constructor(message: string) {
      super(message)
      this.name = "PeriodAdminAuthError"
    }
  },
}))

jest.mock("@/lib/finance/closing-entry-post", () => ({
  previewClosingEntry: jest.fn(),
  postClosingEntry: jest.fn(),
}))

import { NextRequest } from "next/server"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { GET as getPreview } from "@/app/api/finance/periods/[id]/closing-entry/preview/route"
import { POST as postClosing } from "@/app/api/finance/periods/[id]/closing-entry/route"
import { previewClosingEntry, postClosingEntry } from "@/lib/finance/closing-entry-post"
import { prisma } from "@/lib/shared/prisma"
import { requirePeriodAdminActor } from "@/lib/auth"

const mockFindUnique = prisma.accountingPeriod.findUnique as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock
const mockPreview = previewClosingEntry as jest.Mock
const mockPost = postClosingEntry as jest.Mock

const period = {
  id: "period-1",
  branchId: "branch-1",
  periodKey: "2026-05",
  status: AccountingPeriodStatus.OPEN,
}

describe("closing entry API routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindUnique.mockResolvedValue(period)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue({
      staffId: "staff-1",
      name: "Admin",
      role: "HO_FINANCE",
    })
  })

  it("preview is read-only", async () => {
    mockPreview.mockResolvedValue({
      periodKey: period.periodKey,
      branchId: period.branchId,
      periodId: period.id,
      periodStatus: period.status,
      simulation: {
        lines: [],
        totalDebit: "0",
        totalCredit: "0",
        netIncome: "0",
        isBalanced: true,
        isRequired: false,
        retainedEarningsAccountCode: "301",
      },
      activeEntry: null,
      canPost: false,
    })

    const res = await getPreview(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: period.id }),
    })

    expect(res.status).toBe(200)
    expect(mockPreview).toHaveBeenCalledWith(prisma, {
      periodId: period.id,
      periodKey: period.periodKey,
    })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("POST creates closing entry in transaction", async () => {
    mockPost.mockResolvedValue({
      posted: true,
      voucherId: "voucher-1",
      voucherNo: "V-2026-05-00001",
      journalEntryId: "journal-1",
      netIncome: "400",
      lineCount: 3,
      alreadyPosted: false,
    })
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({})
    )

    const res = await postClosing(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: period.id }),
    })

    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockPost).toHaveBeenCalled()
    await expect(res.json()).resolves.toEqual({
      posted: {
        posted: true,
        voucherId: "voucher-1",
        voucherNo: "V-2026-05-00001",
        journalEntryId: "journal-1",
        netIncome: "400",
        lineCount: 3,
        alreadyPosted: false,
      },
    })
  })

  it("POST duplicate is idempotent", async () => {
    mockPost.mockResolvedValue({
      posted: true,
      voucherId: "voucher-1",
      voucherNo: "V-2026-05-00001",
      journalEntryId: "journal-1",
      netIncome: "400",
      lineCount: 3,
      alreadyPosted: true,
    })
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({})
    )

    const res = await postClosing(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: period.id }),
    })

    await expect(res.json()).resolves.toMatchObject({
      posted: { alreadyPosted: true },
    })
  })

  it("POST rejects closed period", async () => {
    const { FinancePostingError } = await import("@/lib/finance/posting-errors")
    mockPost.mockRejectedValue(new FinancePostingError("period closed", "PERIOD_CLOSED"))
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({})
    )

    const res = await postClosing(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: period.id }),
    })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ code: "PERIOD_CLOSED" })
  })
})
