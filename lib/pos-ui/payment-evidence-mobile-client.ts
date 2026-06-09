export type PaymentEvidenceMobileMetaResult =
  | {
      ok: true
      receiptNo: string
      branchCode: string
      branchName: string
      amount: string
      expiresAt: string
      status: string
    }
  | { ok: false; status: number; error: string; code?: string }

export type UploadPaymentEvidenceMobileResult =
  | {
      ok: true
      evidenceId: string
      receiptNo: string
      status: string
      blobPathname: string
      blobUrl: string
    }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchMobileEvidenceMeta(
  token: string,
  fetchFn: typeof fetch = fetch
): Promise<PaymentEvidenceMobileMetaResult> {
  const trimmed = token.trim()
  if (!trimmed) {
    return { ok: false, status: 400, error: "token is required", code: "INVALID_TOKEN" }
  }

  const res = await fetchFn(
    `/api/payment-evidence/mobile/meta?token=${encodeURIComponent(trimmed)}`,
    { cache: "no-store" }
  )

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: string
    receiptNo?: string
    branchCode?: string
    branchName?: string
    amount?: string
    expiresAt?: string
    status?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Failed to load upload details",
      code: payload.code,
    }
  }

  if (!payload.receiptNo || !payload.branchName || !payload.amount) {
    return {
      ok: false,
      status: 500,
      error: "Invalid upload details response",
      code: "INVALID_RESPONSE",
    }
  }

  return {
    ok: true,
    receiptNo: payload.receiptNo,
    branchCode: payload.branchCode ?? "",
    branchName: payload.branchName,
    amount: payload.amount,
    expiresAt: payload.expiresAt ?? "",
    status: payload.status ?? "PENDING",
  }
}

export async function uploadPaymentEvidenceMobile(
  input: { token: string; file: Blob; fileName?: string },
  fetchFn: typeof fetch = fetch
): Promise<UploadPaymentEvidenceMobileResult> {
  const token = input.token.trim()
  if (!token) {
    return { ok: false, status: 400, error: "token is required", code: "INVALID_TOKEN" }
  }

  const fd = new FormData()
  fd.set("token", token)
  fd.set("file", input.file, input.fileName ?? "slip.jpg")

  const res = await fetchFn("/api/payment-evidence/mobile/upload", {
    method: "POST",
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
    return {
      ok: false,
      status: 500,
      error: "Invalid upload response",
      code: "INVALID_RESPONSE",
    }
  }

  return {
    ok: true,
    evidenceId: payload.evidenceId,
    receiptNo: payload.receiptNo ?? "",
    status: payload.status ?? "UPLOADED",
    blobPathname: payload.blobPathname ?? "",
    blobUrl: payload.blobUrl,
  }
}

/** @deprecated Use fetchMobileEvidenceMeta */
export const fetchPaymentEvidenceMobileMeta = fetchMobileEvidenceMeta
