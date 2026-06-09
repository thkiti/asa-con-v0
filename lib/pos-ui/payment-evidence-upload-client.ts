export type UploadPaymentEvidenceResult =
  | {
      ok: true
      evidenceId: string
      receiptNo: string
      status: string
      blobPathname: string
      blobUrl: string
    }
  | { ok: false; status: number; error: string; code?: string }

/**
 * Fire-and-forget friendly upload — caller should not await before print/reset.
 */
export async function uploadPaymentEvidenceSlip(
  input: {
    file: Blob
    receiptNo: string
    fileName?: string
  },
  fetchFn: typeof fetch = fetch
): Promise<UploadPaymentEvidenceResult> {
  const receiptNo = input.receiptNo.trim()
  if (!receiptNo) {
    return { ok: false, status: 400, error: "receiptNo is required", code: "INVALID_RECEIPT_NO" }
  }

  const fd = new FormData()
  fd.set("file", input.file, input.fileName ?? `${receiptNo}.jpg`)
  fd.set("receiptNo", receiptNo)

  const res = await fetchFn("/api/pos/payment-evidence/upload", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: fd,
  })

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: string
    evidenceId?: string
    receiptNo?: string
    status?: string
    blobPathname?: string
    blobUrl?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Upload failed",
      code: payload.code,
    }
  }

  if (!payload.evidenceId || !payload.blobUrl) {
    return { ok: false, status: 500, error: "Invalid upload response", code: "POS_ERROR" }
  }

  return {
    ok: true,
    evidenceId: payload.evidenceId,
    receiptNo: payload.receiptNo ?? receiptNo,
    status: payload.status ?? "UPLOADED",
    blobPathname: payload.blobPathname ?? "",
    blobUrl: payload.blobUrl,
  }
}

/** Background upload — errors are logged only. */
export function uploadPaymentEvidenceSlipInBackground(
  input: { file: Blob; receiptNo: string },
  fetchFn?: typeof fetch
): void {
  void uploadPaymentEvidenceSlip(input, fetchFn).then((result) => {
    if (!result.ok) {
      console.error("Payment evidence upload failed:", result.error, result.code)
    }
  })
}
