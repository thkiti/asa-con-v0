import { PosLookupError } from "./pos-errors"

export type StaffEvidenceFileKind = "ph" | "id"

const STAFF_EVIDENCE_PREFIX = "staff-evidence"

export { STAFF_EVIDENCE_PREFIX }

/** Safe staff login code for blob path segments (e.g. 103). */
export function assertSafeStaffEvidenceStaffId(staffId: string): string {
  const trimmed = String(staffId ?? "").trim()
  if (!trimmed || !/^[0-9A-Za-z_-]+$/.test(trimmed)) {
    throw new PosLookupError("Invalid staffId for evidence upload", "INVALID_STAFF_ID", 400)
  }
  return trimmed
}

export function buildStaffEvidenceBlobPath(
  staffId: string,
  kind: StaffEvidenceFileKind
): string {
  const safeStaffId = assertSafeStaffEvidenceStaffId(staffId)
  return `${STAFF_EVIDENCE_PREFIX}/${safeStaffId}-${kind}.jpg`
}

const STAFF_EVIDENCE_CAPTURE_PREFIX = "staff-evidence-capture"

/** Temporary staging path for mobile/QR capture before final submit. */
export function buildStaffEvidenceCaptureBlobPath(
  captureId: string,
  kind: StaffEvidenceFileKind
): string {
  const safeCaptureId = String(captureId ?? "").trim()
  if (!safeCaptureId || !/^[0-9A-Za-z_-]+$/.test(safeCaptureId)) {
    throw new PosLookupError("Invalid capture id", "INVALID_CAPTURE_ID", 400)
  }
  return `${STAFF_EVIDENCE_CAPTURE_PREFIX}/${safeCaptureId}-${kind}.jpg`
}
