export type PosReceiptNoPreviewResult =
  | { ok: true; receiptNo: string }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchPosReceiptNoPreview(
  fetchFn: typeof fetch = fetch
): Promise<PosReceiptNoPreviewResult> {
  const res = await fetchFn("/api/pos/receipt-no/preview", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  const payload = (await res.json().catch(() => ({}))) as {
    receiptNo?: string
    error?: string
    code?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Failed to load receipt preview",
      code: payload.code,
    }
  }

  const receiptNo = payload.receiptNo?.trim()
  if (!receiptNo) {
    return { ok: false, status: 500, error: "Invalid receipt preview response", code: "POS_ERROR" }
  }

  return { ok: true, receiptNo }
}
