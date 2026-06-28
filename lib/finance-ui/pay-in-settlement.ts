import type { PayInEvidenceUiStatus } from "@/lib/finance-ui/pay-in-display"
import type { BankDepositSettlementPostResult } from "@/lib/finance-ui/bank-deposit-settlement"
import { BankDepositSettlementApiError } from "@/lib/finance-ui/bank-deposit-settlement"
import { bangkokTodayYmdClient } from "@/lib/pos-ui/pos-staff-credential"

export type PayInEvidenceUploadResult = {
  ok: true
  evidenceId: string
  collectorReportId: string
  collectNo: string
  status: Exclude<PayInEvidenceUiStatus, null>
  blobPathname: string
  blobUrl: string
}

export type PayInVerifyStaffResult =
  | { ok: true; staffId: string; staffName: string }
  | { ok: false; error: string }

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

export async function verifyPayInUploadStaffCredential(input: {
  staffId: string
  password: string
}): Promise<PayInVerifyStaffResult> {
  try {
    const res = await fetch("/api/finance/pos-settlement/pay-in/verify-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = (await res.json()) as {
      error?: string
      staffId?: string
      staffName?: string
    }
    if (!res.ok) {
      return { ok: false, error: data.error || "Staff verification failed" }
    }
    return {
      ok: true,
      staffId: String(data.staffId ?? input.staffId),
      staffName: String(data.staffName ?? ""),
    }
  } catch {
    return { ok: false, error: "Could not reach server" }
  }
}

export function uploadPayInSlipEvidence(input: {
  collectorReportId: string
  staffId: string
  file: File
}): Promise<PayInEvidenceUploadResult> {
  const form = new FormData()
  form.append("collectorReportId", input.collectorReportId)
  form.append("staffId", input.staffId)
  form.append("file", input.file)

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

export function postDepositSettlement(
  collectorReportId: string,
  bankDepositDate?: string
): Promise<BankDepositSettlementPostResult> {
  return fetch("/api/finance/pos-settlement/pay-in/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectorReportId,
      bankDepositDate: bankDepositDate ?? bangkokTodayYmdClient(),
    }),
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
      return "Upload PAY-IN Slip first."
    }
    if (err.code === "DUPLICATE_SOURCE") {
      return "Bank deposit already posted for this collector report."
    }
    if (err.code === "COLLECTOR_PICKUP_NOT_POSTED") {
      return "Collector pickup must be posted before bank deposit."
    }
    if (err.code === "PERIOD_CLOSED" || err.code === "PERIOD_NOT_OPENED") {
      return "Accounting period is closed — cannot post settlement."
    }
    return err.message
  }
  if (err instanceof Error) return err.message
  return "Request failed"
}

/** @deprecated Use postDepositSettlement — upload no longer posts */
export const confirmPayInSettlement = postDepositSettlement
