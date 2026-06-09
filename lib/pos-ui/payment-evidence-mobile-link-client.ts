export type MintPaymentEvidenceMobileLinkResult =
  | {
      ok: true
      uploadUrl: string
      expiresAt: string
      receiptNo: string
    }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchPaymentEvidenceMobileLink(
  input: { receiptNo: string },
  fetchFn: typeof fetch = fetch
): Promise<MintPaymentEvidenceMobileLinkResult> {
  const receiptNo = input.receiptNo.trim()
  if (!receiptNo) {
    return {
      ok: false,
      status: 400,
      error: "receiptNo is required",
      code: "INVALID_RECEIPT_NO",
    }
  }

  const res = await fetchFn("/api/pos/payment-evidence/mobile-link", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receiptNo }),
  })

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: string
    uploadUrl?: string
    expiresAt?: string
    receiptNo?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Failed to create mobile upload link",
      code: payload.code,
    }
  }

  if (!payload.uploadUrl || !payload.expiresAt) {
    return {
      ok: false,
      status: 500,
      error: "Invalid mobile link response",
      code: "POS_ERROR",
    }
  }

  return {
    ok: true,
    uploadUrl: payload.uploadUrl,
    expiresAt: payload.expiresAt,
    receiptNo: payload.receiptNo ?? receiptNo,
  }
}
