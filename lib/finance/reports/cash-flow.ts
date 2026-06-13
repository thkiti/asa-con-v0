import type { Prisma } from "@/generated/prisma/client"
import {
  GlAccountType,
  type AccountingPeriodStatus,
  type PrismaClient,
} from "@/generated/prisma/client"
import { addMoney, roundMoney, toMoney, ZERO } from "../decimal"
import type { BalanceSheetPeriodMeta } from "./balance-sheet-types"
import {
  allMappedAccountCodes,
  CASH_FLOW_V1_MAPPINGS,
  isCashFlowMappedAccountCode,
  PENDING_CASH_FLOW_MAPPINGS,
} from "./cash-flow-mapping"
import type {
  CashFlowFilter,
  CashFlowLine,
  CashFlowResult,
  CashFlowSection,
  CashFlowWarning,
} from "./cash-flow-types"
import { getChangesInEquity } from "./changes-in-equity"
import { getGeneralLedger } from "./general-ledger"
import { getProfitLoss } from "./profit-loss"
import { accountingPeriodUniqueWhere } from "../period-lookup"
import { resolveReportDateRange } from "./report-filter"

export type CashFlowPrisma = Pick<
  PrismaClient,
  "glAccount" | "journalEntryLine" | "accountingPeriod" | "voucher" | "journalEntry"
>

function sumLineAmounts(lines: CashFlowLine[]): Prisma.Decimal {
  let total = ZERO
  for (const line of lines) {
    total = addMoney(total, toMoney(line.amount))
  }
  return total
}

function buildSection(lines: CashFlowLine[]): CashFlowSection {
  return {
    lines,
    subtotal: sumLineAmounts(lines).toString(),
  }
}

async function resolvePeriodMeta(
  prisma: CashFlowPrisma,
  filter: CashFlowFilter
): Promise<BalanceSheetPeriodMeta> {
  const base: BalanceSheetPeriodMeta = {
    branchId: filter.branchId,
    periodKey: filter.periodKey,
    from: filter.from,
    to: filter.to,
  }

  if (!filter.periodKey) {
    return base
  }

  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey: filter.periodKey }),
    select: { id: true, status: true },
  })

  if (!period) {
    return base
  }

  return {
    ...base,
    periodId: period.id,
    periodStatus: period.status as AccountingPeriodStatus,
  }
}

function workingCapitalCashEffect(
  accountType: GlAccountType,
  opening: Prisma.Decimal,
  closing: Prisma.Decimal
): Prisma.Decimal {
  const change = roundMoney(closing.minus(opening))
  if (accountType === GlAccountType.ASSET) {
    return roundMoney(change.negated())
  }
  if (accountType === GlAccountType.LIABILITY) {
    return change
  }
  return ZERO
}

function buildPendingMappingWarnings(): CashFlowWarning[] {
  return PENDING_CASH_FLOW_MAPPINGS.map((entry) => ({
    code: "PENDING_MAPPING" as const,
    message: `${entry.label} is not mapped in cash flow v1; related activity may be misclassified until mapping is added.`,
  }))
}

function buildUnmappedAccountWarnings(
  ledgerAccounts: {
    accountCode: string
    accountName: string
    accountType: GlAccountType
    openingBalance: string
    closingBalance: string
    transactions: unknown[]
  }[]
): CashFlowWarning[] {
  const warnings: CashFlowWarning[] = []

  for (const account of ledgerAccounts) {
    if (account.accountType === GlAccountType.REVENUE || account.accountType === GlAccountType.EXPENSE) {
      continue
    }
    if (account.accountType === GlAccountType.EQUITY) {
      continue
    }
    if (isCashFlowMappedAccountCode(account.accountCode)) {
      continue
    }

    const opening = toMoney(account.openingBalance)
    const closing = toMoney(account.closingBalance)
    const hasActivity =
      account.transactions.length > 0 || !roundMoney(closing.minus(opening)).equals(ZERO)

    if (!hasActivity) {
      continue
    }

    warnings.push({
      code: "UNMAPPED_ACCOUNT_WITH_ACTIVITY",
      message: `Account ${account.accountCode} (${account.accountName}) has activity in scope but is not mapped to cash flow v1.`,
    })
  }

  return warnings
}

function sumLedgerBalances(
  ledgerByCode: Map<
    string,
    { openingBalance: string; closingBalance: string; accountName: string }
  >,
  codes: readonly string[]
): { opening: Prisma.Decimal; closing: Prisma.Decimal } {
  let opening = ZERO
  let closing = ZERO
  for (const code of codes) {
    const account = ledgerByCode.get(code)
    if (!account) {
      continue
    }
    opening = addMoney(opening, toMoney(account.openingBalance))
    closing = addMoney(closing, toMoney(account.closingBalance))
  }
  return { opening, closing }
}

function buildWorkingCapitalLines(
  ledgerByCode: Map<
    string,
    {
      accountCode: string
      accountName: string
      accountType: GlAccountType
      openingBalance: string
      closingBalance: string
    }
  >,
  codes: readonly string[],
  sectionKey: "WC_ASSET" | "WC_LIABILITY"
): CashFlowLine[] {
  const lines: CashFlowLine[] = []

  for (const code of codes) {
    const account = ledgerByCode.get(code)
    if (!account) {
      continue
    }
    const opening = toMoney(account.openingBalance)
    const closing = toMoney(account.closingBalance)
    const amount = workingCapitalCashEffect(account.accountType, opening, closing)
    if (amount.equals(ZERO)) {
      continue
    }
    lines.push({
      key: `${sectionKey}_${code}`,
      label: `Change in ${account.accountName} (${code})`,
      amount: amount.toString(),
      source: "GL_DELTA",
      accountCode: code,
    })
  }

  return lines
}

