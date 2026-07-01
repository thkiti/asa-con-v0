import type { Prisma } from "@/generated/prisma/client"
import { type GlAccountType, type PrismaClient } from "@/generated/prisma/client"
import { ReportError } from "@/lib/reporting/report-errors"
import { addMoney, toMoney, ZERO } from "../decimal"
import { signedBalanceForAccountType } from "./balance-helpers"
import type {
  GeneralLedgerAccount,
  GeneralLedgerFilter,
  GeneralLedgerResult,
  GeneralLedgerTransaction,
} from "./general-ledger-types"
import { resolveReportDateRange } from "./report-filter"
import { accountingPeriodUniqueWhere } from "../period-lookup"

export type GeneralLedgerPrisma = Pick<
  PrismaClient,
  "glAccount" | "journalEntryLine" | "accountingPeriod"
>

type PeriodLineRow = {
  id: string
  lineNo: number
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo: string | null
  journalEntry: {
    id: string
    date: Date
    voucher: {
      id: string
      voucherNo: string
      refNo: string | null
      refType: string
      refId: string
      description: string | null
    }
  }
}

async function resolvePeriodExists(
  prisma: GeneralLedgerPrisma,
  periodKey: string,
  legalEntityCode: GeneralLedgerFilter["legalEntityCode"]
): Promise<boolean> {
  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey, legalEntityCode }),
    select: { id: true },
  })
  return period != null
}

async function loadAccounts(prisma: GeneralLedgerPrisma, filter: GeneralLedgerFilter) {
  const requestedIds = [
    ...(filter.accountId ? [filter.accountId] : []),
    ...(filter.accountIds ?? []),
  ]
  const requestedCodes = [
    ...(filter.accountCode ? [filter.accountCode] : []),
    ...(filter.accountCodes ?? []),
  ]

  const hasIdFilter = requestedIds.length > 0
  const hasCodeFilter = requestedCodes.length > 0

  const accounts = await prisma.glAccount.findMany({
    where: {
      deleted: false,
      isActive: true,
      ...(hasIdFilter && hasCodeFilter
        ? {
            OR: [{ id: { in: requestedIds } }, { code: { in: requestedCodes } }],
          }
        : hasIdFilter
          ? { id: { in: requestedIds } }
          : hasCodeFilter
            ? { code: { in: requestedCodes } }
            : {}),
    },
    orderBy: { code: "asc" },
  })

  if (hasIdFilter) {
    for (const id of requestedIds) {
      if (!accounts.some((account) => account.id === id)) {
        throw new ReportError(`GL account not found for id ${id}`, "ACCOUNT_NOT_FOUND")
      }
    }
  }

  if (hasCodeFilter) {
    for (const code of requestedCodes) {
      if (!accounts.some((account) => account.code === code)) {
        throw new ReportError(`GL account not found for code ${code}`, "ACCOUNT_NOT_FOUND")
      }
    }
  }

  return accounts
}

function comparePeriodLines(a: PeriodLineRow, b: PeriodLineRow): number {
  const dateDiff = a.journalEntry.date.getTime() - b.journalEntry.date.getTime()
  if (dateDiff !== 0) return dateDiff

  const entryDiff = a.journalEntry.voucher.voucherNo.localeCompare(
    b.journalEntry.voucher.voucherNo
  )
  if (entryDiff !== 0) return entryDiff

  const lineNoDiff = a.lineNo - b.lineNo
  if (lineNoDiff !== 0) return lineNoDiff

  return a.id.localeCompare(b.id)
}

function buildTransactions(
  accountType: GlAccountType,
  openingBalance: Prisma.Decimal,
  lines: PeriodLineRow[]
): { transactions: GeneralLedgerTransaction[]; closingBalance: Prisma.Decimal } {
  let running = openingBalance
  const transactions: GeneralLedgerTransaction[] = []

  for (const line of lines) {
    const debit = toMoney(line.debit)
    const credit = toMoney(line.credit)
    const movement = signedBalanceForAccountType(accountType, debit, credit)
    running = addMoney(running, movement)

    transactions.push({
      journalEntryId: line.journalEntry.id,
      journalLineId: line.id,
      journalDate: line.journalEntry.date.toISOString(),
      entryNo: line.journalEntry.voucher.voucherNo,
      sourceRef: line.journalEntry.voucher.refNo,
      sourceRefType: line.journalEntry.voucher.refType,
      sourceRefId: line.journalEntry.voucher.refId,
      voucherId: line.journalEntry.voucher.id,
      description: line.journalEntry.voucher.description,
      lineMemo: line.memo,
      debit: debit.toString(),
      credit: credit.toString(),
      signedMovement: movement.toString(),
      runningBalance: running.toString(),
    })
  }

  return { transactions, closingBalance: running }
}

