import { listStockDocuments } from "@/lib/stock/document-read/document-list"
import { encodeListCursor } from "@/lib/stock/document-read/cursor"

function makePrisma(rows: Array<Record<string, unknown>>) {
  return {
    stockDocument: {
      findMany: jest.fn().mockResolvedValue(rows),
    },
  }
}

describe("listStockDocuments", () => {
  it("returns items and nextCursor when more than limit", async () => {
    const createdAt = new Date("2026-02-01T00:00:00.000Z")
    const row = {
      id: "doc-1",
      refNo: "REF-1",
      docType: "PERFORMANCE",
      status: "DRAFT",
      date: new Date("2026-02-01"),
      periodMonth: "2026-02",
      branchId: "branch-1",
      fromLocId: "branch-1",
      toLocId: null,
      submittedAt: null,
      confirmedAt: null,
      postedAt: null,
      cancelledAt: null,
      createdAt,
      _count: { lines: 2 },
    }

    const prisma = makePrisma([row, { ...row, id: "doc-2", createdAt: new Date("2026-01-01") }])

    const result = await listStockDocuments(prisma as never, {
      branchId: "branch-1",
      limit: 1,
    })

    expect(result.items).toHaveLength(1)
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).toBe(
      encodeListCursor({ createdAt: createdAt.toISOString(), id: "doc-1" })
    )
  })
})
