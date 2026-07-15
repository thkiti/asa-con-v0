import { bangkokWeekdaySun0 } from "@/lib/shop-ui/sales-target-calendar"
import type { SalesDashboardDayCell } from "@/lib/shop/sales-dashboard-types"

export type TargetActualCalendarCell =
  | { kind: "empty"; key: string }
  | {
      kind: "day"
      key: string
      day: number
      dateKey: string
      weekdaySun0: number
      target: string | null
      actualGross: string
      actualVat: string
      actualNet: string
      lastMonthGross: string | null
    }

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function buildTargetActualCalendarGrid(input: {
  year: number
  month: number
  days: SalesDashboardDayCell[]
}): TargetActualCalendarCell[] {
  const { year, month, days } = input
  const leadingPads = bangkokWeekdaySun0(year, month, 1)

  const cells: TargetActualCalendarCell[] = []
  for (let i = 0; i < leadingPads; i++) {
    cells.push({ kind: "empty", key: `pad-start-${i}` })
  }

  for (const row of days) {
    const dayNum = Number(row.dateKey.slice(8, 10))
    cells.push({
      kind: "day",
      key: row.dateKey,
      day: dayNum,
      dateKey: row.dateKey,
      weekdaySun0: bangkokWeekdaySun0(year, month, dayNum),
      target: row.target,
      actualGross: row.actualGross,
      actualVat: row.actualVat,
      actualNet: row.actualNet,
      lastMonthGross: row.lastMonthGross,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ kind: "empty", key: `pad-end-${cells.length}` })
  }

  return cells
}

export const TARGET_ACTUAL_DASHBOARD_HEADER_GRID =
  "grid w-full grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_4.25rem_3rem] sm:items-center"

export const ALL_COMPANY_SCOPE_VALUE = ""
