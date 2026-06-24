import type { RevenueVoucherStatus, Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import {
  diagnoseJournalLineSides,
  formatJournalLineSidesMessage,
} from "@/lib/finance/journal-line-sides"
import {
  RevenueVoucherError,
  RevenueVoucherErrorCodes,
} from "./revenue-voucher-errors"
import { isImmutableRevenueVoucherStatus } from "./revenue-voucher-transition-policy"
import type {
  RevenueVoucherSaveLineInput,
  RevenueVoucherWithLines,
  ResolvedRevenueVoucherLine,
} from "./revenue-voucher-types"

export function parseRevenueVoucherDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new RevenueVoucherError(
      "Invalid entry date",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }
  return date
}

export function assertRevenueVoucherDraftEditable(
  status: RevenueVoucherStatus
): void {
  if (isImmutableRevenueVoucherStatus(status)) {
    throw new RevenueVoucherError(
      `Revenue voucher in status ${status} cannot be edited`,
      RevenueVoucherErrorCodes.IMMUTABLE_ENTRY
    )
  }
  if (status !== "DRAFT") {
    throw new RevenueVoucherError(
      `Only DRAFT revenue vouchers may be saved (status: ${status})`,
      RevenueVoucherErrorCodes.NOT_DRAFT
    )
  }
}

type GlAccountRow = {
  id: string
  code: string
  accountType: string
  isActive: boolean
  deleted: boolean
}

async function loadGlAccountOrThrow(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  glAccountId: string,
  label: string
): Promise<GlAccountRow> {
  const account = await tx.glAccount.findUnique({
    where: { id: glAccountId },
    select: {
      id: true,
      code: true,
      accountType: true,
      isActive: true,
      deleted: true,
    },
  })

  if (!account || account.deleted) {
    throw new RevenueVoucherError(
      `GL account not found: ${label}`,
      RevenueVoucherErrorCodes.ACCOUNT_NOT_FOUND
    )
  }

  if (!account.isActive) {
    throw new RevenueVoucherError(
      `GL account is inactive: ${account.code}`,
      RevenueVoucherErrorCodes.ACCOUNT_INACTIVE
    )
  }

  return account
}

export async function assertEligibleReceiveToAccount(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  receiveToAccountId: string
): Promise<void> {
  const account = await loadGlAccountOrThrow(tx, receiveToAccountId, receiveToAccountId)
  if (account.accountType !== "ASSET") {
    throw new RevenueVoucherError(
      `Receive-to account must be an ASSET control account (${account.code})`,
      RevenueVoucherErrorCodes.INVALID_RECEIVE_TO_ACCOUNT
    )
  }
}

export function assertRevenueVoucherLineSides(
  debit: Prisma.Decimal,
  credit: Prisma.Decimal,
  lineIndex?: number
): void {
  const issue = diagnoseJournalLineSides(debit, credit)
  if (!issue) return

  const code =
    issue === "NEGATIVE_AMOUNT"
      ? RevenueVoucherErrorCodes.INVALID_AMOUNT
      : RevenueVoucherErrorCodes.INVALID_LINE

  throw new RevenueVoucherError(
    formatJournalLineSidesMessage(issue, lineIndex),
    code
  )
}

export async function resolveRevenueVoucherAllocationLines(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  rawLines: RevenueVoucherSaveLineInput[]
): Promise<ResolvedRevenueVoucherLine[]> {
  const ids = new Set<string>()
  const codes = new Set<string>()

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const debit = toMoney(line.debit ?? 0)
    const credit = toMoney(line.credit ?? 0)

    if (debit.isZero() && credit.isZero()) {
      continue
    }

    assertRevenueVoucherLineSides(debit, credit, i)

    const glAccountId = String(line.glAccountId ?? "").trim()
    const accountCode = String(line.accountCode ?? "").trim()

    if (!glAccountId && !accountCode) {
      throw new RevenueVoucherError(
        `Line ${i + 1}: accountCode or glAccountId is required`,
        RevenueVoucherErrorCodes.INVALID_LINE
      )
    }

    if (glAccountId) ids.add(glAccountId)
    if (accountCode) codes.add(accountCode)
  }

  const accounts = await tx.glAccount.findMany({
    where: {
      OR: [
        ...(ids.size > 0 ? [{ id: { in: [...ids] } }] : []),
        ...(codes.size > 0 ? [{ code: { in: [...codes] } }] : []),
      ],
    },
    select: { id: true, code: true, isActive: true, deleted: true },
  })

  const byId = new Map(accounts.map((account) => [account.id, account]))
  const byCode = new Map(accounts.map((account) => [account.code, account]))

  const resolved: ResolvedRevenueVoucherLine[] = []
  let lineNo = 0

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]
    const debit = toMoney(raw.debit ?? 0)
    const credit = toMoney(raw.credit ?? 0)
    if (debit.isZero() && credit.isZero()) continue

    const glAccountId = String(raw.glAccountId ?? "").trim()
    const accountCode = String(raw.accountCode ?? "").trim()

    let account: (typeof accounts)[number] | undefined
    if (glAccountId) {
      account = byId.get(glAccountId)
    } else {
      account = byCode.get(accountCode)
    }

    if (!account || account.deleted) {
      const label = glAccountId || accountCode
      throw new RevenueVoucherError(
        `GL account not found: ${label}`,
        RevenueVoucherErrorCodes.ACCOUNT_NOT_FOUND
      )
    }

    if (!account.isActive) {
      throw new RevenueVoucherError(
        `GL account is inactive: ${account.code}`,
        RevenueVoucherErrorCodes.ACCOUNT_INACTIVE
      )
    }

    lineNo += 1
    resolved.push({
      lineNo,
      glAccountId: account.id,
      debit,
      credit,
      memo: raw.memo?.trim() || null,
    })
  }

  return resolved
}

