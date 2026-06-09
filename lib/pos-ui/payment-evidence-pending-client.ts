import type { PendingPaymentEvidenceResult } from "@/lib/pos/pending-payment-evidence-types"

export type PendingPaymentEvidenceLoadResult =
  | { ok: true; result: PendingPaymentEvidenceResult }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchPendingPaymentEvidence(
  fetchFn: typeof fetch = fetch
): Promise<PendingPaymentEvidenceLoadResult> {
  const res = await fetchFn("/api/pos/payment-evidence/pending", {
    credentials: "include",
    cache: "no-store",
  })

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: string
    count?: number
    receipts?: PendingPaymentEvidenceResult["receipts"]
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Failed to load pending slips",
      code: payload.code,
    }
  }

  return {
    ok: true,
    result: {
      count: payload.count ?? payload.receipts?.length ?? 0,
      receipts: payload.receipts ?? [],
    },
  }
}
