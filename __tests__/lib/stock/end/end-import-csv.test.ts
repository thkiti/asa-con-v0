import { importEndCsv } from "@/lib/stock/end/end-import-csv"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
    stockDocument: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock("@/lib/stock/end/end-rebuild", () => ({
  rebuildEndDocument: jest.fn(),
}))

import { prisma } from "@/lib/shared/prisma"
import { rebuildEndDocument } from "@/lib/stock/end/end-rebuild"

const CSV = `Product Code,BEGIN Qty,COUNT Qty
SKU-1,10,12
SKU-2,5,
`

describe("importEndCsv", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.product.findMany as jest.Mock).mockResolvedValue([
      { id: "p1", code: "SKU-1" },
      { id: "p2", code: "SKU-2" },
    ])
    ;(prisma.stockDocument.findUnique as jest.Mock).mockResolvedValue({
      id: "end-1",
      docType: "END",
      endStatus: "DRAFT",
      periodMonth: "2026-01",
      endLines: [
        {
          id: "line-1",
          productId: "p1",
          beginQty: 0,
          countQty: null,
        },
      ],
    })
  })

  it("parses preview without writing beginManual", async () => {
    const result = await importEndCsv({
      documentId: "end-1",
      staffId: "staff-1",
      csvText: CSV,
      mode: "preview",
      fileName: "init.csv",
    })

    expect(result.mode).toBe("preview")
    expect(result.valid).toBe(true)
    expect(result.rows).toEqual([
      expect.objectContaining({
        productCode: "SKU-1",
        productId: "p1",
        beginQty: 10,
        countQty: 12,
      }),
      expect.objectContaining({
        productCode: "SKU-2",
        productId: "p2",
        beginQty: 5,
        countQty: null,
      }),
    ])
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(rebuildEndDocument).not.toHaveBeenCalled()
  })

  it("apply sets beginManual and rebuilds", async () => {
    const endLineUpdate = jest.fn().mockResolvedValue({})
    const endLineCreate = jest.fn().mockResolvedValue({})
    const stockDocumentUpdate = jest.fn().mockResolvedValue({})
    const endAuditCreate = jest.fn().mockResolvedValue({})

    ;(rebuildEndDocument as jest.Mock).mockResolvedValue({
      document: { id: "end-1", docType: "END" },
      lineCount: 2,
      contributionCount: 0,
      completeness: { ok: false, blockers: [], warnings: [] },
    })

    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: unknown) => Promise<unknown>) =>
        fn({
          endLine: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: "line-1",
                productId: "p1",
                beginQty: 0,
                countQty: null,
              },
            ]),
            update: endLineUpdate,
            create: endLineCreate,
          },
          stockDocument: {
            update: stockDocumentUpdate,
          },
          endAuditEvent: {
            create: endAuditCreate,
          },
        })
    )

    const result = await importEndCsv({
      documentId: "end-1",
      staffId: "staff-1",
      csvText: CSV,
      mode: "apply",
      fileName: "init.csv",
    })

    expect(result.mode).toBe("apply")
    expect(result.valid).toBe(true)
    expect(endLineUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "line-1" },
        data: expect.objectContaining({
          beginQty: 10,
          beginManual: true,
          countQty: 12,
          countManual: true,
        }),
      })
    )
    expect(endLineCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "p2",
          beginQty: 5,
          beginManual: true,
        }),
      })
    )
    expect(rebuildEndDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "end-1",
        staffId: "staff-1",
      })
    )
  })
})