export function sumRevenueVoucherDebitTotal(
  lines: ResolvedRevenueVoucherLine[]
): Prisma.Decimal {
  return lines.reduce((sum, line) => addMoney(sum, line.debit), ZERO)
}

export function sumRevenueVoucherCreditTotal(
  lines: ResolvedRevenueVoucherLine[]
): Prisma.Decimal {
  return lines.reduce((sum, line) => addMoney(sum, line.credit), ZERO)
}

async function assertRevenueVoucherLinesReady(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: RevenueVoucherWithLines
): Promise<void> {
  const sortedLines = [...entry.lines].sort((a, b) => a.lineNo - b.lineNo)

  if (sortedLines.length < 2) {
    throw new RevenueVoucherError(
      "Revenue voucher requires at least two lines",
      RevenueVoucherErrorCodes.INSUFFICIENT_LINES
    )
  }

  for (let i = 0; i < sortedLines.length; i++) {
    const line = sortedLines[i]
    assertRevenueVoucherLineSides(toMoney(line.debit), toMoney(line.credit), i)
  }

  const accountIds = [...new Set(sortedLines.map((line) => line.glAccountId))]
  const accounts = await tx.glAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, isActive: true, deleted: true },
  })
  const byId = new Map(accounts.map((account) => [account.id, account]))

  for (const line of sortedLines) {
    const account = byId.get(line.glAccountId)
    if (!account || account.deleted) {
      throw new RevenueVoucherError(
        `GL account not found for line glAccountId ${line.glAccountId}`,
        RevenueVoucherErrorCodes.ACCOUNT_NOT_FOUND
      )
    }
    if (!account.isActive) {
      throw new RevenueVoucherError(
        `GL account is inactive: ${account.code}`,
        RevenueVoucherErrorCodes.ACCOUNT_INACTIVE
      )
    }
  }

  let debits = ZERO
  let credits = ZERO
  for (const line of sortedLines) {
    debits = addMoney(debits, toMoney(line.debit))
    credits = addMoney(credits, toMoney(line.credit))
  }

  if (!debits.equals(credits)) {
    throw new RevenueVoucherError(
      `Revenue voucher is not balanced: debits=${debits.toString()} credits=${credits.toString()}`,
      RevenueVoucherErrorCodes.UNBALANCED_VOUCHER
    )
  }

  if (debits.isZero()) {
    throw new RevenueVoucherError(
      "Revenue voucher total must be greater than zero",
      RevenueVoucherErrorCodes.INVALID_AMOUNT
    )
  }

  if (entry.receiveToAccountId) {
    const hasReceiveToDebit = sortedLines.some(
      (line) =>
        line.glAccountId === entry.receiveToAccountId &&
        !toMoney(line.debit).isZero()
    )
    if (!hasReceiveToDebit) {
      throw new RevenueVoucherError(
        "Revenue voucher requires at least one debit line on the receive-to account",
        RevenueVoucherErrorCodes.MISSING_CONTROL_ACCOUNT_LINE
      )
    }
  }
}

export async function assertCanSubmitRevenueVoucher(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: RevenueVoucherWithLines
): Promise<void> {
  const receivedFromName = String(entry.receivedFromName ?? "").trim()
  if (!receivedFromName) {
    throw new RevenueVoucherError(
      "receivedFromName is required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }

  await assertEligibleReceiveToAccount(tx, entry.receiveToAccountId)
  await assertRevenueVoucherLinesReady(tx, entry)
}

export async function assertCanPostRevenueVoucher(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: RevenueVoucherWithLines
): Promise<void> {
  await assertCanSubmitRevenueVoucher(tx, entry)
}
