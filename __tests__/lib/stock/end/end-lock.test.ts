import { lockEndDocument } from "@/lib/stock/end/end-lock"
import { reopenEndDocument } from "@/lib/stock/end/end-reopen"
import { EndError, EndErrorCodes } from "@/lib/stock/end/end-errors"
import * as issueStock from "@/lib/stock/issue-stock"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

import { prisma } from "@/lib/shared/prisma"

describe("lockEndDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("rejects incomplete END without calling stockTransaction or issueStock", async () => {
    const stockTransactionCreate = jest.fn()
    const issueSpy = jest.spyOn(issueStock, "applyIssueItem")

    const doc = {
      id: "end-1",
      docType: "END" as const,
      endStatus: "DRAFT" as const,
      periodMonth: "2026-01",
      legalEntityCode: "AS",
      branchId: "branch-1",
      endLines: [
        {
          productId: "p1",
          beginQty: 10,
          inQty: 0,
          usageQty: 0,
          actualQty: 10,
          countQty: null,
          endingQty: null,
          adjQty: null,
          priceIncomplete: false,
          countIncomplete: true,
          countManual: false,
          beginManual: false,
        },
      ],
    }

    const tx = {
      stockDocument: {
        findUnique: jest.fn().mockResolvedValue(doc),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(doc),
      },
      accountingPeriod: {
        findUnique: jest.fn().mockResolvedValue({ status: "OPEN" }),
      },
      endAuditEvent: {
        create: jest.fn(),
      },
      stockTransaction: {
        create: stockTransactionCreate,
      },
    }

    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await expect(
      lockEndDocument({ documentId: "end-1", staffId: "staff-1" })
    ).rejects.toMatchObject({
      code: EndErrorCodes.COMPLETENESS_BLOCKED,
      name: "EndError",
    })

    expect(stockTransactionCreate).not.toHaveBeenCalled()
    expect(issueSpy).not.toHaveBeenCalled()
    expect(tx.endAuditEvent.create).not.toHaveBeenCalled()
    expect(tx.stockDocument.update).toHaveBeenCalled()

    issueSpy.mockRestore()
  })

  it("locks a complete END without stockTransaction or issueStock", async () => {
    const stockTransactionCreate = jest.fn()
    const issueSpy = jest.spyOn(issueStock, "applyIssueItem")

    const doc = {
      id: "end-1",
      docType: "END" as const,
      endStatus: "READY_FOR_REVIEW" as const,
      periodMonth: "2026-01",
      legalEntityCode: "AS",
      branchId: "branch-1",
      endTotalAdjAmount: null,
      endLines: [
        {
          productId: "p1",
          beginQty: 10,
          inQty: 0,
          usageQty: 0,
          actualQty: 10,
          countQty: 10,
          endingQty: 10,
          adjQty: 0,
          priceIncomplete: false,
          countIncomplete: false,
          countManual: true,
          beginManual: true,
        },
      ],
    }

    const tx = {
      stockDocument: {
        findUnique: jest.fn().mockResolvedValue(doc),
        findFirst: jest.fn().mockResolvedValue({ id: "cnt-1" }),
        update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          ...doc,
          ...data,
        })),
      },
      accountingPeriod: {
        findUnique: jest.fn().mockResolvedValue({ status: "OPEN" }),
      },
      endAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
      stockTransaction: {
        create: stockTransactionCreate,
      },
    }

    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    const result = await lockEndDocument({
      documentId: "end-1",
      staffId: "staff-1",
    })

    expect(result.document.endStatus).toBe("LOCKED")
    expect(stockTransactionCreate).not.toHaveBeenCalled()
    expect(issueSpy).not.toHaveBeenCalled()
    expect(tx.endAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: "LOCKED" }),
      })
    )

    issueSpy.mockRestore()
  })
})

describe("reopenEndDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("requires a reopen reason", async () => {
    await expect(
      reopenEndDocument({
        documentId: "end-1",
        staffId: "staff-1",
        role: "HO_ADMIN",
        reason: "   ",
      })
    ).rejects.toMatchObject({
      code: EndErrorCodes.INVALID_INPUT,
      message: "Reopen reason is required",
    })

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("rejects reopen without HO_ADMIN / HO_FINANCE role", async () => {
    await expect(
      reopenEndDocument({
        documentId: "end-1",
        staffId: "staff-1",
        role: "HO_OPERATIONS",
        reason: "fix counts",
      })
    ).rejects.toBeInstanceOf(EndError)

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
