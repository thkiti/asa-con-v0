export type PosTargetVsSalesTodaySummary = {
  target: string | null
  actual: string
}

export type PosTargetVsSalesMonthSummary = {
  target: string | null
  actual: string
  achievementPercent: string | null
}

export type PosTargetVsSalesDayCell = {
  dateKey: string
  day: number
  target: string | null
  actual: string
  isToday: boolean
}

export type PosTargetVsSalesSummary = {
  branchCode: string
  monthLabel: string
  today: PosTargetVsSalesTodaySummary
  month: PosTargetVsSalesMonthSummary
  days: PosTargetVsSalesDayCell[]
}
