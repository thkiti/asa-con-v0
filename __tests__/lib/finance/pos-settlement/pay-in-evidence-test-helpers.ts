import { PaymentEvidenceStatus } from "@/generated/prisma/client"
import type { createFinanceMockTx } from "../mock-finance-tx"

export type PayInEvidenceRow = {
  id: string
  collectorReportId: string
  collectNo: string
  branchId: string
  status: PaymentEvidenceStatus
  blobPathname: string | null
  blobUrl: string | null
  mimeType: string
  byteSize: number | null
  originalFilename: string | null
  uploadedAt: Date | null
  uploadedByStaffId: string | null
  bankDepositDate: Date | null
  bankAccountCode: string
  bankDepositVoucherId: string | null
  createdAt: Date
  updatedAt: Date
}

type CollectorReportSeedRow = {
  id: string
  collectNo: string
  branchId: string
}

export function extendMockTxWithPayInEvidence(
  base: ReturnType<typeof extendFinanceTxWithCollectorReportOnly>
) {
  const { tx, state } = base
  state.posPayInEvidence = state.posPayInEvidence ?? []

  const extendedTx = {
    ...tx,
    posPayInEvidence: {
      findUnique: async ({
        where,
      }: {
        where: { collectorReportId?: string; id?: string }
      }) => {
        if (where.collectorReportId) {
          return (
            state.posPayInEvidence!.find(
              (row) => row.collectorReportId === where.collectorReportId
            ) ?? null
          )
        }
        if (where.id) {
          return state.posPayInEvidence!.find((row) => row.id === where.id) ?? null
        }
        return null
      },
      create: async ({ data }: { data: Omit<PayInEvidenceRow, "id" | "createdAt" | "updatedAt"> & { id?: string } }) => {
        const row: PayInEvidenceRow = {
          id: data.id ?? `pay-in-${state.posPayInEvidence!.length + 1}`,
          collectorReportId: data.collectorReportId,
          collectNo: data.collectNo,
          branchId: data.branchId,
          status: data.status,
          blobPathname: data.blobPathname ?? null,
          blobUrl: data.blobUrl ?? null,
          mimeType: data.mimeType ?? "image/jpeg",
          byteSize: data.byteSize ?? null,
          originalFilename: data.originalFilename ?? null,
          uploadedAt: data.uploadedAt ?? null,
          uploadedByStaffId: data.uploadedByStaffId ?? null,
          bankDepositDate: data.bankDepositDate ?? null,
          bankAccountCode: data.bankAccountCode ?? "1021",
          bankDepositVoucherId: data.bankDepositVoucherId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        state.posPayInEvidence!.push(row)
        return row
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string }
        data: Partial<PayInEvidenceRow>
      }) => {
        const index = state.posPayInEvidence!.findIndex((row) => row.id === where.id)
        if (index < 0) throw new Error("PayInEvidence not found")
        state.posPayInEvidence![index] = {
          ...state.posPayInEvidence![index]!,
          ...data,
          updatedAt: new Date(),
        }
        return state.posPayInEvidence![index]!
      },
    },
  }

  return { tx: extendedTx, state }
}

export function seedUploadedPayInEvidence(
  state: ReturnType<typeof createFinanceMockTx>["state"] & {
    posPayInEvidence?: PayInEvidenceRow[]
  },
  source: CollectorReportSeedRow
) {
  state.posPayInEvidence = state.posPayInEvidence ?? []
  const row: PayInEvidenceRow = {
    id: `pay-in-${source.id}`,
    collectorReportId: source.id,
    collectNo: source.collectNo,
    branchId: source.branchId,
    status: PaymentEvidenceStatus.UPLOADED,
    blobPathname: `finance/pos-settlement/pay-in/${source.id}.jpg`,
    blobUrl: `https://example.test/pay-in/${source.id}.jpg`,
    mimeType: "image/jpeg",
    byteSize: 1024,
    originalFilename: "pay-in-slip.jpg",
    uploadedAt: new Date(),
    uploadedByStaffId: "staff-finance",
    bankDepositDate: null,
    bankAccountCode: "1021",
    bankDepositVoucherId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  state.posPayInEvidence.push(row)
  return row
}

type ExtendFinanceTxWithCollectorReportOnly = {
  tx: Record<string, unknown>
  state: ReturnType<typeof createFinanceMockTx>["state"] & {
    collectorReports?: Array<{
      id: string
      collectNo: string
      branchId: string
      staffId: string
      reportJson: unknown
      createdAt: Date
      branch?: { code: string; name: string }
    }>
    posPayInEvidence?: PayInEvidenceRow[]
  }
}

function extendFinanceTxWithCollectorReportOnly(
  base: ReturnType<typeof createFinanceMockTx>
): ExtendFinanceTxWithCollectorReportOnly {
  const { tx, state } = base
  state.collectorReports = state.collectorReports ?? []

  const extendedTx = {
    ...tx,
    collectorReport: {
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string }
        select?: Record<string, boolean | object>
      }) => {
        const row = state.collectorReports!.find((r) => r.id === where.id) ?? null
        if (!row || !select) return row

        const result: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(select)) {
          if (!value) continue
          if (key === "branch") {
            result.branch = row.branch ?? null
          } else {
            result[key] = row[key as keyof typeof row]
          }
        }
        return result
      },
      findMany: async ({
        where,
        orderBy,
        select,
      }: {
        where?: {
          branchId?: string
          createdAt?: { gte?: Date; lt?: Date }
        }
        orderBy?: { createdAt?: "asc" | "desc" }
        select?: { id?: boolean; reportJson?: boolean }
      } = {}) => {
        let rows = [...state.collectorReports!]
        if (where?.branchId) {
          rows = rows.filter((row) => row.branchId === where.branchId)
        }
        if (where?.createdAt?.gte) {
          rows = rows.filter((row) => row.createdAt >= where.createdAt!.gte!)
        }
        if (where?.createdAt?.lt) {
          rows = rows.filter((row) => row.createdAt < where.createdAt!.lt!)
        }
        if (orderBy?.createdAt === "desc") {
          rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        }
        if (select) {
          return rows.map((row) => {
            const result: Record<string, unknown> = {}
            if (select.id) result.id = row.id
            if (select.reportJson) result.reportJson = row.reportJson
            return result
          })
        }
        return rows
      },
    },
  }

  return { tx: extendedTx, state }
}

export function extendFinanceTxWithCollectorReportAndPayInEvidence(
  base: ReturnType<typeof createFinanceMockTx>
) {
  return extendMockTxWithPayInEvidence(extendFinanceTxWithCollectorReportOnly(base))
}

export { extendFinanceTxWithCollectorReportOnly }
