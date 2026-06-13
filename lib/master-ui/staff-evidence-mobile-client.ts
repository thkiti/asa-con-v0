import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"

export type MasterStaffEvidenceMobileLinkResult =
  | {
      ok: true
      uploadUrl: string
      token: string
      expiresAt: string
      kind: StaffEvidenceFileKind
      staffId: string
    }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchMasterStaffEvidenceMobileLink(
  staffRowId: string,
  input: { kind: StaffEvidenceFileKind },
  fetchFn: typeof fetch = fetch
): Promise<MasterStaffEvidenceMobileLinkResult> {
  const res = await fetchFn(
    `/api/master/staff/${encodeURIComponent(staffRowId)}/evidence/mobile-link`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: input.kind }),
    }
  )

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
      code: "MASTER_ERROR",
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

export type MasterStaffEvidenceMobileStatusResult =
  | {
      ok: true
      ready: boolean
      blobUrl: string | null
      kind: StaffEvidenceFileKind
      staffId: string
    }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchMasterStaffEvidenceMobileStatus(
  staffRowId: string,
  token: string,
  fetchFn: typeof fetch = fetch
): Promise<MasterStaffEvidenceMobileStatusResult> {
  const res = await fetchFn(
    `/api/master/staff/${encodeURIComponent(staffRowId)}/evidence/mobile-status?token=${encodeURIComponent(token)}`,
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
