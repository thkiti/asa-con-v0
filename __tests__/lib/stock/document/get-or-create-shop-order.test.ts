import type { StockDocumentWithLines } from "@/lib/stock/posting-types"
import { generateRunningRef } from "@/lib/stock/document/generate-ref"
import { getOrCreateShopOrderDocument } from "@/lib/stock/document/get-or-create-shop-order"

const FIXED_NOW = new Date("2026-06-12T10:00:00.000Z")

type BranchRow = {
  id: string
  code: string
  isActive?: boolean
  deleted?: boolean
}

type DocRow = StockDocumentWithLines

function baseOrderDoc(overrides: Partial<DocRow> = {}): DocRow {
  return {
    id: "doc-order-1",
    refNo: "TRO-SH001-202606-0001",
    docType: "TRANSFER_OUT",
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

function createMockTx(opts: { branches?: BranchRow[]; documents?: DocRow[] }) {
  const branches = new Map((opts.branches ?? []).map((b) => [b.id, b]))
  const documents = [...(opts.documents ?? [])]
  const counters = new Map<string, { running: number }>()

  const tx = {
    branch: {
      findUnique: async ({ where }: { where: { id: string } }) => {
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
      }: {
        where: Record<string, unknown>
        include?: { lines?: boolean }
      }) => {
        const matches = documents.filter((doc) => {
          if (where.docType && doc.docType !== where.docType) return false
          if (where.branchId && doc.branchId !== where.branchId) return false
          if (where.status === "DRAFT" && doc.status !== "DRAFT") return false
          return true
        })
        const found = matches.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )[0]
        if (!found) return null
        return include?.lines ? found : found
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
        const created = baseOrderDoc({
          id: `doc-order-${documents.length + 1}`,
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

describe("getOrCreateShopOrderDocument", () => {
  const branch = { id: "branch-shop", code: "SH001" }

  it("creates one TRANSFER_OUT DRAFT with running ref on first call", async () => {
    const { tx, documents } = createMockTx({ branches: [branch] })

    const doc = await getOrCreateShopOrderDocument({
      branchId: branch.id,
      staffId: "staff-1",
      tx: tx as never,
      now: FIXED_NOW,
    })

    expect(doc.status).toBe("DRAFT")
    expect(doc.docType).toBe("TRANSFER_OUT")
    expect(doc.refNo).toBe("TRO-SH001-202606-0001")
    expect(documents).toHaveLength(1)
  })

  it("returns the same active ORDER draft on second call", async () => {
    const draft = baseOrderDoc()
    const { tx, documents } = createMockTx({
      branches: [branch],
      documents: [draft],
    })

    const doc = await getOrCreateShopOrderDocument({
      branchId: branch.id,
      staffId: "staff-2",
      tx: tx as never,
      now: FIXED_NOW,
    })

    expect(doc.id).toBe(draft.id)
    expect(doc.refNo).toBe("TRO-SH001-202606-0001")
    expect(documents).toHaveLength(1)
  })

  it("creates a new ORDER draft after the prior one was submitted", async () => {
    const submitted = baseOrderDoc({ id: "doc-order-old", status: "SUBMITTED" })
    const { tx, documents } = createMockTx({
      branches: [branch],
      documents: [submitted],
    })

    const doc = await getOrCreateShopOrderDocument({
      branchId: branch.id,
      staffId: "staff-1",
      tx: tx as never,
      now: FIXED_NOW,
    })

    expect(doc.id).not.toBe(submitted.id)
    expect(doc.status).toBe("DRAFT")
    expect(doc.refNo).toBe("TRO-SH001-202606-0001")
    expect(documents).toHaveLength(2)
  })

  it("generates TRO running ref for TRANSFER_OUT", async () => {
    const { tx } = createMockTx({ branches: [branch] })
    const refNo = await generateRunningRef(
      tx as never,
      "TRANSFER_OUT",
      FIXED_NOW,
      "SH001"
    )
    expect(refNo).toBe("TRO-SH001-202606-0001")
  })
})
