import type { PaymentVoucherStatus, Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import {
  diagnoseJournalLineSides,
  formatJournalLineSidesMessage,
} from "@/lib/finance/journal-line-sides"
import {
  PaymentVoucherError,
  PaymentVoucherErrorCodes,
} from "./payment-voucher-errors"
import { isImmutablePaymentVoucherStatus } from "./payment-voucher-transition-policy"
import type {
  PaymentVoucherSaveLineInput,
  PaymentVoucherWithLines,
  ResolvedPaymentVoucherLine,
} from "./payment-voucher-types"

export function parsePaymentVoucherDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new PaymentVoucherError(
      "Invalid entry date",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }
  return date
}

export function assertPaymentVoucherDraftEditable(
  status: PaymentVoucherStatus
): void {
  if (isImmutablePaymentVoucherStatus(status)) {
    throw new PaymentVoucherError(
      `Payment voucher in status ${status} cannot be edited`,
      PaymentVoucherErrorCodes.IMMUTABLE_ENTRY
    )
  }
  if (status !== "DRAFT") {
    throw new PaymentVoucherError(
      `Only DRAFT payment vouchers may be saved (status: ${status})`,
      PaymentVoucherErrorCodes.NOT_DRAFT
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
    throw new PaymentVoucherError(
      `GL account not found: ${label}`,
      PaymentVoucherErrorCodes.ACCOUNT_NOT_FOUND
    )
  }

  if (!account.isActive) {
    throw new PaymentVoucherError(
      `GL account is inactive: ${account.code}`,
      PaymentVoucherErrorCodes.ACCOUNT_INACTIVE
    )
  }

  return account
}

export async function assertEligiblePayFromAccount(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  payFromAccountId: string
): Promise<void> {
  const account = await loadGlAccountOrThrow(tx, payFromAccountId, payFromAccountId)
  if (account.accountType !== "ASSET") {
    throw new PaymentVoucherError(
      `Pay-from account must be an ASSET control account (${account.code})`,
      PaymentVoucherErrorCodes.INVALID_PAY_FROM_ACCOUNT
    )
  }
}

export function assertPaymentVoucherLineSides(
  debit: Prisma.Decimal,
  credit: Prisma.Decimal,
  lineIndex?: number
): void {
  const issue = diagnoseJournalLineSides(debit, credit)
  if (!issue) return

  const code =
    issue === "NEGATIVE_AMOUNT"
      ? PaymentVoucherErrorCodes.INVALID_AMOUNT
      : PaymentVoucherErrorCodes.INVALID_LINE

  throw new PaymentVoucherError(
    formatJournalLineSidesMessage(issue, lineIndex),
    code
  )
}

export async function resolvePaymentVoucherAllocationLines(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  rawLines: PaymentVoucherSaveLineInput[]
): Promise<ResolvedPaymentVoucherLine[]> {
  const ids = new Set<string>()
  const codes = new Set<string>()

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const debit = toMoney(line.debit ?? 0)
    const credit = toMoney(line.credit ?? 0)

    if (debit.isZero() && credit.isZero()) {
      continue
    }

    assertPaymentVoucherLineSides(debit, credit, i)

    const glAccountId = String(line.glAccountId ?? "").trim()
    const accountCode = String(line.accountCode ?? "").trim()

    if (!glAccountId && !accountCode) {
      throw new PaymentVoucherError(
        `Line ${i + 1}: accountCode or glAccountId is required`,
        PaymentVoucherErrorCodes.INVALID_LINE
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

  const resolved: ResolvedPaymentVoucherLine[] = []
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
      throw new PaymentVoucherError(
        `GL account not found: ${label}`,
        PaymentVoucherErrorCodes.ACCOUNT_NOT_FOUND
      )
    }

    if (!account.isActive) {
      throw new PaymentVoucherError(
        `GL account is inactive: ${account.code}`,
        PaymentVoucherErrorCodes.ACCOUNT_INACTIVE
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

export function sumPaymentVoucherDebitTotal(
  lines: ResolvedPaymentVoucherLine[]
): Prisma.Decimal {
  return lines.reduce((sum, line) => addMoney(sum, line.debit), ZERO)
}

export function sumPaymentVoucherCreditTotal(
  lines: ResolvedPaymentVoucherLine[]
): Prisma.Decimal {
  return lines.reduce((sum, line) => addMoney(sum, line.credit), ZERO)
}

async function assertPaymentVoucherLinesReady(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: PaymentVoucherWithLines
): Promise<void> {
  const sortedLines = [...entry.lines].sort((a, b) => a.lineNo - b.lineNo)

  if (sortedLines.length < 2) {
    throw new PaymentVoucherError(
      "Payment voucher requires at least two lines",
      PaymentVoucherErrorCodes.INSUFFICIENT_LINES
    )
  }

  for (let i = 0; i < sortedLines.length; i++) {
    const line = sortedLines[i]
    assertPaymentVoucherLineSides(toMoney(line.debit), toMoney(line.credit), i)
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
      throw new PaymentVoucherError(
        `GL account not found for line glAccountId ${line.glAccountId}`,
        PaymentVoucherErrorCodes.ACCOUNT_NOT_FOUND
      )
    }
    if (!account.isActive) {
      throw new PaymentVoucherError(
        `GL account is inactive: ${account.code}`,
        PaymentVoucherErrorCodes.ACCOUNT_INACTIVE
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
    throw new PaymentVoucherError(
      `Payment voucher is not balanced: debits=${debits.toString()} credits=${credits.toString()}`,
      PaymentVoucherErrorCodes.UNBALANCED_VOUCHER
    )
  }

  if (debits.isZero()) {
    throw new PaymentVoucherError(
      "Payment voucher total must be greater than zero",
      PaymentVoucherErrorCodes.INVALID_AMOUNT
    )
  }

  if (entry.payFromAccountId) {
    const hasPayFromCredit = sortedLines.some(
      (line) =>
        line.glAccountId === entry.payFromAccountId &&
        !toMoney(line.credit).isZero()
    )
    if (!hasPayFromCredit) {
      throw new PaymentVoucherError(
        "Payment voucher requires at least one credit line on the pay-from account",
        PaymentVoucherErrorCodes.MISSING_CONTROL_ACCOUNT_LINE
      )
    }
  }
}

export async function assertCanSubmitPaymentVoucher(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: PaymentVoucherWithLines
): Promise<void> {
  const payeeName = String(entry.payeeName ?? "").trim()
  if (!payeeName) {
    throw new PaymentVoucherError(
      "payeeName is required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }

  await assertEligiblePayFromAccount(tx, entry.payFromAccountId)
  await assertPaymentVoucherLinesReady(tx, entry)
}

export async function assertCanPostPaymentVoucher(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: PaymentVoucherWithLines
): Promise<void> {
  await assertCanSubmitPaymentVoucher(tx, entry)
}
