import { Prisma } from "@/generated/prisma/client"
import { collectRecUsage } from "@/lib/stock/end/end-sources"
import { rebuildEndDocument } from "@/lib/stock/end/end-rebuild"
import { toMoney } from "@/lib/finance/decimal"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

import { prisma } from "@/lib/shared/prisma"

describe("collectRecUsage source rules", () => {
  it("counts TRACKED sales as USAGE once; CONSUMABLE only in untrackable; REF not in usage", async () => {
    const db = {
      sale: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "sale-1",
            items: [
              {
                id: "si-1",
                productId: "p1",
                productType: "TRACKED",
                qty: 2,
                lineTotal: new Prisma.Decimal("100.00"),
              },
              {
                id: "si-2",
                productId: null,
                productType: "CONSUMABLE",
                qty: 1,
                lineTotal: new Prisma.Decimal("30.00"),
              },
            ],
          },
        ]),
      },
      refund: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal("15.00") },
        }),
      },
    }

    const result = await collectRecUsage(db as never, {
      branchId: "branch-1",
      periodMonth: "2026-01",
      legalEntityCode: "AS",
    })

    expect(result.usageByProduct.get("p1")).toBe(2)
    expect(result.contributions).toHaveLength(1)
    expect(result.contributions[0]).toMatchObject({
      productId: "p1",
      sourceDocumentType: "REC",
      contributionKind: "USAGE",
      quantity: 2,
    })
    expect(result.trackableSales.toFixed(2)).toBe("100.00")
    expect(result.untrackableSales.toFixed(2)).toBe("30.00")
    expect(result.refundsTotal.toFixed(2)).toBe("15.00")
    // Refunds are summarized separately — never added to usage maps
    expect([...result.usageByProduct.keys()]).toEqual(["p1"])
  })
})

describe("rebuildEndDocument idempotency", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("rebuild twice with same collected sources yields same line and contribution counts", async () => {
    const contributions = [
      {
        productId: "p1",
        sourceDocumentType: "REC",
        sourceDocumentId: "sale-1",
        sourceLineId: "si-1",
        contributionKind: "USAGE" as const,
        quantity: 2,
      },
    ]

    const docBase = {
      id: "end-1",
      docType: "END" as const,
      endStatus: "DRAFT" as const,
      periodMonth: "2026-01",
      legalEntityCode: "AS",
      branchId: "branch-1",
      endSourceRebuildVersion: 0,
      endLines: [] as Array<{
        id: string
        productId: string
        beginQty: number
        beginManual: boolean
        countManual: boolean
        countQty: number | null
      }>,
    }

    let lines: Array<Record<string, unknown>> = []
    let contribRows: Array<Record<string, unknown>> = []
    let version = 0

    const tx = {
      stockDocument: {
        findUnique: jest.fn().mockImplementation(async () => ({
          ...docBase,
          endSourceRebuildVersion: version,
          endLines: lines.map((l) => ({
            id: String(l.id),
            productId: String(l.productId),
            beginQty: Number(l.beginQty ?? 0),
            beginManual: Boolean(l.beginManual),
            countManual: Boolean(l.countManual),
            countQty: (l.countQty as number | null) ?? null,
          })),
        })),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
          if (typeof data.endSourceRebuildVersion === "number") {
            version = data.endSourceRebuildVersion
          }
          return { ...docBase, ...data, endSourceRebuildVersion: version }
        }),
      },
      accountingPeriod: {
        findUnique: jest.fn().mockResolvedValue({ status: "OPEN" }),
      },
      sale: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "sale-1",
            items: [
              {
                id: "si-1",
                productId: "p1",
                productType: "TRACKED",
                qty: 2,
                lineTotal: toMoney(100),
              },
            ],
          },
        ]),
      },
      refund: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: toMoney(0) } }),
      },
      sellingPrice: {
        findMany: jest.fn().mockResolvedValue([
          {
            productId: "p1",
            price: toMoney(10),
            effectiveFrom: new Date("2026-01-01"),
          },
        ]),
      },
      endLine: {
        deleteMany: jest.fn().mockImplementation(async () => {
          lines = []
          return { count: 0 }
        }),
        createMany: jest.fn().mockImplementation(async ({ data }: { data: Array<Record<string, unknown>> }) => {
          lines = data.map((row, i) => ({ ...row, id: `line-${i + 1}` }))
          return { count: data.length }
        }),
      },
      endSourceContribution: {
        deleteMany: jest.fn().mockImplementation(async () => {
          contribRows = []
          return { count: 0 }
        }),
        createMany: jest.fn().mockImplementation(async ({ data }: { data: Array<Record<string, unknown>> }) => {
          contribRows = [...data]
          return { count: data.length }
        }),
      },
      endAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    }

    // Also satisfy DEY / ASAD / CNT queries used by collectEndSources
    ;(tx.stockDocument as { findMany?: jest.Mock }).findMany = jest
      .fn()
      .mockResolvedValue([])

    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    const first = await rebuildEndDocument({
      documentId: "end-1",
      staffId: "staff-1",
    })
    const firstContribSnapshot = JSON.stringify(contribRows)
    const firstLineSnapshot = JSON.stringify(
      lines.map((l) => ({
        productId: l.productId,
        beginQty: l.beginQty,
        inQty: l.inQty,
        usageQty: l.usageQty,
        countQty: l.countQty,
        adjQty: l.adjQty,
      }))
    )

    const second = await rebuildEndDocument({
      documentId: "end-1",
      staffId: "staff-1",
    })

    expect(first.lineCount).toBe(1)
    expect(first.contributionCount).toBe(1)
    expect(second.lineCount).toBe(first.lineCount)
    expect(second.contributionCount).toBe(first.contributionCount)
    expect(JSON.stringify(contribRows)).toBe(firstContribSnapshot)
    expect(
      JSON.stringify(
        lines.map((l) => ({
          productId: l.productId,
          beginQty: l.beginQty,
          inQty: l.inQty,
          usageQty: l.usageQty,
          countQty: l.countQty,
          adjQty: l.adjQty,
        }))
      )
    ).toBe(firstLineSnapshot)

    // REC contributes exactly once even across rebuilds
    const recContribs = contribRows.filter((c) => c.sourceDocumentType === "REC")
    expect(recContribs).toHaveLength(1)
    expect(recContribs[0]).toMatchObject(contributions[0])
  })
})
