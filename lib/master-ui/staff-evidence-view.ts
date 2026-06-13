import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"

export type StaffEvidenceUrlTimestamps = {
  photoUpdatedAt?: string | null
  idCardUpdatedAt?: string | null
}

export function staffEvidenceUpdatedAtForKind(
  detail: StaffEvidenceUrlTimestamps,
  kind: StaffEvidenceFileKind
): string | null {
  const raw = kind === "ph" ? detail.photoUpdatedAt : detail.idCardUpdatedAt
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Append ?v= cache buster from blob updatedAt and optional client nonce. */
export function staffEvidenceCacheBustUrl(
  url: string | null | undefined,
  updatedAt: string | null | undefined,
  cacheNonce = 0
): string | null {
  if (typeof url !== "string") return null
  const trimmed = url.trim()
  if (!trimmed.length) return null

  let version: string | number = cacheNonce > 0 ? cacheNonce : Date.now()
  if (typeof updatedAt === "string" && updatedAt.trim()) {
    const ts = new Date(updatedAt).getTime()
    if (!Number.isNaN(ts)) {
      version = cacheNonce > 0 ? `${ts}-${cacheNonce}` : ts
    }
  }

  const join = trimmed.includes("?") ? "&" : "?"
  return `${trimmed}${join}v=${encodeURIComponent(String(version))}`
}
