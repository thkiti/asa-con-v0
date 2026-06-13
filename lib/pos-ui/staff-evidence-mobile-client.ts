import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"

export type MintStaffEvidenceMobileLinkResult =
  | {
      ok: true
      uploadUrl: string
      token: string
      expiresAt: string
      kind: StaffEvidenceFileKind
      staffId: string
    }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchStaffEvidenceMobileLink(
  input: { kind: StaffEvidenceFileKind },
  fetchFn: typeof fetch = fetch
): Promise<MintStaffEvidenceMobileLinkResult> {
  const res = await fetchFn("/api/pos/staff-evidence/mobile-link", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: input.kind }),
  })

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: string
    uploadUrl?: string
    token?: string
    expiresAt?: string
    kind?: StaffEvidenceFileKind
    staffId?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Failed to create mobile upload link",
      code: payload.code,
    }
  }

  if (!payload.uploadUrl || !payload.token || !payload.expiresAt || !payload.kind) {
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
    token: payload.token,
    expiresAt: payload.expiresAt,
    kind: payload.kind,
    staffId: payload.staffId ?? "",
  }
}

export type StaffEvidenceMobileStatusResult =
  | {
      ok: true
      ready: boolean
      blobUrl: string | null
      kind: StaffEvidenceFileKind
      staffId: string
    }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchStaffEvidenceMobileStatus(
  token: string,
  fetchFn: typeof fetch = fetch
): Promise<StaffEvidenceMobileStatusResult> {
  const res = await fetchFn(
    `/api/pos/staff-evidence/mobile-status?token=${encodeURIComponent(token)}`,
    { credentials: "include", cache: "no-store" }
  )

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string
    code?: string
    ready?: boolean
    blobUrl?: string | null
    kind?: StaffEvidenceFileKind
    staffId?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Failed to check upload status",
      code: payload.code,
    }
  }

  return {
    ok: true,
    ready: Boolean(payload.ready),
    blobUrl: payload.blobUrl ?? null,
    kind: payload.kind ?? "ph",
    staffId: payload.staffId ?? "",
  }
}
