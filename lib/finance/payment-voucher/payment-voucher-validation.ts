import type { PaymentVoucherStatus, Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
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

export async function resolvePaymentVoucherAllocationLines(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  rawLines: PaymentVoucherSaveLineInput[]
): Promise<ResolvedPaymentVoucherLine[]> {
  const ids = new Set<string>()
  const codes = new Set<string>()

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const glAccountId = String(line.glAccountId ?? "").trim()
    const accountCode = String(line.accountCode ?? "").trim()
    const debit = toMoney(line.debit)

    if (debit.isZero()) {
      continue
    }

    if (debit.isNegative()) {
      throw new PaymentVoucherError(
        `Line ${i + 1}: debit must not be negative`,
        PaymentVoucherErrorCodes.INVALID_AMOUNT
      )
    }

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
    const debit = toMoney(raw.debit)
    if (debit.isZero()) continue

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
      credit: ZERO,
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

  const positiveLines = entry.lines.filter((line) => !toMoney(line.debit).isZero())
  if (positiveLines.length === 0) {
    throw new PaymentVoucherError(
      "Payment voucher requires at least one debit allocation line",
      PaymentVoucherErrorCodes.EMPTY_ALLOCATION
    )
  }

  const total = positiveLines.reduce(
    (sum, line) => addMoney(sum, toMoney(line.debit)),
    ZERO
  )

  if (total.isZero()) {
    throw new PaymentVoucherError(
      "Payment voucher total must be greater than zero",
      PaymentVoucherErrorCodes.INVALID_AMOUNT
    )
  }
}

export async function assertCanPostPaymentVoucher(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: PaymentVoucherWithLines
): Promise<void> {
  await assertCanSubmitPaymentVoucher(tx, entry)
}
