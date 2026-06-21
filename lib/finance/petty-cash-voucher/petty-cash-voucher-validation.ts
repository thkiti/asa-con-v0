import type { PettyCashVoucherStatus, Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
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

export async function resolvePettyCashVoucherAllocationLines(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  rawLines: PettyCashVoucherSaveLineInput[]
): Promise<ResolvedPettyCashVoucherLine[]> {
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
      throw new PettyCashVoucherError(
        `Line ${i + 1}: debit must not be negative`,
        PettyCashVoucherErrorCodes.INVALID_AMOUNT
      )
    }

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
      credit: ZERO,
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

  const positiveLines = entry.lines.filter((line) => !toMoney(line.debit).isZero())
  if (positiveLines.length === 0) {
    throw new PettyCashVoucherError(
      "Petty cash voucher requires at least one debit allocation line",
      PettyCashVoucherErrorCodes.EMPTY_ALLOCATION
    )
  }

  const total = positiveLines.reduce(
    (sum, line) => addMoney(sum, toMoney(line.debit)),
    ZERO
  )

  if (total.isZero()) {
    throw new PettyCashVoucherError(
      "Petty cash voucher total must be greater than zero",
      PettyCashVoucherErrorCodes.INVALID_AMOUNT
    )
  }
}

export async function assertCanPostPettyCashVoucher(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: PettyCashVoucherWithLines
): Promise<void> {
  await assertCanSubmitPettyCashVoucher(tx, entry)
}
