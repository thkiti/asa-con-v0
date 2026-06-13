import type { Prisma } from "@/generated/prisma/client"
import {
  GlAccountType,
  type PrismaClient,
} from "@/generated/prisma/client"
import { getActiveClosingEntry } from "../closing-entry-status"
import { addMoney, toMoney, ZERO } from "../decimal"
import { FINANCE_REF_TYPES } from "../posting-types"
import type { BalanceSheetPeriodMeta } from "./balance-sheet-types"
import { signedBalanceForAccountType } from "./balance-helpers"
import type {
  ChangesInEquityColumn,
  ChangesInEquityFilter,
  ChangesInEquityResult,
  ChangesInEquityRow,
  ChangesInEquityRowKey,
  ChangesInEquityWarning,
} from "./changes-in-equity-types"
import { getGeneralLedger } from "./general-ledger"
import { getProfitLoss } from "./profit-loss"
import { accountingPeriodUniqueWhere } from "../period-lookup"
import { RETAINED_EARNINGS_ACCOUNT_CODE } from "./retained-earnings"
import { resolveReportDateRange } from "./report-filter"

export type ChangesInEquityPrisma = Pick<
  PrismaClient,
  "glAccount" | "journalEntryLine" | "accountingPeriod" | "voucher" | "journalEntry"
>

const ROW_LABELS: Record<ChangesInEquityRowKey, string> = {
  OPENING: "Opening balance",
  PROFIT_FOR_PERIOD: "Profit for period",
  OTHER_CHANGES: "Other changes",
  CLOSING: "Closing balance",
  RECONCILIATION_CHECK: "Reconciliation check",
}

function emptyResult(
  filter: ChangesInEquityFilter,
  period: BalanceSheetPeriodMeta
): ChangesInEquityResult {
  return {
    filter,
    period,
    columns: [],
    rows: [],
    profitForPeriod: "0",
    profitSource: "PROFIT_LOSS",
    retainedEarningsAccountCode: RETAINED_EARNINGS_ACCOUNT_CODE,
    activeClosingEntry: null,
    reconciliation: {
      isBalanced: true,
      columnDifferences: {},
      totalDifference: "0",
    },
    warnings: [],
  }
}

async function resolvePeriodMeta(
  prisma: ChangesInEquityPrisma,
  filter: ChangesInEquityFilter
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
    periodStatus: period.status,
  }
}

async function resolvePeriodExists(
  prisma: ChangesInEquityPrisma,
  periodKey: string
): Promise<{ exists: boolean; periodId: string | null }> {
  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey }),
    select: { id: true },
  })
  return { exists: period != null, periodId: period?.id ?? null }
}

function sumAmounts(values: Record<string, string>): Prisma.Decimal {
  let total = ZERO
  for (const amount of Object.values(values)) {
    total = addMoney(total, toMoney(amount))
  }
  return total
}

function buildRowAmounts(
  columns: ChangesInEquityColumn[],
  valuesByAccountCode: Record<string, Prisma.Decimal>
): Record<string, string> {
  const amounts: Record<string, string> = {}
  for (const column of columns) {
    amounts[column.accountCode] = (valuesByAccountCode[column.accountCode] ?? ZERO).toString()
  }
  return amounts
}

function buildRow(
  rowKey: ChangesInEquityRowKey,
  columns: ChangesInEquityColumn[],
  valuesByAccountCode: Record<string, Prisma.Decimal>
): ChangesInEquityRow {
  const amounts = buildRowAmounts(columns, valuesByAccountCode)
  return {
    rowKey,
    label: ROW_LABELS[rowKey],
    amounts,
    total: sumAmounts(amounts).toString(),
  }
}

function accountHasActivity(input: {
  opening: Prisma.Decimal
  closing: Prisma.Decimal
  other: Prisma.Decimal
  profit: Prisma.Decimal
}): boolean {
  return (
    !input.opening.equals(ZERO) ||
    !input.closing.equals(ZERO) ||
    !input.other.equals(ZERO) ||
    !input.profit.equals(ZERO)
  )
}

async function loadEquityAccounts(prisma: ChangesInEquityPrisma) {
  return prisma.glAccount.findMany({
    where: {
      deleted: false,
      isActive: true,
      accountType: GlAccountType.EQUITY,
    },
    orderBy: { code: "asc" },
  })
}

