import type { PayInEvidenceUiStatus } from "@/lib/finance-ui/pay-in-display"
import type { BankDepositSettlementPostResult } from "@/lib/finance-ui/bank-deposit-settlement"
import { BankDepositSettlementApiError } from "@/lib/finance-ui/bank-deposit-settlement"

export type PayInEvidenceUploadResult = {
  ok: true
  evidenceId: string
  collectorReportId: string
  collectNo: string
  status: Exclude<PayInEvidenceUiStatus, null>
  blobPathname: string
  blobUrl: string
}

export type PayInConfirmInput = {
  collectorReportId: string
  bankDepositDate: string
  bankAccountCode?: string
}

async function parseApiError(res: Response): Promise<BankDepositSettlementApiError> {
  let message = res.statusText || "Request failed"
  let code = "INTERNAL_ERROR"
  try {
    const body = (await res.json()) as { error?: string; code?: string }
    if (body.error) message = body.error
    if (body.code) code = body.code
  } catch {
    // keep defaults
  }
  return new BankDepositSettlementApiError(message, code, res.status)
}

export function uploadPayInSlipEvidence(
  collectorReportId: string,
  file: File
): Promise<PayInEvidenceUploadResult> {
  const form = new FormData()
  form.append("collectorReportId", collectorReportId)
  form.append("file", file)

  return fetch("/api/finance/pos-settlement/pay-in/evidence/upload", {
    method: "POST",
    body: form,
  }).then(async (res) => {
    if (!res.ok) {
      throw await parseApiError(res)
    }
    return res.json() as Promise<PayInEvidenceUploadResult>
  })
}

export function confirmPayInSettlement(
  input: PayInConfirmInput
): Promise<BankDepositSettlementPostResult> {
  return fetch("/api/finance/pos-settlement/pay-in/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then(async (res) => {
    if (!res.ok) {
      throw await parseApiError(res)
    }
    return res.json() as Promise<BankDepositSettlementPostResult>
  })
}

export function formatPayInConfirmError(err: unknown): string {
  if (err instanceof BankDepositSettlementApiError) {
    if (err.code === "PAY_IN_SLIP_REQUIRED") {
      return "Upload the PAY-IN slip before confirming bank deposit."
    }
    if (err.code === "DUPLICATE_SOURCE") {
      return "Bank deposit already posted for this collector report."
    }
    if (err.code === "COLLECTOR_PICKUP_NOT_POSTED") {
      return "Collector pickup settlement must be posted before PAY-IN."
    }
    if (err.code === "PERIOD_CLOSED" || err.code === "PERIOD_NOT_OPENED") {
      return "Accounting period is closed — cannot post settlement."
    }
    return err.message
  }
  if (err instanceof Error) return err.message
  return "PAY-IN confirmation failed"
}