function buildFinancingLines(
  equityChanges: Awaited<ReturnType<typeof getChangesInEquity>>
): CashFlowLine[] {
  const otherRow = equityChanges.rows.find((row) => row.rowKey === "OTHER_CHANGES")
  if (!otherRow) {
    return []
  }

  const lines: CashFlowLine[] = []
  for (const column of equityChanges.columns) {
    const amount = toMoney(otherRow.amounts[column.accountCode] ?? "0")
    if (amount.equals(ZERO)) {
      continue
    }
    lines.push({
      key: `FINANCING_${column.accountCode}`,
      label: `Other changes — ${column.accountName} (${column.accountCode})`,
      amount: amount.toString(),
      source: "EQUITY_OTHER",
      accountCode: column.accountCode,
    })
  }

  if (lines.length === 0) {
    const total = toMoney(otherRow.total)
    if (!total.equals(ZERO)) {
      lines.push({
        key: "FINANCING_OTHER_TOTAL",
        label: "Other changes in equity",
        amount: total.toString(),
        source: "EQUITY_OTHER",
      })
    }
  }

  return lines
}

export async function getCashFlow(
  prisma: CashFlowPrisma,
  filter: CashFlowFilter
): Promise<CashFlowResult> {
  const period = await resolvePeriodMeta(prisma, filter)

  if (filter.periodKey) {
    const exists = await prisma.accountingPeriod.findUnique({
      where: accountingPeriodUniqueWhere({ periodKey: filter.periodKey }),
      select: { id: true },
    })
    if (!exists) {
      return emptyCashFlowResult(filter, period)
    }
  }

  resolveReportDateRange(filter)

  const [profitLoss, ledger, equityChanges] = await Promise.all([
    getProfitLoss(prisma, filter),
    getGeneralLedger(prisma, filter),
    getChangesInEquity(prisma, filter),
  ])

  const ledgerByCode = new Map(ledger.accounts.map((account) => [account.accountCode, account]))

  const operatingLines: CashFlowLine[] = [
    {
      key: "NET_INCOME",
      label: "Net income",
      amount: profitLoss.netIncome,
      source: "PROFIT_LOSS",
    },
    ...buildWorkingCapitalLines(
      ledgerByCode,
      CASH_FLOW_V1_MAPPINGS.workingCapitalAssets,
      "WC_ASSET"
    ),
    ...buildWorkingCapitalLines(
      ledgerByCode,
      CASH_FLOW_V1_MAPPINGS.workingCapitalLiabilities,
      "WC_LIABILITY"
    ),
  ]

  const investingLines: CashFlowLine[] = [
    {
      key: "INVESTING_UNMAPPED",
      label: "Investing activities (not mapped in v1)",
      amount: "0",
      source: "CONFIG",
    },
  ]

  const financingLines = buildFinancingLines(equityChanges)

  const operating = buildSection(operatingLines)
  const investing = buildSection(investingLines)
  const financing = buildSection(financingLines)

  const netChangeInCash = addMoney(
    addMoney(toMoney(operating.subtotal), toMoney(investing.subtotal)),
    toMoney(financing.subtotal)
  )

  const cashBalances = sumLedgerBalances(
    ledgerByCode,
    CASH_FLOW_V1_MAPPINGS.cashAndEquivalents
  )
  const glChange = roundMoney(cashBalances.closing.minus(cashBalances.opening))
  const difference = roundMoney(netChangeInCash.minus(glChange))
  const isReconciled = difference.equals(ZERO)

  const warnings: CashFlowWarning[] = [
    ...buildPendingMappingWarnings(),
    ...buildUnmappedAccountWarnings(ledger.accounts),
  ]

  if (!isReconciled) {
    warnings.push({
      code: "CASH_RECONCILIATION_DIFFERENCE",
      message: `Computed net change in cash (${netChangeInCash.toString()}) does not equal change in cash and equivalents from the ledger (${glChange.toString()}); difference ${difference.toString()}.`,
    })
  }

  for (const warning of equityChanges.warnings) {
    if (warning.code === "UNCLOSED_PROFIT_PERIOD") {
      warnings.push({
        code: "UNCLOSED_PROFIT_PERIOD",
        message: warning.message,
      })
    }
  }

  warnings.push({
    code: "NO_INVESTING_MAPPED",
    message: "Investing activities are not mapped in cash flow v1; section subtotal is zero.",
  })

  return {
    filter,
    period,
    method: "INDIRECT",
    sections: {
      operating,
      investing,
      financing,
    },
    netChangeInCash: netChangeInCash.toString(),
    netIncome: profitLoss.netIncome,
    cashReconciliation: {
      openingCashAndEquivalents: cashBalances.opening.toString(),
      closingCashAndEquivalents: cashBalances.closing.toString(),
      glChange: glChange.toString(),
      computedChange: netChangeInCash.toString(),
      difference: difference.toString(),
      isReconciled,
    },
    warnings,
  }
}

function emptyCashFlowResult(
  filter: CashFlowFilter,
  period: BalanceSheetPeriodMeta
): CashFlowResult {
  return {
    filter,
    period,
    method: "INDIRECT",
    sections: {
      operating: { lines: [], subtotal: "0" },
      investing: { lines: [], subtotal: "0" },
      financing: { lines: [], subtotal: "0" },
    },
    netChangeInCash: "0",
    netIncome: "0",
    cashReconciliation: {
      openingCashAndEquivalents: "0",
      closingCashAndEquivalents: "0",
      glChange: "0",
      computedChange: "0",
      difference: "0",
      isReconciled: true,
    },
    warnings: buildPendingMappingWarnings(),
  }
}
