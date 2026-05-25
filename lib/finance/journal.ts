import type { Prisma } from "@/generated/prisma/client"
import { FinancePostingError } from "./posting-errors"
import { toMoney } from "./decimal"
import type { JournalLineDraft } from "./posting-types"

export type CreateJournalForVoucherInput = {
  voucherId: string
  date: Date
  branchId: string
  periodId: string
  lines: JournalLineDraft[]
}

/** Posted journals are immutable — no update helpers are exported. */
export const POSTED_JOURNAL_IMMUTABLE = true

/** VoucherLine = staging/trace on the voucher; JournalEntryLine = immutable GL layer. */

export function assertPostedJournalImmutable(): void {
  if (!POSTED_JOURNAL_IMMUTABLE) {
    throw new FinancePostingError(
      "Posted journal entries cannot be modified",
      "JOURNAL_IMMUTABLE"
    )
  }
}

type VoucherLineSnapshot = {
  lineNo: number
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo: string | null
}

export function assertVoucherJournalLineParity(
  voucherLines: VoucherLineSnapshot[],
  journalDrafts: JournalLineDraft[]
): void {
  const sortedVoucher = [...voucherLines].sort((a, b) => a.lineNo - b.lineNo)
  if (sortedVoucher.length !== journalDrafts.length) {
    throw new FinancePostingError(
      "Voucher lines and journal drafts line count mismatch",
      "VOUCHER_JOURNAL_PARITY"
    )
  }

  for (let i = 0; i < sortedVoucher.length; i++) {
    const v = sortedVoucher[i]!
    const j = journalDrafts[i]!
    const expectedLineNo = i + 1
    if (v.lineNo !== expectedLineNo || v.lineNo !== i + 1) {
      throw new FinancePostingError(
        `Voucher lineNo mismatch at index ${i}`,
        "VOUCHER_JOURNAL_PARITY"
      )
    }
    if (v.glAccountId !== j.glAccountId) {
      throw new FinancePostingError(
        "Voucher and journal glAccountId mismatch",
        "VOUCHER_JOURNAL_PARITY"
      )
    }
    if (!toMoney(v.debit).equals(toMoney(j.debit))) {
      throw new FinancePostingError(
        "Voucher and journal debit mismatch",
        "VOUCHER_JOURNAL_PARITY"
      )
    }
    if (!toMoney(v.credit).equals(toMoney(j.credit))) {
      throw new FinancePostingError(
        "Voucher and journal credit mismatch",
        "VOUCHER_JOURNAL_PARITY"
      )
    }
    const vMemo = v.memo ?? null
    const jMemo = j.memo ?? null
    if (vMemo !== jMemo) {
      throw new FinancePostingError(
        "Voucher and journal memo mismatch",
        "VOUCHER_JOURNAL_PARITY"
      )
    }
  }
}

export async function createJournalForVoucher(
  tx: Prisma.TransactionClient,
  input: CreateJournalForVoucherInput
): Promise<{ journalEntryId: string }> {
  assertPostedJournalImmutable()

  const existing = await tx.journalEntry.findUnique({
    where: { voucherId: input.voucherId },
  })
  if (existing) {
    throw new FinancePostingError(
      "Journal entry already exists for voucher",
      "JOURNAL_ALREADY_EXISTS"
    )
  }

  const voucherLines = await tx.voucherLine.findMany({
    where: { voucherId: input.voucherId },
    orderBy: { lineNo: "asc" },
  })

  assertVoucherJournalLineParity(voucherLines, input.lines)

  const entry = await tx.journalEntry.create({
    data: {
      voucherId: input.voucherId,
      date: input.date,
      branchId: input.branchId,
      periodId: input.periodId,
      lines: {
        create: input.lines.map((line, index) => ({
          lineNo: index + 1,
          glAccountId: line.glAccountId,
          debit: toMoney(line.debit),
          credit: toMoney(line.credit),
          memo: line.memo ?? null,
        })),
      },
    },
  })

  return { journalEntryId: entry.id }
}
