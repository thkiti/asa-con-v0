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
  InvoiceVoucherError,
  InvoiceVoucherErrorCodes,
} from "./invoice-voucher-errors"
import { applyPostedStatus } from "./invoice-voucher-status"
import type {
  InvoiceVoucherWithLines,
  PostInvoiceVoucherInput,
} from "./invoice-voucher-types"
import { assertCanPostInvoiceVoucher } from "./invoice-voucher-validation"

type EntryWithGlLines = InvoiceVoucherWithLines & {
  lines: Array<
    InvoiceVoucherWithLines["lines"][number] & {
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
  const entry = await tx.invoiceVoucher.findFirst({
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
    throw new InvoiceVoucherError(
      "Invoice voucher not found",
      InvoiceVoucherErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  return entry
}

export async function postInvoiceVoucher(
  input: PostInvoiceVoucherInput
): Promise<InvoiceVoucherWithLines> {
  const entryId = String(input.entryId ?? "").trim()
  const legalEntityCode = input.legalEntityCode
  const postedByStaffId = String(input.postedByStaffId ?? "").trim()

  if (!entryId || !postedByStaffId) {
    throw new InvoiceVoucherError(
      "entryId and postedByStaffId are required",
      InvoiceVoucherErrorCodes.INVALID_LINE
    )
  }

  const run = async (tx: Prisma.TransactionClient): Promise<InvoiceVoucherWithLines> => {
    const entry = await loadEntryWithGlAccountsOrThrow(tx, entryId, legalEntityCode)

    if (
      entry.status === "POSTED" &&
      entry.postedVoucherId &&
      entry.postedJournalEntryId
    ) {
      return entry
    }

    await assertCanPostInvoiceVoucher(tx, entry)
    await assertPostingPeriodOpen(
      tx,
      entry.invoiceDate,
      entry.legalEntityCode as DocumentEntityCode
    )

    const lines = materializeJournalLines(entry)

    const posted = await postOperationalVoucher({
      tx,
      branchId: entry.branchId,
      date: entry.invoiceDate,
      legalEntityCode: entry.legalEntityCode as DocumentEntityCode,
      refType: FINANCE_REF_TYPES.INVOICE_VOUCHER,
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
