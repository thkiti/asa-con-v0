export type PosWorktimeDayCell = {
  dateKey: string
  day: number
  /** HH:mm:ss Bangkok, or null when not recorded. */
  clockIn: string | null
  clockOut: string | null
  isToday: boolean
}

export type PosWorktimeMonthSummary = {
  /** Days with clock-in recorded. */
  workDays: number
  /** Total worked duration as HH:mm:ss (completed IN/OUT pairs). */
  totalHours: string
  /** Days with only IN or only OUT. */
  incompleteDays: number
}

export type PosWorktimeView = {
  branchCode: string
  monthLabel: string
  summary: PosWorktimeMonthSummary
  days: PosWorktimeDayCell[]
}
