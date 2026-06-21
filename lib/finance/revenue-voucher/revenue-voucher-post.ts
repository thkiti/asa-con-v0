import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import { assertPostingPeriodOpen } from "@/lib/finance/posting-period"
import { postOperationalVoucher } from "@/lib/finance/posting"
import {
  FINANCE_REF_TYPES,
  type JournalLineDraft,
} from "@/lib/finance/posting-types"
import { prisma } from "@/lib/shared/prisma"
import {
  RevenueVoucherError,
  RevenueVoucherErrorCodes,
} from "./revenue-voucher-errors"
import { applyPostedStatus } from "./revenue-voucher-status"
import type {
  RevenueVoucherWithLines,
  PostRevenueVoucherInput,
} from "./revenue-voucher-types"
import { assertCanPostRevenueVoucher } from "./revenue-voucher-validation"

type EntryWithGlLines = RevenueVoucherWithLines & {
  lines: Array<
    RevenueVoucherWithLines["lines"][number] & {
      glAccount: { code: string; name: string }
    }
  >
}

function materializeJournalLines(entry: EntryWithGlLines): JournalLineDraft[] {
  const sorted = [...entry.lines].sort((a, b) => a.lineNo - b.lineNo)
  const journalLines: JournalLineDraft[] = sorted.map((line) => ({
    glAccountId: line.glAccountId,
    debit: ZERO,
    credit: toMoney(line.credit),
    memo: line.memo ?? undefined,
  }))

  const total = journalLines.reduce(
    (sum, line) => addMoney(sum, line.credit),
    ZERO
  )

  if (total.isZero()) {
    throw new RevenueVoucherError(
      "Revenue voucher total must be greater than zero",
      RevenueVoucherErrorCodes.INVALID_AMOUNT
    )
  }

  journalLines.push({
    glAccountId: entry.receiveToAccountId,
    debit: total,
    credit: ZERO,
    memo: entry.receivedFromName ? `Receipt from ${entry.receivedFromName}` : undefined,
  })

  return journalLines
}

async function loadEntryWithGlAccountsOrThrow(
  tx: Prisma.TransactionClient,
  entryId: string
): Promise<EntryWithGlLines> {
  const entry = await tx.revenueVoucher.findUnique({
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
    throw new RevenueVoucherError(
      "Revenue voucher not found",
      RevenueVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return entry
}

export async function postRevenueVoucher(
  input: PostRevenueVoucherInput
): Promise<RevenueVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const postedByStaffId = String(input.postedByStaffId ?? "").trim()

  if (!entryId || !postedByStaffId) {
    throw new RevenueVoucherError(
      "entryId and postedByStaffId are required",
      RevenueVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<RevenueVoucherWithLines> => {
    const entry = await loadEntryWithGlAccountsOrThrow(tx, entryId)

    if (
      entry.status === "POSTED" &&
      entry.postedVoucherId &&
      entry.postedJournalEntryId
    ) {
      return entry
    }

    await assertCanPostRevenueVoucher(tx, entry)
    await assertPostingPeriodOpen(
      tx,
      entry.entryDate,
      entry.legalEntityCode as DocumentEntityCode
    )

    const lines = materializeJournalLines(entry)

    const posted = await postOperationalVoucher({
      tx,
      branchId: entry.branchId,
      date: entry.entryDate,
      legalEntityCode: entry.legalEntityCode as DocumentEntityCode,
      refType: FINANCE_REF_TYPES.REVENUE_VOUCHER,
      refId: entry.id,
      refNo: entry.entryNo,
      description: entry.description,
      lines,
    })

    return applyPostedStatus(tx, {
      entryId,
      postedByStaffId,
      postedVoucherId: posted.voucherId,
      postedJournalEntryId: posted.journalEntryId,
    })
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run, { timeout: 30_000 })
}
