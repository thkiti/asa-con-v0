import { listDocumentLookupRunningNumbers } from "@/lib/pos/document-lookup-running-numbers"

function makeDb(refunds: Array<{ refundNo: string }>, collectors: Array<{ collectNo: string }> = []) {
  return {
    refund: {
      findMany: jest.fn().mockResolvedValue(refunds),
    },
    collectorReport: {
      findMany: jest.fn().mockResolvedValue(collectors),
    },
  }
}

describe("listDocumentLookupRunningNumbers", () => {
  it("returns sorted unique refund running numbers for branch and month", async () => {
    const db = makeDb([
      { refundNo: "REF-SH001-202606-0008" },
      { refundNo: "REF-SH001-202606-0001" },
      { refundNo: "REF-SH001-202606-0003" },
      { refundNo: "REF-SH001-202606-0008" },
    ])

    const numbers = await listDocumentLookupRunningNumbers(db as never, {
      branchId: "branch-1",
      docType: "refund",
      year: 2026,
      month: 6,
    })

    expect(numbers).toEqual(["0001", "0003", "0008"])
    expect(db.refund.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ branchId: "branch-1" }),
      })
    )
  })

  it("returns empty list for receipt doc type", async () => {
    const db = makeDb([])
    const numbers = await listDocumentLookupRunningNumbers(db as never, {
      branchId: "branch-1",
      docType: "receipt",
      year: 2026,
      month: 6,
    })
    expect(numbers).toEqual([])
    expect(db.refund.findMany).not.toHaveBeenCalled()
    expect(db.collectorReport.findMany).not.toHaveBeenCalled()
  })

  it("returns sorted unique collector running numbers for branch and month", async () => {
    const db = makeDb(
      [],
      [
        { collectNo: "COL-SH001-202606-0003" },
        { collectNo: "COL-SH001-202606-0001" },
        { collectNo: "COL-SH001-202606-0002" },
      ]
    )

    const numbers = await listDocumentLookupRunningNumbers(db as never, {
      branchId: "branch-1",
      docType: "collector",
      year: 2026,
      month: 6,
    })

    expect(numbers).toEqual(["0001", "0002", "0003"])
    expect(db.collectorReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ branchId: "branch-1" }),
      })
    )
  })
})
