import { createHmac, randomUUID, timingSafeEqual } from "crypto"
import {
  getPaymentEvidenceUploadTokenSecret,
  getPaymentEvidenceUploadTokenTtlMs,
  resolvePaymentEvidenceMobileUploadBaseUrl,
} from "@/lib/pos/payment-evidence-upload-token"
import { PosLookupError } from "@/lib/pos/pos-errors"
import {
  assertSafeStaffEvidenceStaffId,
  buildStaffEvidenceCaptureBlobPath,
  type StaffEvidenceFileKind,
} from "@/lib/pos/staff-evidence-blob"

export type StaffEvidenceCaptureTokenClaims = {
  captureId: string
  staffId: string
  kind: StaffEvidenceFileKind
  exp: number
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function base64UrlDecode(value: string): Buffer {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4)
  return Buffer.from(padded, "base64")
}

export function signStaffEvidenceCaptureToken(
  claims: Omit<StaffEvidenceCaptureTokenClaims, "exp"> & { exp?: number }
): string {
  const secret = getPaymentEvidenceUploadTokenSecret()
  const staffId = assertSafeStaffEvidenceStaffId(claims.staffId)
  const captureId = String(claims.captureId ?? "").trim()
  const kind = claims.kind
  if (!captureId || (kind !== "ph" && kind !== "id")) {
    throw new PosLookupError("Invalid capture token claims", "INVALID_INPUT", 400)
  }

  const payload: StaffEvidenceCaptureTokenClaims = {
    captureId,
    staffId,
    kind,
    exp: claims.exp ?? Date.now() + getPaymentEvidenceUploadTokenTtlMs(),
  }

  const payloadJson = JSON.stringify(payload)
  const payloadPart = base64UrlEncode(payloadJson)
  const sig = createHmac("sha256", secret).update(payloadJson).digest()
  const sigPart = base64UrlEncode(sig)
  return `${payloadPart}.${sigPart}`
}

export function verifyStaffEvidenceCaptureToken(token: string): StaffEvidenceCaptureTokenClaims {
  const raw = String(token ?? "").trim()
  const dot = raw.indexOf(".")
  if (dot <= 0) {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  const payloadPart = raw.slice(0, dot)
  const sigPart = raw.slice(dot + 1)
  if (!payloadPart || !sigPart) {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  let payloadJson: string
  try {
    payloadJson = base64UrlDecode(payloadPart).toString("utf8")
  } catch {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  const secret = getPaymentEvidenceUploadTokenSecret()
  const expectedSig = createHmac("sha256", secret).update(payloadJson).digest()
  let actualSig: Buffer
  try {
    actualSig = base64UrlDecode(sigPart)
  } catch {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  if (
    expectedSig.length !== actualSig.length ||
    !timingSafeEqual(expectedSig, actualSig)
  ) {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  let parsed: StaffEvidenceCaptureTokenClaims
  try {
    parsed = JSON.parse(payloadJson) as StaffEvidenceCaptureTokenClaims
  } catch {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  if (
    !parsed?.captureId ||
    !parsed?.staffId ||
    (parsed.kind !== "ph" && parsed.kind !== "id") ||
    typeof parsed.exp !== "number"
  ) {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  if (Date.now() > parsed.exp) {
    throw new PosLookupError("Upload link has expired", "TOKEN_EXPIRED", 410)
  }

  return {
    captureId: String(parsed.captureId).trim(),
    staffId: assertSafeStaffEvidenceStaffId(parsed.staffId),
    kind: parsed.kind,
    exp: parsed.exp,
  }
}

export function mintStaffEvidenceCaptureToken(input: {
  staffId: string
  kind: StaffEvidenceFileKind
}): { token: string; captureId: string; expiresAt: string } {
  const captureId = randomUUID().replace(/-/g, "")
  const exp = Date.now() + getPaymentEvidenceUploadTokenTtlMs()
  const token = signStaffEvidenceCaptureToken({
    captureId,
    staffId: input.staffId,
    kind: input.kind,
    exp,
  })
  return { token, captureId, expiresAt: new Date(exp).toISOString() }
}

export function buildStaffEvidenceCaptureBlobPathForToken(
  claims: StaffEvidenceCaptureTokenClaims
): string {
  return buildStaffEvidenceCaptureBlobPath(claims.captureId, claims.kind)
}

export function buildStaffEvidenceMobileUploadUrl(
  requestUrl: string,
  token: string
): string {
  const base = resolvePaymentEvidenceMobileUploadBaseUrl(requestUrl)
  return new URL(
    `/staff-evidence/mobile/${encodeURIComponent(token)}`,
    `${base}/`
  ).toString()
}

export type StaffEvidenceCaptureMobileMeta = {
  staffId: string
  kind: StaffEvidenceFileKind
  expiresAt: string
  label: string
}

export function staffEvidenceCaptureMobileLabel(kind: StaffEvidenceFileKind): string {
  return kind === "ph" ? "Staff Photo" : "ID Card"
}

export function loadStaffEvidenceCaptureMobileMeta(
  token: string
): StaffEvidenceCaptureMobileMeta {
  const claims = verifyStaffEvidenceCaptureToken(token)
  return {
    staffId: claims.staffId,
    kind: claims.kind,
    expiresAt: new Date(claims.exp).toISOString(),
    label: staffEvidenceCaptureMobileLabel(claims.kind),
  }
}
