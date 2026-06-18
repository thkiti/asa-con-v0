import type { Prisma } from "@/generated/prisma/client"
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
import { buildManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot"
import type { ManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot-types"
import { applyPostedStatus } from "./manual-journal-entry-status"
import type {
  ManualJournalEntryWithLines,
  PostManualJournalEntryInput,
} from "./manual-journal-entry-types"
import { assertCanPostManualJournalEntry } from "./manual-journal-entry-validation"

const ENTRY_TYPE_FINANCE_REF_TYPE: Record<
  import("@/generated/prisma/client").ManualJournalEntryType,
  FinanceRefType
> = {
  MANUAL: FINANCE_REF_TYPES.MANUAL_JOURNAL,
  OPENING_BALANCE: FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
  ADJUSTMENT: FINANCE_REF_TYPES.ADJUSTMENT_JOURNAL,
  RECLASS: FINANCE_REF_TYPES.RECLASS_JOURNAL,
  ACCRUAL: FINANCE_REF_TYPES.ACCRUAL_JOURNAL,
  AUDITOR_ADJUSTMENT: FINANCE_REF_TYPES.AUDITOR_ADJUSTMENT_JOURNAL,
}

export function financeRefTypeForManualJournalEntryType(
  entryType: import("@/generated/prisma/client").ManualJournalEntryType
): FinanceRefType {
  return ENTRY_TYPE_FINANCE_REF_TYPE[entryType]
}

export type PostManualJournalEntryResult = {
  entry: ManualJournalEntryWithLines
  /** Frozen POST-time snapshot for PDF attach; null when pdf already exists. */
  pdfSnapshot: ManualJournalEntryPdfSnapshot | null
}

type EntryWithGlLines = ManualJournalEntryWithLines & {
  lines: Array<
    ManualJournalEntryWithLines["lines"][number] & {
      glAccount: { code: string; name: string }
    }
  >
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

async function loadEntryWithGlAccountsOrThrow(
  tx: Prisma.TransactionClient,
  entryId: string
): Promise<EntryWithGlLines> {
  const entry = await tx.manualJournalEntry.findUnique({
    where: { id: entryId },
    include: {
      lines: {
        orderBy: { lineNo: "asc" },
        include: {
          glAccount: { select: { code: true, name: true } },
        },
      },
    },
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

function buildPdfSnapshotForPostedEntry(
  entry: EntryWithGlLines,
  posted: {
    voucherId: string
    voucherNo: string
    journalEntryId: string
  },
  postedAt: Date,
  postedByStaffId: string
): ManualJournalEntryPdfSnapshot {
  return buildManualJournalEntryPdfSnapshot(
    {
      id: entry.id,
      entryNo: entry.entryNo,
      entryType: entry.entryType,
      branchId: entry.branchId,
      legalEntityCode: entry.legalEntityCode,
      entryDate: entry.entryDate,
      description: entry.description,
      refNo: entry.refNo,
      postedAt,
      postedByStaffId,
      lines: entry.lines,
    },
    posted
  )
}

/**
 * CONFIRMED → POSTED via finance posting kernel. Links voucher and journal on the entry.
 */
export async function postManualJournalEntry(
  input: PostManualJournalEntryInput
): Promise<PostManualJournalEntryResult> {
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

  const run = async (tx: Prisma.TransactionClient): Promise<PostManualJournalEntryResult> => {
    const entry = await loadEntryWithGlAccountsOrThrow(tx, entryId)

    if (
      entry.status === "POSTED" &&
      entry.postedVoucherId &&
      entry.postedJournalEntryId
    ) {
      if (entry.pdfPath) {
        return { entry, pdfSnapshot: null }
      }

      const voucher = await tx.voucher.findUnique({
        where: { id: entry.postedVoucherId },
        select: { id: true, voucherNo: true },
      })
      if (!voucher || !entry.postedAt) {
        throw new ManualJournalEntryError(
          "Posted manual journal entry is missing voucher metadata",
          ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
          404
        )
      }

      return {
        entry,
        pdfSnapshot: buildPdfSnapshotForPostedEntry(
          entry,
          {
            voucherId: voucher.id,
            voucherNo: voucher.voucherNo,
            journalEntryId: entry.postedJournalEntryId,
          },
          entry.postedAt,
          entry.postedByStaffId ?? postedByStaffId
        ),
      }
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

    const postedEntry = await applyPostedStatus(tx, {
      entryId,
      postedByStaffId,
      postedVoucherId: posted.voucherId,
      postedJournalEntryId: posted.journalEntryId,
    })

    const postedAt = postedEntry.postedAt ?? new Date()
    const snapshot = buildPdfSnapshotForPostedEntry(
      entry,
      posted,
      postedAt,
      postedByStaffId
    )

    return { entry: postedEntry, pdfSnapshot: snapshot }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
