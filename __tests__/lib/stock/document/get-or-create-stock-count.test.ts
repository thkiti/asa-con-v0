import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import { generateRunningRef, refPeriodKey } from "@/lib/stock/document/generate-ref"
import { getOrCreateStockCountDocument } from "@/lib/stock/document/get-or-create-stock-count"

const FIXED_NOW = new Date("2026-06-10T10:00:00.000Z")

type BranchRow = {
  id: string
  code: string
  isActive?: boolean
  deleted?: boolean
}

type DocRow = StockDocumentWithLines

function baseDoc(overrides: Partial<DocRow> = {}): DocRow {
  return {
    id: "doc-1",
    refNo: "ADJ-SH001-202606-0001",
    docType: "ADJUSTMENT",
    status: "DRAFT",
    date: FIXED_NOW,
    branchId: "branch-shop",
    periodMonth: "2026-06",
    fromLocId: "branch-shop",
    toLocId: null,
    submittedAt: null,
    confirmedAt: null,
    postedAt: null,
    createdByStaffId: "staff-1",
    confirmedByStaffId: null,
    postedByStaffId: null,
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    createdAt: FIXED_NOW,
    lines: [],
    ...overrides,
  }
}

function createGetOrCreateMockTx(opts: {
  branches?: BranchRow[]
  documents?: DocRow[]
}) {
  const branches = new Map((opts.branches ?? []).map((b) => [b.id, b]))
  const documents = [...(opts.documents ?? [])]
  const counters = new Map<string, { running: number }>()

  const tx = {
    branch: {
      findUnique: async ({
        where,
      }: {
        where: { id: string }
      }) => {
        const row = branches.get(where.id)
        if (!row) return null
        return {
          id: row.id,
          code: row.code,
          isActive: row.isActive ?? true,
          deleted: row.deleted ?? false,
        }
      },
    },
    stockDocument: {
      findFirst: async ({
        where,
        include,
        select,
      }: {
        where: Record<string, unknown>
        include?: { lines?: boolean }
        select?: Record<string, boolean>
      }) => {
        const matches = documents.filter((doc) => {
          if (where.docType && doc.docType !== where.docType) return false
          if (where.branchId && doc.branchId !== where.branchId) return false
          if (where.fromLocId && doc.fromLocId !== where.fromLocId) return false
          if (where.periodMonth && doc.periodMonth !== where.periodMonth) return false
          if (where.status === "DRAFT" && doc.status !== "DRAFT") return false
          const statusFilter = where.status as { in?: DocRow["status"][] } | undefined
          if (statusFilter?.in && !statusFilter.in.includes(doc.status)) return false
          return true
        })
        const found = matches.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )[0]
        if (!found) return null
        if (select) {
          const picked: Record<string, unknown> = {}
          for (const key of Object.keys(select)) {
            if (select[key]) picked[key] = (found as Record<string, unknown>)[key]
          }
          return picked
        }
        if (include?.lines) return found
        return found
      },
      create: async ({
        data,
        include,
      }: {
        data: {
          refNo: string
          docType: DocRow["docType"]
          status: DocRow["status"]
          date: Date
          branchId: string
          fromLocId: string | null
          toLocId: string | null
          periodMonth: string | null
          createdByStaffId: string | null
        }
        include?: { lines?: boolean }
      }) => {
        const created = baseDoc({
          id: `doc-${documents.length + 1}`,
          refNo: data.refNo,
          docType: data.docType,
          status: data.status,
          date: data.date,
          branchId: data.branchId,
          fromLocId: data.fromLocId,
          toLocId: data.toLocId,
          periodMonth: data.periodMonth,
          createdByStaffId: data.createdByStaffId,
          createdAt: data.date,
          lines: [],
        })
        documents.push(created)
        return include?.lines ? created : created
      },
    },
    documentCounter: {
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: {
          docType_shopId_period: {
            docType: string
            shopId: string
            period: string
          }
        }
        update: { running: { increment: number } }
        create: { docType: string; shopId: string; period: string; running: number }
      }) => {
        const key = `${where.docType_shopId_period.docType}:${where.docType_shopId_period.shopId}:${where.docType_shopId_period.period}`
        const existing = counters.get(key)
        if (existing) {
          existing.running += update.running.increment
          return { running: existing.running }
        }
        counters.set(key, { running: create.running })
        return { running: create.running }
      },
    },
  }

  return { tx, documents }
}

