import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { entityScopedIdWhere } from "@/lib/finance/voucher-entity-scope"
import { toMoney } from "@/lib/finance/decimal"
import { assertPostingPeriodOpen } from "@/lib/finance/posting-period"
import { postOperationalVoucher } from "@/lib/finance/posting"
import {
  FINANCE_REF_TYPES,
  type JournalLineDraft,
} from "@/lib/finance/posting-types"
import { prisma } from "@/lib/shared/prisma"
import {
  PettyCashVoucherError,
  PettyCashVoucherErrorCodes,
} from "./petty-cash-voucher-errors"
import { applyPostedStatus } from "./petty-cash-voucher-status"
import type {
  PettyCashVoucherWithLines,
  PostPettyCashVoucherInput,
} from "./petty-cash-voucher-types"
import { assertCanPostPettyCashVoucher } from "./petty-cash-voucher-validation"

type EntryWithGlLines = PettyCashVoucherWithLines & {
  lines: Array<
    PettyCashVoucherWithLines["lines"][number] & {
      glAccount: { code: string; name: string }
    }
  >
}

function materializeJournalLines(entry: EntryWithGlLines): JournalLineDraft[] {
  const sorted = [...entry.lines].sort((a, b) => a.lineNo - b.lineNo)
  return sorted.map((line) => ({
    glAccountId: line.glAccountId,
    debit: toMoney(line.debit),
    credit: toMoney(line.credit),
    memo: line.memo ?? undefined,
  }))
}

async function loadEntryWithGlAccountsOrThrow(
  tx: Prisma.TransactionClient,
  entryId: string,
  legalEntityCode: DocumentEntityCode
): Promise<EntryWithGlLines> {
  const { id } = entityScopedIdWhere(entryId, legalEntityCode)
  const entry = await tx.pettyCashVoucher.findFirst({
    where: { id, legalEntityCode },
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
    throw new PettyCashVoucherError(
      "Petty cash voucher not found",
      PettyCashVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return entry
}

export async function postPettyCashVoucher(
  input: PostPettyCashVoucherInput
): Promise<PettyCashVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const postedByStaffId = String(input.postedByStaffId ?? "").trim()

  if (!entryId || !postedByStaffId) {
    throw new PettyCashVoucherError(
      "entryId and postedByStaffId are required",
      PettyCashVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PettyCashVoucherWithLines> => {
    const entry = await loadEntryWithGlAccountsOrThrow(tx, entryId, legalEntityCode)

    if (
      entry.status === "POSTED" &&
      entry.postedVoucherId &&
      entry.postedJournalEntryId
    ) {
      return entry
    }

    await assertCanPostPettyCashVoucher(tx, entry)
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
      refType: FINANCE_REF_TYPES.PETTY_CASH_VOUCHER,
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
