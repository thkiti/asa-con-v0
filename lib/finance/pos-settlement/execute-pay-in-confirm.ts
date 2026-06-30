import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { postBankDepositFromReport } from "@/lib/pos/bank-deposit-settlement"
import { prisma } from "@/lib/shared/prisma"
import {
  buildBankDepositSettlementPostResult,
  type BankDepositSettlementPostResult,
} from "./bank-deposit-post-response"
import { extractCollectorPickupCashAmount } from "./collector-cash-amount"
import { getCollectorPickupSettlementStatus } from "./collector-pickup-reconciliation"
import { loadCollectorReportForSettlement } from "./post-collector-pickup"
import {
  assertPayInEvidenceUploadedForPosting,
  DEFAULT_BANK_ACCOUNT_CODE,
  updatePayInEvidenceDepositMeta,
} from "./pay-in-evidence"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "./pos-settlement-errors"

export type ExecutePayInConfirmInput = {
  collectorReportId: string
  bankDepositDate: string
  bankAccountCode?: string
  legalEntityCode: DocumentEntityCode
  uploadedByStaffId?: string | null
}

function parseCollectorReportJson(reportJson: unknown): ReadReportPayload {
  if (reportJson == null || typeof reportJson !== "object") {
    throw new Error("Collector report payload is invalid")
  }
  return reportJson as ReadReportPayload
}

function parseBankDepositDate(value: string): Date {
  const trimmed = String(value ?? "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new PosSettlementError(
      "bankDepositDate must be YYYY-MM-DD",
      PosSettlementErrorCodes.INVALID_SOURCE,
      400
    )
  }
  const date = new Date(`${trimmed}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new PosSettlementError(
      "bankDepositDate is invalid",
      PosSettlementErrorCodes.INVALID_SOURCE,
      400
    )
  }
  return date
}

/** Finance PAY-IN confirm: requires slip evidence, posts PSV-BANK-DEP. */
export async function executePayInConfirm(
  input: ExecutePayInConfirmInput
): Promise<BankDepositSettlementPostResult> {
  const collectorReportId = String(input.collectorReportId ?? "").trim()
  const bankDepositDate = parseBankDepositDate(input.bankDepositDate)
  const bankAccountCode =
    input.bankAccountCode?.trim() || DEFAULT_BANK_ACCOUNT_CODE

  const source = await loadCollectorReportForSettlement(prisma, collectorReportId)
  const report = parseCollectorReportJson(source.reportJson)
  const cashAmount = extractCollectorPickupCashAmount(report)

  const reconciliation = await getCollectorPickupSettlementStatus(prisma, collectorReportId)

  const evidence = await assertPayInEvidenceUploadedForPosting(
    prisma,
    collectorReportId,
    {
      collectNo: source.collectNo,
      pickupStatus: reconciliation.status,
      depositStatus: reconciliation.depositStatus,
    }
  )

  await updatePayInEvidenceDepositMeta(prisma, {
    evidenceId: evidence.id,
    bankDepositDate,
    bankAccountCode,
  })

  const posted = await postBankDepositFromReport({
    collectorReportId,
    postingDate: bankDepositDate,
    legalEntityCode: input.legalEntityCode,
  })

  return buildBankDepositSettlementPostResult(prisma, {
    voucherId: posted.voucherId,
    collectorReportId: source.id,
    collectNo: source.collectNo,
    amount: cashAmount,
    legalEntityCode: input.legalEntityCode,
  })
}
