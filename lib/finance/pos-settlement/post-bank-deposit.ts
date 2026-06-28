import type { Prisma } from "@/generated/prisma/client"
import { resolveAccountsForPosBankDeposit } from "@/lib/finance/account-map"
import { resolveAccountIds, postOperationalVoucher } from "@/lib/finance/posting"
import { assertPostingPeriodOpen } from "@/lib/finance/posting-period"
import {
  FINANCE_REF_TYPES,
  type PostedVoucherResult,
} from "@/lib/finance/posting-types"
import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"
import { resolvePosLegalEntityCode } from "@/lib/pos/resolve-pos-sale-vat"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { PSV_BANK_DEPOSIT_DOCUMENT_CODE } from "./constants"
import { extractCollectorPickupCashAmount } from "./collector-cash-amount"
import {
  loadCollectorReportForSettlement,
  type CollectorReportSettlementSource,
} from "./post-collector-pickup"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "./pos-settlement-errors"

export type PostBankDepositSettlementInput = {
  tx: Prisma.TransactionClient
  collectorReportId: string
  /** Defaults to collector report createdAt when omitted. */
  postingDate?: Date
  legalEntityCode?: DocumentEntityCode
}

type BankDepositDb = Pick<Prisma.TransactionClient, "collectorReport" | "voucher">

function assertPosSettlementLegalEntity(
  legalEntityCode?: DocumentEntityCode
): DocumentEntityCode {
  const resolved = legalEntityCode ?? resolvePosLegalEntityCode()
  if (resolved !== DEFAULT_DOCUMENT_ENTITY_CODE) {
    throw new PosSettlementError(
      "POS settlement is AS / ASAS only",
      PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
      403
    )
  }
  return resolved
}

function parseCollectorReportJson(reportJson: unknown): ReadReportPayload {
  if (reportJson == null || typeof reportJson !== "object") {
    throw new PosSettlementError(
      "Collector report payload is invalid",
      PosSettlementErrorCodes.INVALID_SOURCE
    )
  }
  return reportJson as ReadReportPayload
}

export async function loadCollectorPickupSettlementVoucher(
  tx: BankDepositDb,
  collectorReportId: string
) {
  return tx.voucher.findUnique({
    where: {
      refType_refId: {
        refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
        refId: collectorReportId,
      },
    },
    include: { journalEntry: true },
  })
}

export async function assertCollectorPickupPostedForBankDeposit(
  tx: BankDepositDb,
  collectorReportId: string
): Promise<void> {
  const pickupVoucher = await loadCollectorPickupSettlementVoucher(
    tx,
    collectorReportId
  )

  if (!pickupVoucher?.journalEntry) {
    throw new PosSettlementError(
      "Collector pickup settlement must be posted before bank deposit",
      PosSettlementErrorCodes.COLLECTOR_PICKUP_NOT_POSTED,
      409
    )
  }
}

export async function assertBankDepositNotYetPosted(
  tx: Prisma.TransactionClient,
  collectorReportId: string
): Promise<void> {
  const existing = await tx.voucher.findUnique({
    where: {
      refType_refId: {
        refType: FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
        refId: collectorReportId,
      },
    },
    include: { journalEntry: true },
  })

  if (existing?.journalEntry) {
    throw new PosSettlementError(
      "Bank deposit settlement already posted for this collector report",
      PosSettlementErrorCodes.DUPLICATE_SOURCE,
      409
    )
  }
}

export async function postBankDepositSettlement(
  input: PostBankDepositSettlementInput
): Promise<PostedVoucherResult> {
  if (!input.tx) {
    throw new PosSettlementError(
      "postBankDepositSettlement requires caller transaction (tx)",
      PosSettlementErrorCodes.INVALID_SOURCE,
      500
    )
  }

  const legalEntityCode = assertPosSettlementLegalEntity(input.legalEntityCode)
  const source: CollectorReportSettlementSource =
    await loadCollectorReportForSettlement(input.tx, input.collectorReportId)
  const report = parseCollectorReportJson(source.reportJson)
  const cashAmount = extractCollectorPickupCashAmount(report)
  const postingDate = input.postingDate ?? source.createdAt

  await assertCollectorPickupPostedForBankDeposit(input.tx, source.id)
  await assertBankDepositNotYetPosted(input.tx, source.id)
  await assertPostingPeriodOpen(input.tx, postingDate, legalEntityCode)

  const codeLines = resolveAccountsForPosBankDeposit(cashAmount)
  const lines = await resolveAccountIds(input.tx, codeLines)

  const posted = await postOperationalVoucher({
    tx: input.tx,
    branchId: source.branchId,
    date: postingDate,
    legalEntityCode,
    refType: FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
    refId: source.id,
    refNo: source.collectNo,
    description: `${PSV_BANK_DEPOSIT_DOCUMENT_CODE} bank deposit`,
    lines,
  })

  if (posted.alreadyPosted) {
    throw new PosSettlementError(
      "Bank deposit settlement already posted for this collector report",
      PosSettlementErrorCodes.DUPLICATE_SOURCE,
      409
    )
  }

  return posted
}
