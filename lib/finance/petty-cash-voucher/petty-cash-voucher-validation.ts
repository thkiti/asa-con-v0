import type { PettyCashVoucherStatus, Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import {
  diagnoseJournalLineSides,
  formatJournalLineSidesMessage,
} from "@/lib/finance/journal-line-sides"
import { isPettyCashGlAccount } from "@/lib/finance-ui/pav-pay-from-accounts"
import { PCV_PETTY_CASH_GL_ACCOUNT_CODE } from "@/lib/finance-ui/pcv-petty-cash-account"
import {
  PettyCashVoucherError,
  PettyCashVoucherErrorCodes,
} from "./petty-cash-voucher-errors"
import { isImmutablePettyCashVoucherStatus } from "./petty-cash-voucher-transition-policy"
import type {
  PettyCashVoucherSaveLineInput,
  PettyCashVoucherWithLines,
  ResolvedPettyCashVoucherLine,
} from "./petty-cash-voucher-types"

export function parsePettyCashVoucherDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new PettyCashVoucherError(
      "Invalid entry date",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }
  return date
}

export function assertPettyCashVoucherDraftEditable(
  status: PettyCashVoucherStatus
): void {
  if (isImmutablePettyCashVoucherStatus(status)) {
    throw new PettyCashVoucherError(
      `Petty cash voucher in status ${status} cannot be edited`,
      PettyCashVoucherErrorCodes.IMMUTABLE_ENTRY
    )
  }
  if (status !== "DRAFT") {
    throw new PettyCashVoucherError(
      `Only DRAFT Petty cash vouchers may be saved (status: ${status})`,
      PettyCashVoucherErrorCodes.NOT_DRAFT
    )
  }
}

type GlAccountRow = {
  id: string
  code: string
  name: string
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
      name: true,
      accountType: true,
      isActive: true,
      deleted: true,
    },
  })

  if (!account || account.deleted) {
    throw new PettyCashVoucherError(
      `GL account not found: ${label}`,
      PettyCashVoucherErrorCodes.ACCOUNT_NOT_FOUND
    )
  }

  if (!account.isActive) {
    throw new PettyCashVoucherError(
      `GL account is inactive: ${account.code}`,
      PettyCashVoucherErrorCodes.ACCOUNT_INACTIVE
    )
  }

  return account
}

export async function assertEligiblePettyCashAccount(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  pettyCashAccountId: string
): Promise<void> {
  const account = await loadGlAccountOrThrow(tx, pettyCashAccountId, pettyCashAccountId)
  if (account.accountType !== "ASSET") {
    throw new PettyCashVoucherError(
      `Petty cash account must be an ASSET control account (${account.code})`,
      PettyCashVoucherErrorCodes.INVALID_PETTY_CASH_ACCOUNT
    )
  }
  if (
    account.code !== PCV_PETTY_CASH_GL_ACCOUNT_CODE &&
    !isPettyCashGlAccount(account)
  ) {
    throw new PettyCashVoucherError(
      `Account must be the petty cash control account (${account.code})`,
      PettyCashVoucherErrorCodes.INVALID_PETTY_CASH_ACCOUNT
    )
  }
}

export function assertPettyCashVoucherLineSides(
  debit: Prisma.Decimal,
  credit: Prisma.Decimal,
  lineIndex?: number
): void {
  const issue = diagnoseJournalLineSides(debit, credit)
  if (!issue) return

  const code =
    issue === "NEGATIVE_AMOUNT"
      ? PettyCashVoucherErrorCodes.INVALID_AMOUNT
      : PettyCashVoucherErrorCodes.INVALID_LINE

  throw new PettyCashVoucherError(
    formatJournalLineSidesMessage(issue, lineIndex),
    code
  )
}