async function computeOtherChangesByAccountId(
  prisma: ChangesInEquityPrisma,
  filter: ChangesInEquityFilter,
  equityAccounts: { id: string; accountType: GlAccountType }[],
  range: { start: Date; endExclusive: Date }
): Promise<Map<string, Prisma.Decimal>> {
  const accountIds = equityAccounts.map((account) => account.id)
  const accountTypeById = new Map(
    equityAccounts.map((account) => [account.id, account.accountType])
  )
  const otherByAccountId = new Map<string, Prisma.Decimal>()
  for (const accountId of accountIds) {
    otherByAccountId.set(accountId, ZERO)
  }

  if (accountIds.length === 0) {
    return otherByAccountId
  }

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      glAccountId: { in: accountIds },
      journalEntry: {
        branchId: filter.branchId,
        date: {
          gte: range.start,
          lt: range.endExclusive,
        },
      },
    },
    select: {
      glAccountId: true,
      debit: true,
      credit: true,
      journalEntry: {
        select: {
          voucher: {
            select: {
              refType: true,
            },
          },
        },
      },
    },
  })

  for (const line of lines) {
    if (line.journalEntry.voucher.refType === FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY) {
      continue
    }

    const accountType = accountTypeById.get(line.glAccountId)
    if (!accountType) {
      continue
    }

    const movement = signedBalanceForAccountType(
      accountType,
      toMoney(line.debit),
      toMoney(line.credit)
    )
    otherByAccountId.set(
      line.glAccountId,
      addMoney(otherByAccountId.get(line.glAccountId) ?? ZERO, movement)
    )
  }

  return otherByAccountId
}

function buildProfitAmountsByAccountCode(
  columns: ChangesInEquityColumn[],
  profitForPeriod: Prisma.Decimal
): Record<string, Prisma.Decimal> {
  const values: Record<string, Prisma.Decimal> = {}
  for (const column of columns) {
    values[column.accountCode] =
      column.accountCode === RETAINED_EARNINGS_ACCOUNT_CODE ? profitForPeriod : ZERO
  }
  return values
}

function buildReconciliationRow(
  columns: ChangesInEquityColumn[],
  openingByCode: Record<string, Prisma.Decimal>,
  profitByCode: Record<string, Prisma.Decimal>,
  otherByCode: Record<string, Prisma.Decimal>,
  closingByCode: Record<string, Prisma.Decimal>
): {
  row: ChangesInEquityRow
  columnDifferences: Record<string, string>
  totalDifference: Prisma.Decimal
  isBalanced: boolean
} {
  const differences: Record<string, Prisma.Decimal> = {}
  for (const column of columns) {
    const code = column.accountCode
    const expectedClosing = addMoney(
      addMoney(openingByCode[code] ?? ZERO, profitByCode[code] ?? ZERO),
      otherByCode[code] ?? ZERO
    )
    differences[code] = addMoney(
      expectedClosing,
      toMoney(closingByCode[code] ?? ZERO).negated()
    )
  }

  const columnDifferences: Record<string, string> = {}
  for (const column of columns) {
    columnDifferences[column.accountCode] = (
      differences[column.accountCode] ?? ZERO
    ).toString()
  }

  const totalDifference = sumAmounts(columnDifferences)
  const isBalanced = Object.values(differences).every((difference) => difference.equals(ZERO))

  return {
    row: buildRow("RECONCILIATION_CHECK", columns, differences),
    columnDifferences,
    totalDifference,
    isBalanced,
  }
}

function buildWarnings(input: {
  columns: ChangesInEquityColumn[]
  profitSource: ChangesInEquityResult["profitSource"]
  profitForPeriod: Prisma.Decimal
  profitLossNetIncome: Prisma.Decimal
  isReconciliationBalanced: boolean
}): ChangesInEquityWarning[] {
  const warnings: ChangesInEquityWarning[] = []

  const hasRetainedEarningsColumn = input.columns.some(
    (column) => column.accountCode === RETAINED_EARNINGS_ACCOUNT_CODE
  )
  if (!hasRetainedEarningsColumn) {
    warnings.push({
      code: "NO_RETAINED_EARNINGS_ACCOUNT",
      message: `No account ${RETAINED_EARNINGS_ACCOUNT_CODE} (retained earnings) in scope.`,
    })
  }

  if (
    input.profitSource === "CLOSING_ENTRY" &&
    !input.profitForPeriod.equals(input.profitLossNetIncome)
  ) {
    warnings.push({
      code: "PROFIT_CLOSING_ENTRY_MISMATCH",
      message:
        "Posted closing entry net income differs from current profit and loss net income.",
    })
  }

  if (input.profitSource === "PROFIT_LOSS" && !input.profitForPeriod.equals(ZERO)) {
    warnings.push({
      code: "UNCLOSED_PROFIT_PERIOD",
      message:
        "Profit for period comes from profit and loss; closing balance excludes unposted net income until a closing entry is posted.",
    })
  }

  if (!input.isReconciliationBalanced) {
    warnings.push({
      code: "RECONCILIATION_DIFFERENCE",
      message: "Opening + profit + other does not equal closing for one or more equity accounts.",
    })
  }

  return warnings
}

