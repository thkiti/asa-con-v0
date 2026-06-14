import type { ManualJournalEntryStatus, Prisma } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import { isImmutableStatus } from "./manual-journal-entry-transition-policy"
import type {
  ManualJournalEntryWithLines,
  ManualJournalSaveLineInput,
  ResolvedManualJournalLine,
} from "./manual-journal-entry-types"

export function parseManualJournalEntryDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new ManualJournalEntryError(
      "Invalid entry date",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
  return date
}

export function assertDraftEditable(status: ManualJournalEntryStatus): void {
  if (isImmutableStatus(status)) {
    throw new ManualJournalEntryError(
      `Manual journal entry in status ${status} cannot be edited`,
      ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY
    )
  }
  if (status !== "DRAFT") {
    throw new ManualJournalEntryError(
      `Only DRAFT entries may be saved (status: ${status})`,
      ManualJournalEntryErrorCodes.NOT_DRAFT
    )
  }
}

export function assertManualJournalLineSides(
  debit: Prisma.Decimal,
  credit: Prisma.Decimal,
  lineIndex?: number
): void {
  const prefix =
    lineIndex === undefined ? "" : `Line ${lineIndex + 1}: `

  if (debit.isNegative() || credit.isNegative()) {
    throw new ManualJournalEntryError(
      `${prefix}debit and credit must not be negative`,
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const debitZero = debit.isZero()
  const creditZero = credit.isZero()

  if (debitZero && creditZero) {
    throw new ManualJournalEntryError(
      `${prefix}line must have exactly one non-zero side`,
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  if (!debitZero && !creditZero) {
    throw new ManualJournalEntryError(
      `${prefix}line cannot have both debit and credit`,
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
}

type GlAccountRow = {
  id: string
  code: string
  isActive: boolean
  deleted: boolean
}

export async function resolveManualJournalEntryLines(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  rawLines: ManualJournalSaveLineInput[]
): Promise<ResolvedManualJournalLine[]> {
  const ids = new Set<string>()
  const codes = new Set<string>()

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const glAccountId = String(line.glAccountId ?? "").trim()
    const accountCode = String(line.accountCode ?? "").trim()

    if (!glAccountId && !accountCode) {
      throw new ManualJournalEntryError(
        `Line ${i + 1}: accountCode or glAccountId is required`,
        ManualJournalEntryErrorCodes.INVALID_LINE
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

  const resolved: ResolvedManualJournalLine[] = []

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]
    const debit = toMoney(raw.debit)
    const credit = toMoney(raw.credit)
    assertManualJournalLineSides(debit, credit, i)

    const glAccountId = String(raw.glAccountId ?? "").trim()
    const accountCode = String(raw.accountCode ?? "").trim()

    let account: GlAccountRow | undefined
    if (glAccountId) {
      account = byId.get(glAccountId)
    } else {
      account = byCode.get(accountCode)
    }

    if (!account || account.deleted) {
      const label = glAccountId || accountCode
      throw new ManualJournalEntryError(
        `GL account not found: ${label}`,
        ManualJournalEntryErrorCodes.ACCOUNT_NOT_FOUND
      )
    }

    if (accountCode && account.code !== accountCode) {
      throw new ManualJournalEntryError(
        `GL account not found for code ${accountCode}`,
        ManualJournalEntryErrorCodes.ACCOUNT_NOT_FOUND
      )
    }

    if (!account.isActive) {
      throw new ManualJournalEntryError(
        `GL account is inactive: ${account.code}`,
        ManualJournalEntryErrorCodes.ACCOUNT_INACTIVE
      )
    }

    resolved.push({
      lineNo: i + 1,
      glAccountId: account.id,
      debit,
      credit,
      memo: raw.memo ?? null,
    })
  }

  return resolved
}

async function assertManualJournalEntryLinesReady(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: ManualJournalEntryWithLines
): Promise<void> {
  const sortedLines = [...entry.lines].sort((a, b) => a.lineNo - b.lineNo)

  if (sortedLines.length < 2) {
    throw new ManualJournalEntryError(
      "Manual journal entry requires at least two lines",
      ManualJournalEntryErrorCodes.INSUFFICIENT_LINES
    )
  }

  for (let i = 0; i < sortedLines.length; i++) {
    const line = sortedLines[i]
    assertManualJournalLineSides(toMoney(line.debit), toMoney(line.credit), i)
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
      throw new ManualJournalEntryError(
        `GL account not found for line glAccountId ${line.glAccountId}`,
        ManualJournalEntryErrorCodes.ACCOUNT_NOT_FOUND
      )
    }
    if (!account.isActive) {
      throw new ManualJournalEntryError(
        `GL account is inactive: ${account.code}`,
        ManualJournalEntryErrorCodes.ACCOUNT_INACTIVE
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
    throw new ManualJournalEntryError(
      `Manual journal entry is not balanced: debits=${debits.toString()} credits=${credits.toString()}`,
      ManualJournalEntryErrorCodes.UNBALANCED_ENTRY
    )
  }
}

/**
 * Submit-time validation on persisted lines — requires DRAFT, ≥2 lines, balanced totals,
 * valid line sides, and active GL accounts.
 */
export async function assertCanSubmitManualJournalEntry(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: ManualJournalEntryWithLines
): Promise<void> {
  if (entry.status !== "DRAFT") {
    throw new ManualJournalEntryError(
      `Only DRAFT entries may be submitted (status: ${entry.status})`,
      ManualJournalEntryErrorCodes.INVALID_TRANSITION
    )
  }

  await assertManualJournalEntryLinesReady(tx, entry)
}

/**
 * Post-time validation — requires CONFIRMED and submit-level line checks.
 */
export async function assertCanPostManualJournalEntry(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: ManualJournalEntryWithLines
): Promise<void> {
  if (entry.status !== "CONFIRMED") {
    throw new ManualJournalEntryError(
      `Only CONFIRMED entries may be posted (status: ${entry.status})`,
      ManualJournalEntryErrorCodes.INVALID_TRANSITION
    )
  }

  await assertManualJournalEntryLinesReady(tx, entry)
}
