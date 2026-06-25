import type { InvoiceVoucherStatus, Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import {
  diagnoseJournalLineSides,
  formatJournalLineSidesMessage,
} from "@/lib/finance/journal-line-sides"
import {
  InvoiceVoucherError,
  InvoiceVoucherErrorCodes,
} from "./invoice-voucher-errors"
import { isImmutableInvoiceVoucherStatus } from "./invoice-voucher-transition-policy"
import type {
  InvoiceVoucherSaveLineInput,
  InvoiceVoucherWithLines,
  ResolvedInvoiceVoucherLine,
} from "./invoice-voucher-types"

export function parseInvoiceVoucherDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new InvoiceVoucherError(
      "Invalid invoice date",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }
  return date
}

export function parseInvoiceVoucherDueDate(
  value: Date | string | null | undefined
): Date | null {
  if (value == null || value === "") return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new InvoiceVoucherError(
      "Invalid due date",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }
  return date
}

export function assertInvoiceVoucherDraftEditable(
  status: InvoiceVoucherStatus
): void {
  if (isImmutableInvoiceVoucherStatus(status)) {
    throw new InvoiceVoucherError(
      `Invoice voucher in status ${status} cannot be edited`,
      InvoiceVoucherErrorCodes.IMMUTABLE_ENTRY
    )
  }
  if (status !== "DRAFT") {
    throw new InvoiceVoucherError(
      `Only DRAFT invoice vouchers may be saved (status: ${status})`,
      InvoiceVoucherErrorCodes.NOT_DRAFT
    )
  }
}

export function assertInvoiceVoucherLineSides(
  debit: Prisma.Decimal,
  credit: Prisma.Decimal,
  lineIndex?: number
): void {
  const issue = diagnoseJournalLineSides(debit, credit)
  if (!issue) return

  const code =
    issue === "NEGATIVE_AMOUNT"
      ? InvoiceVoucherErrorCodes.INVALID_AMOUNT
      : InvoiceVoucherErrorCodes.INVALID_LINE

  throw new InvoiceVoucherError(
    formatJournalLineSidesMessage(issue, lineIndex),
    code
  )
}

export async function resolveInvoiceVoucherAllocationLines(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  rawLines: InvoiceVoucherSaveLineInput[]
): Promise<ResolvedInvoiceVoucherLine[]> {
  const ids = new Set<string>()
  const codes = new Set<string>()

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const debit = toMoney(line.debit ?? 0)
    const credit = toMoney(line.credit ?? 0)

    if (debit.isZero() && credit.isZero()) {
      continue
    }

    assertInvoiceVoucherLineSides(debit, credit, i)

    const glAccountId = String(line.glAccountId ?? "").trim()
    const accountCode = String(line.accountCode ?? "").trim()

    if (!glAccountId && !accountCode) {
      throw new InvoiceVoucherError(
        `Line ${i + 1}: accountCode or glAccountId is required`,
        InvoiceVoucherErrorCodes.INVALID_LINE
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

  const resolved: ResolvedInvoiceVoucherLine[] = []
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
      throw new InvoiceVoucherError(
        `GL account not found: ${label}`,
        InvoiceVoucherErrorCodes.ACCOUNT_NOT_FOUND
      )
    }

    if (!account.isActive) {
      throw new InvoiceVoucherError(
        `GL account is inactive: ${account.code}`,
        InvoiceVoucherErrorCodes.ACCOUNT_INACTIVE
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

export function sumInvoiceVoucherDebitTotal(
  lines: ResolvedInvoiceVoucherLine[]
): Prisma.Decimal {
  return lines.reduce((sum, line) => addMoney(sum, line.debit), ZERO)
}

export function sumInvoiceVoucherCreditTotal(
  lines: ResolvedInvoiceVoucherLine[]
): Prisma.Decimal {
  return lines.reduce((sum, line) => addMoney(sum, line.credit), ZERO)
}

async function assertInvoiceVoucherLinesReady(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: InvoiceVoucherWithLines
): Promise<void> {
  const sortedLines = [...entry.lines].sort((a, b) => a.lineNo - b.lineNo)

  if (sortedLines.length < 2) {
    throw new InvoiceVoucherError(
      "Invoice voucher requires at least two lines",
      InvoiceVoucherErrorCodes.INSUFFICIENT_LINES
    )
  }

  for (let i = 0; i < sortedLines.length; i++) {
    const line = sortedLines[i]
    assertInvoiceVoucherLineSides(toMoney(line.debit), toMoney(line.credit), i)
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
      throw new InvoiceVoucherError(
        `GL account not found for line glAccountId ${line.glAccountId}`,
        InvoiceVoucherErrorCodes.ACCOUNT_NOT_FOUND
      )
    }
    if (!account.isActive) {
      throw new InvoiceVoucherError(
        `GL account is inactive: ${account.code}`,
        InvoiceVoucherErrorCodes.ACCOUNT_INACTIVE
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
    throw new InvoiceVoucherError(
      `Invoice voucher is not balanced: debits=${debits.toString()} credits=${credits.toString()}`,
      InvoiceVoucherErrorCodes.UNBALANCED_VOUCHER
    )
  }

  if (debits.isZero()) {
    throw new InvoiceVoucherError(
      "Invoice voucher total must be greater than zero",
      InvoiceVoucherErrorCodes.INVALID_AMOUNT
    )
  }
}

export async function assertCanSubmitInvoiceVoucher(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: InvoiceVoucherWithLines
): Promise<void> {
  const customerName = String(entry.customerName ?? "").trim()
  if (!customerName) {
    throw new InvoiceVoucherError(
      "customerName is required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }

  await assertInvoiceVoucherLinesReady(tx, entry)
}

export async function assertCanPostInvoiceVoucher(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: InvoiceVoucherWithLines
): Promise<void> {
  await assertCanSubmitInvoiceVoucher(tx, entry)
}
