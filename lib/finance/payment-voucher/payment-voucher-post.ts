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
  PaymentVoucherError,
  PaymentVoucherErrorCodes,
} from "./payment-voucher-errors"
import { applyPostedStatus } from "./payment-voucher-status"
import type {
  PaymentVoucherWithLines,
  PostPaymentVoucherInput,
} from "./payment-voucher-types"
import { assertCanPostPaymentVoucher } from "./payment-voucher-validation"

type EntryWithGlLines = PaymentVoucherWithLines & {
  lines: Array<
    PaymentVoucherWithLines["lines"][number] & {
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
  const entry = await tx.paymentVoucher.findFirst({
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
    throw new PaymentVoucherError(
      "Payment voucher not found",
      PaymentVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return entry
}

export async function postPaymentVoucher(
  input: PostPaymentVoucherInput
): Promise<PaymentVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const postedByStaffId = String(input.postedByStaffId ?? "").trim()

  if (!entryId || !postedByStaffId) {
    throw new PaymentVoucherError(
      "entryId and postedByStaffId are required",
      PaymentVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<PaymentVoucherWithLines> => {
    const entry = await loadEntryWithGlAccountsOrThrow(tx, entryId, legalEntityCode)

    if (
      entry.status === "POSTED" &&
      entry.postedVoucherId &&
      entry.postedJournalEntryId
    ) {
      return entry
    }

    await assertCanPostPaymentVoucher(tx, entry)
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
      refType: FINANCE_REF_TYPES.PAYMENT_VOUCHER,
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
