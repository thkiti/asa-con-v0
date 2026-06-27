import type { Prisma } from "@/generated/prisma/client"
import { allocateCollectNo } from "@/lib/pos/collector-report-no"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

type PersistCollectorReportDb = Pick<Prisma.TransactionClient, "$transaction">

export type PersistCollectorReportInput = {
  branchId: string
  staffId: string
  report: ReadReportPayload
}

export type PersistCollectorReportResult = {
  collectNo: string
  report: ReadReportPayload
  collectorReportId: string
}

export async function persistCollectorReport(
  db: PersistCollectorReportDb,
  input: PersistCollectorReportInput
): Promise<PersistCollectorReportResult> {
  return db.$transaction(async (tx) => {
    const at = new Date()
    const collectNo = await allocateCollectNo(tx, input.branchId, at)
    const report: ReadReportPayload = { ...input.report, collectNo }
    const row = await tx.collectorReport.create({
      data: {
        collectNo,
        branchId: input.branchId,
        staffId: input.staffId,
        reportJson: report as Prisma.InputJsonValue,
      },
      select: { id: true },
    })
    return { collectNo, report, collectorReportId: row.id }
  })
}