export async function getGeneralLedger(
  prisma: GeneralLedgerPrisma,
  filter: GeneralLedgerFilter
): Promise<GeneralLedgerResult> {
  if (filter.periodKey) {
    const periodExists = await resolvePeriodExists(
      prisma,
      filter.periodKey,
      filter.legalEntityCode
    )
    if (!periodExists) {
      return { filter, accounts: [] }
    }
  }

  const accounts = await loadAccounts(prisma, filter)
  const { range } = resolveReportDateRange(filter)
  const accountIds = accounts.map((account) => account.id)

  if (accountIds.length === 0) {
    return { filter, accounts: [] }
  }

  const openingLines = await prisma.journalEntryLine.findMany({
    where: {
      glAccountId: { in: accountIds },
      journalEntry: {
        legalEntityCode: filter.legalEntityCode,
        ...(filter.branchId ? { branchId: filter.branchId } : {}),
        date: { lt: range.start },
      },
    },
    select: {
      glAccountId: true,
      debit: true,
      credit: true,
    },
  })

  const periodLines = (await prisma.journalEntryLine.findMany({
    where: {
      glAccountId: { in: accountIds },
      journalEntry: {
        legalEntityCode: filter.legalEntityCode,
        ...(filter.branchId ? { branchId: filter.branchId } : {}),
        date: {
          gte: range.start,
          lt: range.endExclusive,
        },
      },
    },
    select: {
      id: true,
      lineNo: true,
      glAccountId: true,
      debit: true,
      credit: true,
      memo: true,
      journalEntry: {
        select: {
          id: true,
          date: true,
          voucher: {
            select: {
              id: true,
              voucherNo: true,
              refNo: true,
              refType: true,
              refId: true,
              description: true,
            },
          },
        },
      },
    },
  })) as PeriodLineRow[]

  const openingDebitByAccount = new Map<string, Prisma.Decimal>()
  const openingCreditByAccount = new Map<string, Prisma.Decimal>()
  for (const accountId of accountIds) {
    openingDebitByAccount.set(accountId, ZERO)
    openingCreditByAccount.set(accountId, ZERO)
  }

  for (const line of openingLines) {
    openingDebitByAccount.set(
      line.glAccountId,
      addMoney(openingDebitByAccount.get(line.glAccountId) ?? ZERO, toMoney(line.debit))
    )
    openingCreditByAccount.set(
      line.glAccountId,
      addMoney(openingCreditByAccount.get(line.glAccountId) ?? ZERO, toMoney(line.credit))
    )
  }

  const periodLinesByAccount = new Map<string, PeriodLineRow[]>()
  for (const accountId of accountIds) {
    periodLinesByAccount.set(accountId, [])
  }
  for (const line of periodLines) {
    const bucket = periodLinesByAccount.get(line.glAccountId) ?? []
    bucket.push(line)
    periodLinesByAccount.set(line.glAccountId, bucket)
  }

  const ledgerAccounts: GeneralLedgerAccount[] = accounts.map((account) => {
    const openingDebit = openingDebitByAccount.get(account.id) ?? ZERO
    const openingCredit = openingCreditByAccount.get(account.id) ?? ZERO
    const openingBalance = signedBalanceForAccountType(
      account.accountType,
      openingDebit,
      openingCredit
    )

    const accountPeriodLines = [...(periodLinesByAccount.get(account.id) ?? [])].sort(
      comparePeriodLines
    )

    const { transactions, closingBalance } = buildTransactions(
      account.accountType,
      openingBalance,
      accountPeriodLines
    )

    return {
      accountCode: account.code,
      accountName: account.name,
      accountType: account.accountType,
      openingDebit: openingDebit.toString(),
      openingCredit: openingCredit.toString(),
      openingBalance: openingBalance.toString(),
      transactions,
      closingBalance: closingBalance.toString(),
    }
  })

  return {
    filter,
    accounts: ledgerAccounts,
  }
}
