import { SaleStatus, type PrismaClient } from "@/generated/prisma/client"
import {
  bangkokCalendarYmd,
  utcRangeForBangkokCalendarDay,
} from "@/lib/pos/bangkokDayBounds"

type ReadZDatesPrisma = Pick<PrismaClient, "sale" | "refund">

/** Bangkok YYYY-MM-DD values with completed sale or refund activity in range. */
export async function listReadZAvailableBangkokDates(
  prisma: ReadZDatesPrisma,
  branchId: string,
  fromYmd: string,
  toYmd: string
): Promise<string[]> {
  const { start } = utcRangeForBangkokCalendarDay(fromYmd)
  const { endExclusive } = utcRangeForBangkokCalendarDay(toYmd)

  const [sales, refunds] = await Promise.all([
    prisma.sale.findMany({
      where: {
        branchId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: start, lt: endExclusive },
      },
      select: { createdAt: true },
    }),
    prisma.refund.findMany({
      where: {
        branchId,
        createdAt: { gte: start, lt: endExclusive },
      },
      select: { createdAt: true },
    }),
  ])

  const dates = new Set<string>()
  for (const row of sales) {
    dates.add(bangkokCalendarYmd(row.createdAt))
  }
  for (const row of refunds) {
    dates.add(bangkokCalendarYmd(row.createdAt))
  }
  dates.add(toYmd)

  return [...dates]
    .filter((ymd) => ymd >= fromYmd && ymd <= toYmd)
    .sort((a, b) => b.localeCompare(a))
}

export function readZAvailableDatesRange(toYmd: string): {
  fromYmd: string
  toYmd: string
} {
  const monthStart = `${toYmd.slice(0, 7)}-01`
  return { fromYmd: monthStart, toYmd }
}