/**
 * Read-only statement of changes in equity from cumulative GL balances and period activity.
 * Opening/closing reuse general ledger logic; other changes exclude PERIOD_CLOSING_ENTRY vouchers.
 */
export async function getChangesInEquity(
  prisma: ChangesInEquityPrisma,
  filter: ChangesInEquityFilter
): Promise<ChangesInEquityResult> {
  const period = await resolvePeriodMeta(prisma, filter)

  if (filter.periodKey) {
    const { exists } = await resolvePeriodExists(prisma, filter.periodKey)
    if (!exists) {
      return emptyResult(filter, period)
    }
  }

  const equityAccounts = await loadEquityAccounts(prisma)
  if (equityAccounts.length === 0) {
    return emptyResult(filter, period)
  }

  const ledger = await getGeneralLedger(prisma, {
    ...filter,
    accountCodes: equityAccounts.map((account) => account.code),
  })

  const { range } = resolveReportDateRange(filter)
  const otherByAccountId = await computeOtherChangesByAccountId(
    prisma,
    filter,
    equityAccounts,
    range
  )

  const profitLoss = await getProfitLoss(prisma, filter)
  const profitLossNetIncome = toMoney(profitLoss.netIncome)

  let profitForPeriod = profitLossNetIncome
  let profitSource: ChangesInEquityResult["profitSource"] = "PROFIT_LOSS"
  let activeClosingEntry: ChangesInEquityResult["activeClosingEntry"] = null

  if (period.periodId) {
    const activeEntry = await getActiveClosingEntry(prisma, period.periodId)
    if (activeEntry) {
      profitForPeriod = toMoney(activeEntry.netIncome)
      profitSource = "CLOSING_ENTRY"
      activeClosingEntry = {
        voucherId: activeEntry.voucherId,
        voucherNo: activeEntry.voucherNo,
        journalEntryId: activeEntry.journalEntryId,
        netIncome: activeEntry.netIncome,
        postedAt: activeEntry.postedAt,
      }
    }
  }

  const ledgerByCode = new Map(ledger.accounts.map((account) => [account.accountCode, account]))

  const activeColumns: ChangesInEquityColumn[] = []
  const openingByCode: Record<string, Prisma.Decimal> = {}
  const closingByCode: Record<string, Prisma.Decimal> = {}
  const otherByCode: Record<string, Prisma.Decimal> = {}

  for (const account of equityAccounts) {
    const ledgerAccount = ledgerByCode.get(account.code)
    const opening = toMoney(ledgerAccount?.openingBalance ?? "0")
    const closing = toMoney(ledgerAccount?.closingBalance ?? "0")
    const other = otherByAccountId.get(account.id) ?? ZERO
    const profit =
      account.code === RETAINED_EARNINGS_ACCOUNT_CODE ? profitForPeriod : ZERO

    openingByCode[account.code] = opening
    closingByCode[account.code] = closing
    otherByCode[account.code] = other

    if (!accountHasActivity({ opening, closing, other, profit })) {
      continue
    }

    activeColumns.push({
      accountCode: account.code,
      accountName: account.name,
    })
  }

  if (activeColumns.length === 0) {
    return emptyResult(filter, period)
  }

  const profitByCode = buildProfitAmountsByAccountCode(activeColumns, profitForPeriod)

  const rows: ChangesInEquityRow[] = [
    buildRow("OPENING", activeColumns, openingByCode),
    buildRow("PROFIT_FOR_PERIOD", activeColumns, profitByCode),
    buildRow("OTHER_CHANGES", activeColumns, otherByCode),
    buildRow("CLOSING", activeColumns, closingByCode),
  ]

  const reconciliation = buildReconciliationRow(
    activeColumns,
    openingByCode,
    profitByCode,
    otherByCode,
    closingByCode
  )
  rows.push(reconciliation.row)

  const warnings = buildWarnings({
    columns: activeColumns,
    profitSource,
    profitForPeriod,
    profitLossNetIncome,
    isReconciliationBalanced: reconciliation.isBalanced,
  })

  return {
    filter,
    period,
    columns: activeColumns,
    rows,
    profitForPeriod: profitForPeriod.toString(),
    profitSource,
    retainedEarningsAccountCode: RETAINED_EARNINGS_ACCOUNT_CODE,
    activeClosingEntry,
    reconciliation: {
      isBalanced: reconciliation.isBalanced,
      columnDifferences: reconciliation.columnDifferences,
      totalDifference: reconciliation.totalDifference.toString(),
    },
    warnings,
  }
}
