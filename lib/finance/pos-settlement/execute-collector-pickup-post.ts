import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { postCollectorPickupFromReport } from "@/lib/pos/collector-settlement"
import { prisma } from "@/lib/shared/prisma"
import {
  buildCollectorPickupSettlementPostResult,
  type CollectorPickupSettlementPostResult,
  type ExecuteCollectorPickupSettlementPostInput,
} from "./collector-pickup-post-response"
import { extractCollectorPickupCashAmount } from "./collector-cash-amount"
import { loadCollectorReportForSettlement } from "./post-collector-pickup"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

function parseCollectorReportJson(reportJson: unknown): ReadReportPayload {
  if (reportJson == null || typeof reportJson !== "object") {
    throw new Error("Collector report payload is invalid")
  }
  return reportJson as ReadReportPayload
}

/** Finance-facing post: settlement journal + response DTO. */
export async function executeCollectorPickupSettlementPost(
  input: ExecuteCollectorPickupSettlementPostInput
): Promise<CollectorPickupSettlementPostResult> {
  const collectorReportId = String(input.collectorReportId ?? "").trim()
  const source = await loadCollectorReportForSettlement(prisma, collectorReportId)
  const report = parseCollectorReportJson(source.reportJson)
  const cashAmount = extractCollectorPickupCashAmount(report)

  const posted = await postCollectorPickupFromReport({
    collectorReportId,
    legalEntityCode: input.legalEntityCode,
    tx: input.tx,
  })

  return buildCollectorPickupSettlementPostResult(prisma, {
    voucherId: posted.voucherId,
    collectorReportId: source.id,
    collectNo: source.collectNo,
    amount: cashAmount,
    legalEntityCode: input.legalEntityCode,
  })
}
