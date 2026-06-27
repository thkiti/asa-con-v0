import { searchCollectorLookup } from "@/lib/pos/collector-lookup"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

const sampleReport: ReadReportPayload = {
  mode: "COLLECT",
  bangkokDate: "2026-06-05 – 2026-06-09",
  bangkokDateFrom: "2026-06-05",
  bangkokDateTo: "2026-06-09",
  generatedAt: "2026-06-09T10:00:00.000Z",
  staffId: "001",
  staffName: "HO Collector",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [],
  dailyCashLines: [{ salesDateYmd: "2026-06-05", cashAmount: 36120, ticketCount: 37 }],
  grandTotal: 36120,
  saleCount: 37,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 36120,
}

function makeDb(collectors: unknown[]) {
  return {
    collectorReport: {
      findMany: jest.fn().mockResolvedValue(collectors),
    },
    branch: {
      findUnique: jest.fn().mockResolvedValue({ taxId: "0123456789012" }),
    },
  }
}

const collectorRow = {
  id: "col-1",
  collectNo: "COL-SH001-202606-0003",
  createdAt: new Date("2026-06-09T10:00:00.000Z"),
  branchId: "branch-1",
  reportJson: sampleReport,
  branch: {
    code: "SH001",
    name: "Chidlom",
    phone: "02-111-2222",
    taxId: "MACHINE-001",
  },
}

describe("searchCollectorLookup", () => {
  it("returns branch-scoped collector rows with legacy archive status", async () => {
    const db = makeDb([collectorRow])

    const result = await searchCollectorLookup(db as never, {
      branchId: "branch-1",
      collectNo: "COL-SH001-202606-0003",
    })

    expect(db.collectorReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: "branch-1",
          collectNo: { contains: "COL-SH001-202606-0003", mode: "insensitive" },
        }),
      })
    )
    expect(result.collectors).toHaveLength(1)
    expect(result.collectors[0]).toMatchObject({
      collectNo: "COL-SH001-202606-0003",
      archiveStatus: "legacy",
      pdfUrl: null,
      report: expect.objectContaining({
        mode: "COLLECT",
        grandTotal: 36120,
        saleCount: 37,
      }),
    })
  })

  it("returns empty list when branch id is missing", async () => {
    const db = makeDb([])
    const result = await searchCollectorLookup(db as never, { branchId: "" })
    expect(result.collectors).toEqual([])
    expect(db.collectorReport.findMany).not.toHaveBeenCalled()
  })
})
