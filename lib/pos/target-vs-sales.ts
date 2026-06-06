import type { PrismaClient } from "@/generated/prisma/client"
import { getSalesDashboardMetrics } from "@/lib/pos/sales-dashboard-metrics"
import type { PosTargetVsSalesSummary } from "@/lib/pos/target-vs-sales-types"
import {
  bangkokCalendarParts,
  bangkokDateKey,
} from "@/lib/reporting/bangkok-calendar"
import {
  getBranchSalesTarget,
  splitMonthlyTargetToDaily,
} from "@/lib/shop/sales-targets"

type PosTargetVsSalesDb = Pick<
  PrismaClient,
  "sale" | "refund" | "branchSalesTarget" | "branch"
>

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

export function formatPosTargetVsSalesMonthLabel(
  year: number,
  month: number
): string {
  return `${MONTH_LABELS[month - 1] ?? "Month"} ${year}`
}

function computeAchievementPercent(
  monthActual: string,
  monthTarget: string | null
): string | null {
  if (monthTarget == null) return null
  const target = Number(monthTarget)
  const actual = Number(monthActual)
  if (!Number.isFinite(target) || target <= 0) return null
  if (!Number.isFinite(actual)) return null
  return ((actual / target) * 100).toFixed(1)
}

export async function buildPosTargetVsSalesSummary(
  db: PosTargetVsSalesDb,
  input: { branchId: string; now?: Date }
): Promise<PosTargetVsSalesSummary> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    throw new Error("branchId is required")
  }

  const now = input.now ?? new Date()
  const { y: year, m: month } = bangkokCalendarParts(now)
  const todayDateKey = bangkokDateKey(now)

  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { code: true },
  })

  const [targetRow, metrics] = await Promise.all([
    getBranchSalesTarget(db, { branchId, year, month }),
    getSalesDashboardMetrics(db, { branchId, year, month }),
  ])

  const monthTarget = targetRow.exists ? targetRow.monthlyTotal : null
  const monthActual = metrics.monthSummary.grossSales

  const dailyTargets = targetRow.exists
    ? splitMonthlyTargetToDaily({
        monthlyTotal: targetRow.monthlyTotal,
        weekPattern: targetRow.weekPattern,
        year,
        month,
      })
    : []
  const targetByDate = new Map(dailyTargets.map((row) => [row.dateKey, row.target]))
  const actualByDate = new Map(metrics.days.map((row) => [row.dateKey, row.grossSales]))

  const days = metrics.days.map((row) => {
    const dayNum = Number(row.dateKey.slice(8, 10))
    const target = targetRow.exists ? (targetByDate.get(row.dateKey) ?? "0.00") : null
    return {
      dateKey: row.dateKey,
      day: dayNum,
      target,
      actual: actualByDate.get(row.dateKey) ?? "0.00",
      isToday: row.dateKey === todayDateKey,
    }
  })

  const todayTarget = targetRow.exists
    ? (targetByDate.get(todayDateKey) ?? "0.00")
    : null
  const todayActual = actualByDate.get(todayDateKey) ?? "0.00"

  return {
    branchCode: branch?.code ?? "",
    monthLabel: formatPosTargetVsSalesMonthLabel(year, month),
    today: {
      target: todayTarget,
      actual: todayActual,
    },
    month: {
      target: monthTarget,
      actual: monthActual,
      achievementPercent: computeAchievementPercent(monthActual, monthTarget),
    },
    days,
  }
}
