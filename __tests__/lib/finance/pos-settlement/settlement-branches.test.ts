import { BranchType } from "@/generated/prisma/client"
import {
  isCollectModeCollectorReport,
  parseCollectorReportPayload,
} from "@/lib/finance/pos-settlement/collector-report-source"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

function collectReport(overrides: Partial<ReadReportPayload> = {}): ReadReportPayload {
  return {
    mode: "COLLECT",
    collectNo: "COL-SH001-202606-0001",
    bangkokDate: "2026-06-03 – 2026-06-05",
    generatedAt: "2026-06-26T08:16:00.000Z",
    staffId: "001",
    staffName: "Collector Staff",
    branchCode: "SH001",
    branchName: "Chidlom",
    groupLines: [],
    paymentLines: [],
    grandTotal: 1000,
    saleCount: 10,
    refundCount: 0,
    refundTotal: 0,
    netTotal: 1000,
    ...overrides,
  }
}

describe("collector report source helpers", () => {
  it("detects COLLECT mode reports", () => {
    expect(isCollectModeCollectorReport(collectReport())).toBe(true)
  })

  it("rejects Z and invalid payloads", () => {
    expect(isCollectModeCollectorReport(collectReport({ mode: "Z" }))).toBe(false)
    expect(isCollectModeCollectorReport(null)).toBe(false)
    expect(isCollectModeCollectorReport("bad")).toBe(false)
  })

  it("parses collector report payload", () => {
    const report = collectReport()
    expect(parseCollectorReportPayload(report)).toEqual(report)
  })
})

describe("listPosSettlementShopBranches", () => {
  it("returns active SH branches excluding SH999", async () => {
    const { listPosSettlementShopBranches } = await import(
      "@/lib/finance/pos-settlement/settlement-branches"
    )

    const rows = await listPosSettlementShopBranches({
      branch: {
        findMany: async ({
          where,
        }: {
          where: {
            type: BranchType
            isActive: boolean
            deleted: boolean
            code: { not: string }
          }
        }) => {
          expect(where.type).toBe(BranchType.SH)
          expect(where.isActive).toBe(true)
          expect(where.deleted).toBe(false)
          expect(where.code.not).toBe("SH999")
          return [
            { id: "branch-sh001", code: "SH001", name: "Chidlom" },
            { id: "branch-sh002", code: "SH002", name: "Siam" },
          ]
        },
      },
    } as never)

    expect(rows).toEqual([
      { id: "branch-sh001", code: "SH001", name: "Chidlom" },
      { id: "branch-sh002", code: "SH002", name: "Siam" },
    ])
  })
})
