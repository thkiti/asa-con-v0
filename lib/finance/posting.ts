import type { Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import {
  buildJournalLineDraftsFromCodes,
  resolveAccountsForPosRefund,
  resolveAccountsForPosSale,
  resolveAccountsForStockDocument,
} from "./account-map"
import { toMoney } from "./decimal"
import { FinancePostingError } from "./posting-errors"
import { resolvePosSaleVoucherVatEconomics } from "./resolve-pos-sale-voucher-vat"
import { assertPostingPeriodOpen } from "./posting-period"
import { createJournalForVoucher } from "./journal"
import {
  FINANCE_REF_TYPES,
  type JournalLineCodeDraft,
  type JournalLineDraft,
  type ManualJournalLineInput,
  type OperationalVoucherInput,
  type PostClosingEntryVoucherInput,
  type PostJournalReversalInput,
  type PostManualJournalVoucherInput,
  type PostRefundVoucherInput,
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

  const period = await assertPostingPeriodOpen(
    tx,
    input.date,
    input.legalEntityCode
  )
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

  const legalEntityCode = input.legalEntityCode ?? DEFAULT_DOCUMENT_ENTITY_CODE
  const vatEconomics = await resolvePosSaleVoucherVatEconomics(input.tx, {
    legalEntityCode,
    sale: input.sale,
    vatEconomics: input.vatEconomics,
  })

  const codeLines = resolveAccountsForPosSale({
    paymentMethod: input.sale.paymentMethod,
    total: input.sale.total,
    cogsAmount: input.ledgerResult?.cogsAmount,
    vatEconomics,
  })

  const lines = await resolveAccountIds(input.tx, codeLines)

  return postOperationalVoucher({
    tx: input.tx,
    branchId: input.sale.branchId,
    date: input.sale["createdAt"],
    legalEntityCode,
    refType: FINANCE_REF_TYPES.POS_SALE,
    refId: input.sale.id,
    description: "POS sale",
    lines,
  })
}

export async function postRefundVoucher(
  input: PostRefundVoucherInput
): Promise<PostedVoucherResult> {
  if (!input.tx) {
    throw new FinancePostingError(
      "postRefundVoucher requires caller transaction (tx)",
      "MISSING_TX"
    )
  }

  const codeLines = resolveAccountsForPosRefund({
    paymentMethod: input.paymentMethod,
    amount: input.refund.amount,
    vatEconomics: input.vatEconomics,
  })

  const lines = await resolveAccountIds(input.tx, codeLines)

  return postOperationalVoucher({
    tx: input.tx,
    branchId: input.refund.branchId,
    date: input.refund.createdAt,
    legalEntityCode: input.legalEntityCode ?? DEFAULT_DOCUMENT_ENTITY_CODE,
    refType: FINANCE_REF_TYPES.POS_REFUND,
    refId: input.refund.id,
    refNo: input.refund.refundNo,
    description: "POS refund",
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

export async function resolveManualJournalLines(
  tx: Prisma.TransactionClient,
  lineInputs: ManualJournalLineInput[]
): Promise<JournalLineDraft[]> {
  const codeLines: JournalLineCodeDraft[] = lineInputs.map((line) => ({
    accountCode: line.accountCode.trim(),
    debit: toMoney(line.debit),
    credit: toMoney(line.credit),
    memo: line.memo ?? undefined,
  }))

  const codes = [...new Set(codeLines.map((l) => l.accountCode))]
  const accounts = await tx.glAccount.findMany({
    where: { code: { in: codes } },
  })
  const byCode = new Map(accounts.map((a) => [a.code, a]))

  for (const code of codes) {
    const account = byCode.get(code)
    if (!account || account.deleted) {
      throw new FinancePostingError(
        `GL account not found for code ${code}`,
        "ACCOUNT_NOT_FOUND"
      )
    }
    if (!account.isActive) {
      throw new FinancePostingError(
        `GL account is inactive: ${code}`,
        "ACCOUNT_INACTIVE"
      )
    }
  }

  const codeToId = new Map(
    accounts
      .filter((a) => !a.deleted && a.isActive)
      .map((a) => [a.code, a.id])
  )
  return buildJournalLineDraftsFromCodes(codeLines, codeToId)
}

function assertBalancedJournal(lines: JournalLineDraft[]): void {
  try {
    assertBalanced(lines)
  } catch (err) {
    if (err instanceof FinancePostingError && err.code === "UNBALANCED_ENTRY") {
      throw new FinancePostingError(
        err.message,
        "UNBALANCED_JOURNAL"
      )
    }
    throw err
  }
}

export async function postClosingEntryVoucher(
  input: PostClosingEntryVoucherInput
): Promise<PostedVoucherResult> {
  if (!input.tx) {
    throw new FinancePostingError(
      "postClosingEntryVoucher requires caller transaction (tx)",
      "MISSING_TX"
    )
  }

  const lines = await resolveManualJournalLines(input.tx, input.lines)
  assertNonZeroLines(lines)
  assertBalancedJournal(lines)

  return postOperationalVoucher({
    tx: input.tx,
    branchId: input.branchId,
    date: input.date,
    legalEntityCode: input.legalEntityCode,
    refType: FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY,
    refId: input.refId,
    refNo: `CE-${input.periodKey}`,
    description: input.description,
    lines,
  })
}

export async function postManualJournalVoucher(
  input: PostManualJournalVoucherInput
): Promise<PostedVoucherResult> {
  if (!input.tx) {
    throw new FinancePostingError(
      "postManualJournalVoucher requires caller transaction (tx)",
      "MISSING_TX"
    )
  }

  const lines = await resolveManualJournalLines(input.tx, input.lines)
  assertNonZeroLines(lines)
  assertBalancedJournal(lines)

  return postOperationalVoucher({
    tx: input.tx,
    branchId: input.branchId,
    date: input.date,
    refType: FINANCE_REF_TYPES.MANUAL_JOURNAL,
    refId: input.idempotencyKey,
    refNo: input.refNo,
    description: input.description,
    lines,
  })
}

export async function postJournalReversal(
  input: PostJournalReversalInput
): Promise<PostedVoucherResult> {
  if (!input.tx) {
    throw new FinancePostingError(
      "postJournalReversal requires caller transaction (tx)",
      "MISSING_TX"
    )
  }

  const reason = input.reason.trim()
  if (!reason) {
    throw new FinancePostingError(
      "Reversal reason is required",
      "REVERSAL_REASON_REQUIRED"
    )
  }

  const { tx } = input

  const original = await tx.journalEntry.findUnique({
    where: { id: input.journalEntryId },
    include: {
      lines: { orderBy: { lineNo: "asc" } },
      voucher: { select: { voucherNo: true } },
      reversedBy: { select: { id: true } },
    },
  })

  if (!original) {
    throw new FinancePostingError("Journal entry not found", "JOURNAL_NOT_FOUND")
  }

  if (original.reversalOfJournalEntryId) {
    throw new FinancePostingError(
      "Reversal journals cannot be reversed",
      "REVERSAL_NOT_ALLOWED"
    )
  }

  if (original.reversedBy) {
    throw new FinancePostingError(
      "Journal entry has already been reversed",
      "JOURNAL_ALREADY_REVERSED"
    )
  }

  const reversalLines: JournalLineDraft[] = original.lines.map((line) => ({
    glAccountId: line.glAccountId,
    debit: toMoney(line.credit),
    credit: toMoney(line.debit),
    memo: line.memo ? `Reversal: ${line.memo}` : "Reversal",
  }))

  assertNonZeroLines(reversalLines)
  assertBalancedJournal(reversalLines)

  const period = await assertPostingPeriodOpen(
    tx,
    input.reversalDate,
    original.legalEntityCode as DocumentEntityCode
  )

  const reversalRefId = crypto.randomUUID()

  const { voucherId, voucherNo } = await createVoucherWithLines(tx, {
    branchId: original.branchId,
    periodId: period.id,
    date: input.reversalDate,
    refType: FINANCE_REF_TYPES.MANUAL_JOURNAL_REVERSAL,
    refId: reversalRefId,
    refNo: original.voucher.voucherNo,
    description: `Reversal of ${original.voucher.voucherNo}: ${reason}`,
    lines: reversalLines,
  })

  const { journalEntryId } = await createJournalForVoucher(tx, {
    voucherId,
    date: input.reversalDate,
    branchId: original.branchId,
    periodId: period.id,
    lines: reversalLines,
    reversalOfJournalEntryId: original.id,
  })

  return {
    voucherId,
    voucherNo,
    journalEntryId,
    alreadyPosted: false,
  }
}
