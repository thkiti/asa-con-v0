import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { postBankDepositFromReport } from "@/lib/pos/bank-deposit-settlement"
import { prisma } from "@/lib/shared/prisma"
import {
  buildBankDepositSettlementPostResult,
  type BankDepositSettlementPostResult,
  type ExecuteBankDepositSettlementPostInput,
} from "./bank-deposit-post-response"
import { extractCollectorPickupCashAmount } from "./collector-cash-amount"
import { loadCollectorReportForSettlement } from "./post-collector-pickup"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

function parseCollectorReportJson(reportJson: unknown): ReadReportPayload {
  if (reportJson == null || typeof reportJson !== "object") {
    throw new Error("Collector report payload is invalid")
  }
  return reportJson as ReadReportPayload
}

/** Finance-facing post: bank deposit journal + response DTO. */
export async function executeBankDepositSettlementPost(
  input: ExecuteBankDepositSettlementPostInput
): Promise<BankDepositSettlementPostResult> {
  const collectorReportId = String(input.collectorReportId ?? "").trim()
  const source = await loadCollectorReportForSettlement(prisma, collectorReportId)
  const report = parseCollectorReportJson(source.reportJson)
  const cashAmount = extractCollectorPickupCashAmount(report)

  const posted = await postBankDepositFromReport({
    collectorReportId,
    legalEntityCode: input.legalEntityCode,
    tx: input.tx,
  })

  return buildBankDepositSettlementPostResult(prisma, {
    voucherId: posted.voucherId,
    collectorReportId: source.id,
    collectNo: source.collectNo,
    amount: cashAmount,
    legalEntityCode: input.legalEntityCode,
  })
}
