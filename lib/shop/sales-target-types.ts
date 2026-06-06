export const DEFAULT_WEEK_PATTERN: readonly number[] = [1, 1, 1, 1, 1, 1, 1]

export type SalesTargetBranchOption = {
  id: string
  code: string
  name: string
}

export type BranchSalesTargetView = {
  id?: string
  branchId: string
  year: number
  month: number
  monthlyTotal: string
  weekPattern: number[]
  exists: boolean
  updatedAt?: string
}

export type DailyTargetSplit = {
  dateKey: string
  weekday: string
  target: string
}
