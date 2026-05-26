import type { Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import {
  buildJournalLineDraftsFromCodes,
  resolveAccountsForPosSale,
  resolveAccountsForStockDocument,
} from "./account-map"
import { FinancePostingError } from "./posting-errors"
import { assertPostingPeriodOpen } from "./posting-period"
import { createJournalForVoucher } from "./journal"
import {
  FINANCE_REF_TYPES,
  type JournalLineCodeDraft,
  type JournalLineDraft,
  type OperationalVoucherInput,
  type PostSaleVoucherInput,
  type PostedVoucherResult,
  type PostStockDocumentVoucherInput,
} from "./posting-types"
import {
  assertBalanced,
  assertNonZeroLines,
  assertPeriodOpen,
} from "./validation"
import { createVoucherWithLines } from "./voucher"

type AccountingPeriodRow = {
  id: string
  status: AccountingPeriodStatus
}

export function ensureOpenPeriod(period: AccountingPeriodRow): void {
  assertPeriodOpen(period.status)
}

export async function resolveAccountIds(
  tx: Prisma.TransactionClient,
  codeLines: JournalLineCodeDraft[]
): Promise<JournalLineDraft[]> {
  const codes = [...new Set(codeLines.map((l) => l.accountCode))]
  const accounts = await tx.glAccount.findMany({
    where: {
      code: { in: codes },
      deleted: false,
      isActive: true,
    },
  })

  const codeToId = new Map(accounts.map((a) => [a.code, a.id]))
  return buildJournalLineDraftsFromCodes(codeLines, codeToId)
}

export async function postOperationalVoucher(
  input: OperationalVoucherInput
): Promise<PostedVoucherResult> {
  if (!input.tx) {
    throw new FinancePostingError(
      "postOperationalVoucher requires caller transaction (tx)",
      "MISSING_TX"
    )
  }

  const { tx } = input

  const existing = await tx.voucher.findUnique({
    where: {
      refType_refId: {
        refType: input.refType,
        refId: input.refId,
      },
    },
    include: { journalEntry: true },
  })

  if (existing?.journalEntry) {
    return {
      voucherId: existing.id,
      voucherNo: existing.voucherNo,
      journalEntryId: existing.journalEntry.id,
      alreadyPosted: true,
    }
  }

  if (existing) {
    throw new FinancePostingError(
      "Voucher exists without journal entry",
      "INCOMPLETE_VOUCHER"
    )
  }

  assertNonZeroLines(input.lines)
  assertBalanced(input.lines)

  const period = await assertPostingPeriodOpen(tx, input.branchId, input.date)
  const periodId = period.id

  const { voucherId, voucherNo } = await createVoucherWithLines(tx, {
    branchId: input.branchId,
    periodId,
    date: input.date,
    refType: input.refType,
    refId: input.refId,
    refNo: input.refNo,
    description: input.description,
    lines: input.lines,
  })

  const { journalEntryId } = await createJournalForVoucher(tx, {
    voucherId,
    date: input.date,
    branchId: input.branchId,
    periodId,
    lines: input.lines,
  })

  return {
    voucherId,
    voucherNo,
    journalEntryId,
    alreadyPosted: false,
  }
}

export async function postSaleVoucher(
  input: PostSaleVoucherInput
): Promise<PostedVoucherResult> {
  if (!input.tx) {
    throw new FinancePostingError(
      "postSaleVoucher requires caller transaction (tx)",
      "MISSING_TX"
    )
  }

  const codeLines = resolveAccountsForPosSale({
    paymentMethod: input.sale.paymentMethod,
    total: input.sale.total,
    cogsAmount: input.ledgerResult?.cogsAmount,
  })

  const lines = await resolveAccountIds(input.tx, codeLines)

  return postOperationalVoucher({
    tx: input.tx,
    branchId: input.sale.branchId,
    date: new Date(),
    refType: FINANCE_REF_TYPES.POS_SALE,
    refId: input.sale.id,
    description: "POS sale",
    lines,
  })
}

export async function postStockDocumentVoucher(
  input: PostStockDocumentVoucherInput
): Promise<PostedVoucherResult> {
  if (!input.tx) {
    throw new FinancePostingError(
      "postStockDocumentVoucher requires caller transaction (tx)",
      "MISSING_TX"
    )
  }

  const codeLines = resolveAccountsForStockDocument({
    docType: input.doc.docType,
    inboundValue: input.ledgerResult.inboundValue,
    outboundValue: input.ledgerResult.outboundValue,
  })

  const lines = await resolveAccountIds(input.tx, codeLines)

  return postOperationalVoucher({
    tx: input.tx,
    branchId: input.doc.branchId,
    date: new Date(),
    refType: FINANCE_REF_TYPES.STOCK_DOC_POST,
    refId: input.doc.id,
    refNo: input.doc.refNo,
    description: `Stock document ${input.doc.docType}`,
    lines,
  })
}
