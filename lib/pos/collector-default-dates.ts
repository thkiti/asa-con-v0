import type { Prisma } from "@/generated/prisma/client"
import {
  addBangkokCalendarDays,
  bangkokCalendarYmd,
} from "@/lib/pos/bangkokDayBounds"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

export type CollectorDefaultDates = {
  dateFrom: string
  dateTo: string
}

type CollectorDefaultDatesDb = Pick<Prisma.TransactionClient, "collectorReport">

function parseCollectEndDate(reportJson: unknown): string | null {
  if (!reportJson || typeof reportJson !== "object") return null
  const report = reportJson as ReadReportPayload
  if (report.mode !== "COLLECT") return null
  const end = report.bangkokDateTo?.trim()
  return end && /^\d{4}-\d{2}-\d{2}$/.test(end) ? end : null
}

/** Default COLLECTOR range — day after latest collected end date through today. */
export async function resolveCollectorDefaultDates(
  db: CollectorDefaultDatesDb,
  branchId: string,
  at: Date = new Date()
): Promise<CollectorDefaultDates> {
  const today = bangkokCalendarYmd(at)
  const branch = branchId.trim()
  if (!branch) {
    return { dateFrom: today, dateTo: today }
  }

  const latest = await db.collectorReport.findFirst({
    where: { branchId: branch },
    orderBy: { createdAt: "desc" },
    select: { reportJson: true },
  })

  const endDate = latest ? parseCollectEndDate(latest.reportJson) : null
  if (!endDate) {
    return { dateFrom: today, dateTo: today }
  }

  const nextFrom = addBangkokCalendarDays(endDate, 1)
  const dateFrom = nextFrom > today ? today : nextFrom
  return { dateFrom, dateTo: today }
}
