import type { GlAccountType } from "@/generated/prisma/client"
import type { FinanceReportScope } from "./report-filter"

export type TrialBalanceFilter = FinanceReportScope & {
  hideZeroBalances?: boolean
}

export type TrialBalanceRow = {
  accountCode: string
  accountName: string
  accountType: GlAccountType
  totalDebit: string
  totalCredit: string
  signedBalance: string
}

export type TrialBalanceResult = {
  filter: TrialBalanceFilter
  rows: TrialBalanceRow[]
  totalDebits: string
  totalCredits: string
  difference: string
  isBalanced: boolean
}
