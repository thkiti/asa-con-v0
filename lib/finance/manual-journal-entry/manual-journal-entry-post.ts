import type { ManualJournalEntryType, Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { toMoney } from "@/lib/finance/decimal"
import { assertPostingPeriodOpen } from "@/lib/finance/posting-period"
import { postOperationalVoucher } from "@/lib/finance/posting"
import {
  FINANCE_REF_TYPES,
  type FinanceRefType,
  type JournalLineDraft,
} from "@/lib/finance/posting-types"
import { prisma } from "@/lib/shared/prisma"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import { applyPostedStatus } from "./manual-journal-entry-status"
import type {
  ManualJournalEntryWithLines,
  PostManualJournalEntryInput,
} from "./manual-journal-entry-types"
import { assertCanPostManualJournalEntry } from "./manual-journal-entry-validation"

const ENTRY_TYPE_FINANCE_REF_TYPE: Record<ManualJournalEntryType, FinanceRefType> = {
  MANUAL: FINANCE_REF_TYPES.MANUAL_JOURNAL,
  OPENING_BALANCE: FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
  ADJUSTMENT: FINANCE_REF_TYPES.ADJUSTMENT_JOURNAL,
  RECLASS: FINANCE_REF_TYPES.RECLASS_JOURNAL,
  ACCRUAL: FINANCE_REF_TYPES.ACCRUAL_JOURNAL,
  AUDITOR_ADJUSTMENT: FINANCE_REF_TYPES.AUDITOR_ADJUSTMENT_JOURNAL,
}

export function financeRefTypeForManualJournalEntryType(
  entryType: ManualJournalEntryType
): FinanceRefType {
  return ENTRY_TYPE_FINANCE_REF_TYPE[entryType]
}

function journalLinesFromEntry(entry: ManualJournalEntryWithLines): JournalLineDraft[] {
  return [...entry.lines]
    .sort((a, b) => a.lineNo - b.lineNo)
    .map((line) => ({
      glAccountId: line.glAccountId,
      debit: toMoney(line.debit),
      credit: toMoney(line.credit),
      memo: line.memo ?? undefined,
    }))
}

async function loadEntryOrThrow(
  tx: Prisma.TransactionClient,
  entryId: string
): Promise<ManualJournalEntryWithLines> {
  const entry = await tx.manualJournalEntry.findUnique({
    where: { id: entryId },
    include: { lines: { orderBy: { lineNo: "asc" } } },
  })

  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return entry
}

/**
 * CONFIRMED → POSTED via finance posting kernel. Links voucher and journal on the entry.
 */
export async function postManualJournalEntry(
  input: PostManualJournalEntryInput
): Promise<ManualJournalEntryWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const postedByStaffId = String(input.postedByStaffId ?? "").trim()

  if (!entryId) {
    throw new ManualJournalEntryError(
      "entryId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }
  if (!postedByStaffId) {
    throw new ManualJournalEntryError(
      "postedByStaffId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<ManualJournalEntryWithLines> => {
    const entry = await loadEntryOrThrow(tx, entryId)

    if (
      entry.status === "POSTED" &&
      entry.postedVoucherId &&
      entry.postedJournalEntryId
    ) {
      return entry
    }

    await assertCanPostManualJournalEntry(tx, entry)
    await assertPostingPeriodOpen(
      tx,
      entry.branchId,
      entry.entryDate,
      entry.legalEntityCode as DocumentEntityCode
    )

    const posted = await postOperationalVoucher({
      tx,
      branchId: entry.branchId,
      date: entry.entryDate,
      legalEntityCode: entry.legalEntityCode as DocumentEntityCode,
      refType: financeRefTypeForManualJournalEntryType(entry.entryType),
      refId: entry.id,
      refNo: entry.entryNo,
      description: entry.description,
      lines: journalLinesFromEntry(entry),
    })

    return applyPostedStatus(tx, {
      entryId,
      postedByStaffId,
      postedVoucherId: posted.voucherId,
      postedJournalEntryId: posted.journalEntryId,
    })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