export async function resolvePettyCashVoucherAllocationLines(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  rawLines: PettyCashVoucherSaveLineInput[]
): Promise<ResolvedPettyCashVoucherLine[]> {
  const ids = new Set<string>()
  const codes = new Set<string>()

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const debit = toMoney(line.debit ?? 0)
    const credit = toMoney(line.credit ?? 0)

    if (debit.isZero() && credit.isZero()) {
      continue
    }

    assertPettyCashVoucherLineSides(debit, credit, i)

    const glAccountId = String(line.glAccountId ?? "").trim()
    const accountCode = String(line.accountCode ?? "").trim()

    if (!glAccountId && !accountCode) {
      throw new PettyCashVoucherError(
        `Line ${i + 1}: accountCode or glAccountId is required`,
        PettyCashVoucherErrorCodes.INVALID_LINE
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

  const resolved: ResolvedPettyCashVoucherLine[] = []
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
      throw new PettyCashVoucherError(
        `GL account not found: ${label}`,
        PettyCashVoucherErrorCodes.ACCOUNT_NOT_FOUND
      )
    }

    if (!account.isActive) {
      throw new PettyCashVoucherError(
        `GL account is inactive: ${account.code}`,
        PettyCashVoucherErrorCodes.ACCOUNT_INACTIVE
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

export function sumPettyCashVoucherDebitTotal(
  lines: ResolvedPettyCashVoucherLine[]
): Prisma.Decimal {
  return lines.reduce((sum, line) => addMoney(sum, line.debit), ZERO)
}

export function sumPettyCashVoucherCreditTotal(
  lines: ResolvedPettyCashVoucherLine[]
): Prisma.Decimal {
  return lines.reduce((sum, line) => addMoney(sum, line.credit), ZERO)
}

async function assertPettyCashVoucherLinesReady(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: PettyCashVoucherWithLines
): Promise<void> {
  const sortedLines = [...entry.lines].sort((a, b) => a.lineNo - b.lineNo)

  if (sortedLines.length < 2) {
    throw new PettyCashVoucherError(
      "Petty cash voucher requires at least two lines",
      PettyCashVoucherErrorCodes.INSUFFICIENT_LINES
    )
  }

  for (let i = 0; i < sortedLines.length; i++) {
    const line = sortedLines[i]
    assertPettyCashVoucherLineSides(toMoney(line.debit), toMoney(line.credit), i)
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
      throw new PettyCashVoucherError(
        `GL account not found for line glAccountId ${line.glAccountId}`,
        PettyCashVoucherErrorCodes.ACCOUNT_NOT_FOUND
      )
    }
    if (!account.isActive) {
      throw new PettyCashVoucherError(
        `GL account is inactive: ${account.code}`,
        PettyCashVoucherErrorCodes.ACCOUNT_INACTIVE
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
    throw new PettyCashVoucherError(
      `Petty cash voucher is not balanced: debits=${debits.toString()} credits=${credits.toString()}`,
      PettyCashVoucherErrorCodes.UNBALANCED_VOUCHER
    )
  }

  if (debits.isZero()) {
    throw new PettyCashVoucherError(
      "Petty cash voucher total must be greater than zero",
      PettyCashVoucherErrorCodes.INVALID_AMOUNT
    )
  }

  if (entry.pettyCashAccountId) {
    const hasPettyCashLine = sortedLines.some(
      (line) =>
        line.glAccountId === entry.pettyCashAccountId &&
        (!toMoney(line.credit).isZero() || !toMoney(line.debit).isZero())
    )
    if (!hasPettyCashLine) {
      throw new PettyCashVoucherError(
        "Petty cash voucher requires at least one line on the petty cash account",
        PettyCashVoucherErrorCodes.MISSING_CONTROL_ACCOUNT_LINE
      )
    }
  }
}

export async function assertCanSubmitPettyCashVoucher(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: PettyCashVoucherWithLines
): Promise<void> {
  const payeeName = String(entry.payeeName ?? "").trim()
  if (!payeeName) {
    throw new PettyCashVoucherError(
      "payeeName is required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  await assertEligiblePettyCashAccount(tx, entry.pettyCashAccountId)
  await assertPettyCashVoucherLinesReady(tx, entry)
}

export async function assertCanPostPettyCashVoucher(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: PettyCashVoucherWithLines
): Promise<void> {
  await assertCanSubmitPettyCashVoucher(tx, entry)
}
