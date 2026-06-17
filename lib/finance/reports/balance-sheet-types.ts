import type { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type { FinanceReportScope } from "./report-filter"

export type BalanceSheetFilter = FinanceReportScope & {
  hideZeroBalances?: boolean
}

export type BalanceSheetRow = {
  accountCode: string
  accountName: string
  amount: string
}

export type BalanceSheetPeriodMeta = {
  legalEntityCode: DocumentEntityCode
  periodKey?: string
  periodId?: string
  periodStatus?: AccountingPeriodStatus
  from?: string
  to?: string
}

export type BalanceSheetResult = {
  filter: BalanceSheetFilter
  period: BalanceSheetPeriodMeta
  assets: BalanceSheetRow[]
  liabilities: BalanceSheetRow[]
  equity: BalanceSheetRow[]
  totalAssets: string
  totalLiabilities: string
  totalEquity: string
  totalLiabilitiesAndEquity: string
  balanceDifference: string
  isBalanced: boolean
}