describe("refPeriodKey / generateRunningRef", () => {
  it("formats YYYYMM for ref counter period", () => {
    expect(refPeriodKey(new Date("2026-06-10"))).toBe("202606")
  })

  it("generates ADJ-SH001-202606-0001 on first counter", async () => {
    const { tx } = createGetOrCreateMockTx({})
    const refNo = await generateRunningRef(
      tx as never,
      "ADJUSTMENT",
      FIXED_NOW,
      "sh001"
    )
    expect(refNo).toBe("ADJ-SH001-202606-0001")
  })
})

describe("getOrCreateStockCountDocument", () => {
  const branch = { id: "branch-shop", code: "SH001" }
  const otherBranch = { id: "branch-other", code: "SH002" }

  it("creates one ADJUSTMENT DRAFT for branch/month on first call", async () => {
    const { tx, documents } = createGetOrCreateMockTx({ branches: [branch] })

    const doc = await getOrCreateStockCountDocument({
      branchId: branch.id,
      staffId: "staff-1",
      tx: tx as never,
      now: FIXED_NOW,
    })

    expect(doc.status).toBe("DRAFT")
    expect(doc.docType).toBe("ADJUSTMENT")
    expect(doc.branchId).toBe(branch.id)
    expect(doc.fromLocId).toBe(branch.id)
    expect(doc.periodMonth).toBe("2026-06")
    expect(doc.refNo).toBe("ADJ-SH001-202606-0001")
    expect(doc.createdByStaffId).toBe("staff-1")
    expect(documents).toHaveLength(1)
  })

  it("returns the same DRAFT on second call without changing date", async () => {
    const originalDate = new Date("2026-06-05T08:00:00.000Z")
    const draft = baseDoc({ date: originalDate, createdAt: originalDate })
    const { tx } = createGetOrCreateMockTx({
      branches: [branch],
      documents: [draft],
    })

    const doc = await getOrCreateStockCountDocument({
      branchId: branch.id,
      staffId: "staff-2",
      tx: tx as never,
      now: FIXED_NOW,
    })

    expect(doc.id).toBe(draft.id)
    expect(doc.date).toEqual(originalDate)
    expect(doc.refNo).toBe(draft.refNo)
    expect(doc.createdByStaffId).toBe("staff-1")
  })

  it("creates separate drafts for different branches", async () => {
    const { tx, documents } = createGetOrCreateMockTx({
      branches: [branch, otherBranch],
    })

    const first = await getOrCreateStockCountDocument({
      branchId: branch.id,
      staffId: "staff-1",
      tx: tx as never,
      now: FIXED_NOW,
    })
    const second = await getOrCreateStockCountDocument({
      branchId: otherBranch.id,
      staffId: "staff-1",
      tx: tx as never,
      now: FIXED_NOW,
    })

    expect(first.id).not.toBe(second.id)
    expect(first.refNo).toBe("ADJ-SH001-202606-0001")
    expect(second.refNo).toBe("ADJ-SH002-202606-0001")
    expect(documents).toHaveLength(2)
  })

  it("rejects when month already has a SUBMITTED stock count", async () => {
    const submitted = baseDoc({ status: "SUBMITTED" })
    const { tx } = createGetOrCreateMockTx({
      branches: [branch],
      documents: [submitted],
    })

    await expect(
      getOrCreateStockCountDocument({
        branchId: branch.id,
        staffId: "staff-1",
        tx: tx as never,
        now: FIXED_NOW,
      })
    ).rejects.toMatchObject({
      code: DocumentErrorCodes.STOCK_COUNT_ALREADY_SUBMITTED,
      httpStatus: 409,
    })
  })
})
