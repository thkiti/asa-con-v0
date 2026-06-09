import { createHmac, timingSafeEqual } from "crypto"
import {
  PaymentEvidenceStatus,
  PaymentMethod,
  SaleStatus,
  type PrismaClient,
} from "@/generated/prisma/client"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { toDec } from "@/lib/stock/decimal"

const DEFAULT_TTL_SECONDS = 30 * 60

export type PaymentEvidenceUploadTokenClaims = {
  evidenceId: string
  branchId: string
  branchCode: string
  receiptNo: string
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

export function getPaymentEvidenceUploadTokenSecret(): string {
  const secret = process.env.PAYMENT_EVIDENCE_UPLOAD_SECRET?.trim()
  if (!secret) {
    throw new PosLookupError(
      "Mobile upload is not configured",
      "UPLOAD_TOKEN_SECRET_MISSING",
      503
    )
  }
  return secret
}

export function getPaymentEvidenceUploadTokenTtlMs(): number {
  const raw = process.env.PAYMENT_EVIDENCE_UPLOAD_TTL_SECONDS?.trim()
  const seconds = raw ? Number(raw) : DEFAULT_TTL_SECONDS
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return DEFAULT_TTL_SECONDS * 1000
  }
  return Math.floor(seconds * 1000)
}

export function signPaymentEvidenceUploadToken(
  claims: Omit<PaymentEvidenceUploadTokenClaims, "exp"> & { exp?: number }
): string {
  const secret = getPaymentEvidenceUploadTokenSecret()
  const payload: PaymentEvidenceUploadTokenClaims = {
    evidenceId: claims.evidenceId.trim(),
    branchId: claims.branchId.trim(),
    branchCode: claims.branchCode.trim().toUpperCase(),
    receiptNo: claims.receiptNo.trim().toUpperCase(),
    exp: claims.exp ?? Date.now() + getPaymentEvidenceUploadTokenTtlMs(),
  }

  if (
    !payload.evidenceId ||
    !payload.branchId ||
    !payload.branchCode ||
    !payload.receiptNo
  ) {
    throw new PosLookupError("Invalid upload token claims", "INVALID_INPUT", 400)
  }

  const payloadJson = JSON.stringify(payload)
  const payloadPart = base64UrlEncode(payloadJson)
  const sig = createHmac("sha256", secret).update(payloadJson).digest()
  const sigPart = base64UrlEncode(sig)
  return `${payloadPart}.${sigPart}`
}

export function verifyPaymentEvidenceUploadToken(
  token: string
): PaymentEvidenceUploadTokenClaims {
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

  let parsed: PaymentEvidenceUploadTokenClaims
  try {
    parsed = JSON.parse(payloadJson) as PaymentEvidenceUploadTokenClaims
  } catch {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  if (
    !parsed?.evidenceId ||
    !parsed?.branchId ||
    !parsed?.branchCode ||
    !parsed?.receiptNo ||
    typeof parsed.exp !== "number"
  ) {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  if (Date.now() > parsed.exp) {
    throw new PosLookupError("Upload link has expired", "TOKEN_EXPIRED", 410)
  }

  return {
    evidenceId: String(parsed.evidenceId).trim(),
    branchId: String(parsed.branchId).trim(),
    branchCode: String(parsed.branchCode).trim().toUpperCase(),
    receiptNo: String(parsed.receiptNo).trim().toUpperCase(),
    exp: parsed.exp,
  }
}

function isLocalhostHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase()
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "[::1]" ||
    normalized === "::1"
  )
}

export function resolvePaymentEvidenceMobileUploadBaseUrl(
  requestUrl: string
): string {
  const configured = process.env.NEXT_PUBLIC_POS_BASE_URL?.trim()
  if (configured) {
    return configured.replace(/\/+$/, "")
  }

  const requestOrigin = new URL(requestUrl)
  if (isLocalhostHostname(requestOrigin.hostname)) {
    throw new PosLookupError(
      "Set NEXT_PUBLIC_POS_BASE_URL to a phone-reachable shop URL for mobile upload",
      "POS_BASE_URL_REQUIRED",
      503
    )
  }

  return requestOrigin.origin
}

export function buildPaymentEvidenceMobileUploadUrl(
  requestUrl: string,
  token: string
): string {
  const base = resolvePaymentEvidenceMobileUploadBaseUrl(requestUrl)
  return new URL(
    `/payment-evidence/mobile/${encodeURIComponent(token)}`,
    `${base}/`
  ).toString()
}

export type PaymentEvidenceMobileMeta = {
  receiptNo: string
  branchCode: string
  branchName: string
  amount: string
  expiresAt: string
  status: PaymentEvidenceStatus
}

export type PaymentEvidenceTokenDb = Pick<
  PrismaClient,
  "paymentEvidence" | "branch"
>

export async function loadPaymentEvidenceMobileMeta(
  db: PaymentEvidenceTokenDb,
  token: string
): Promise<PaymentEvidenceMobileMeta> {
  const claims = verifyPaymentEvidenceUploadToken(token)

  const evidence = await db.paymentEvidence.findFirst({
    where: {
      id: claims.evidenceId,
      branchId: claims.branchId,
      receiptNo: claims.receiptNo,
      sale: { status: SaleStatus.COMPLETED },
      payment: { method: PaymentMethod.BANK_TRANSFER },
    },
    include: {
      sale: { select: { total: true } },
    },
  })

  if (!evidence) {
    throw new PosLookupError("Payment evidence not found", "EVIDENCE_NOT_FOUND", 404)
  }

  if (evidence.status === PaymentEvidenceStatus.UPLOADED) {
    throw new PosLookupError(
      "Payment evidence already uploaded",
      "EVIDENCE_ALREADY_UPLOADED",
      409
    )
  }

  if (evidence.status !== PaymentEvidenceStatus.PENDING) {
    throw new PosLookupError("Upload not available", "EVIDENCE_NOT_PENDING", 409)
  }

  const branch = await db.branch.findUnique({
    where: { id: claims.branchId },
    select: { code: true, name: true },
  })

  if (!branch) {
    throw new PosLookupError("Payment evidence not found", "EVIDENCE_NOT_FOUND", 404)
  }

  if (branch.code.trim().toUpperCase() !== claims.branchCode) {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  return {
    receiptNo: evidence.receiptNo,
    branchCode: branch.code,
    branchName: branch.name,
    amount: toDec(evidence.sale.total).toFixed(2),
    expiresAt: new Date(claims.exp).toISOString(),
    status: evidence.status,
  }
}

export type MintPaymentEvidenceMobileLinkDb = Pick<
  PrismaClient,
  "paymentEvidence"
>

export async function mintPaymentEvidenceMobileUploadToken(
  db: MintPaymentEvidenceMobileLinkDb,
  input: { branchId: string; branchCode: string; receiptNo: string }
): Promise<{ token: string; expiresAt: string }> {
  const branchId = String(input.branchId ?? "").trim()
  const branchCode = String(input.branchCode ?? "").trim().toUpperCase()
  const receiptNo = String(input.receiptNo ?? "").trim().toUpperCase()

  if (!branchId || !branchCode || !receiptNo) {
    throw new PosLookupError(
      "branchId, branchCode, and receiptNo are required",
      "INVALID_INPUT",
      400
    )
  }

  const evidence = await db.paymentEvidence.findFirst({
    where: {
      branchId,
      receiptNo,
      status: PaymentEvidenceStatus.PENDING,
      sale: { status: SaleStatus.COMPLETED },
      payment: { method: PaymentMethod.BANK_TRANSFER },
    },
    select: { id: true },
  })

  if (!evidence) {
    throw new PosLookupError(
      "Pending payment evidence not found",
      "EVIDENCE_NOT_FOUND",
      404
    )
  }

  const exp = Date.now() + getPaymentEvidenceUploadTokenTtlMs()
  const token = signPaymentEvidenceUploadToken({
    evidenceId: evidence.id,
    branchId,
    branchCode,
    receiptNo,
    exp,
  })

  return {
    token,
    expiresAt: new Date(exp).toISOString(),
  }
}

export async function resolvePaymentEvidenceUploadFromToken(
  db: PaymentEvidenceTokenDb,
  token: string
): Promise<{
  branchId: string
  branchCode: string
  receiptNo: string
}> {
  const claims = verifyPaymentEvidenceUploadToken(token)

  const evidence = await db.paymentEvidence.findFirst({
    where: {
      id: claims.evidenceId,
      branchId: claims.branchId,
      receiptNo: claims.receiptNo,
      status: PaymentEvidenceStatus.PENDING,
      sale: { status: SaleStatus.COMPLETED },
      payment: { method: PaymentMethod.BANK_TRANSFER },
    },
    select: { id: true },
  })

  if (!evidence) {
    const uploaded = await db.paymentEvidence.findFirst({
      where: {
        id: claims.evidenceId,
        branchId: claims.branchId,
        receiptNo: claims.receiptNo,
        status: PaymentEvidenceStatus.UPLOADED,
      },
      select: { id: true },
    })
    if (uploaded) {
      throw new PosLookupError(
        "Payment evidence already uploaded",
        "EVIDENCE_ALREADY_UPLOADED",
        409
      )
    }
    throw new PosLookupError("Payment evidence not found", "EVIDENCE_NOT_FOUND", 404)
  }

  const branch = await db.branch.findUnique({
    where: { id: claims.branchId },
    select: { code: true },
  })

  if (!branch || branch.code.trim().toUpperCase() !== claims.branchCode) {
    throw new PosLookupError("Invalid upload link", "INVALID_TOKEN", 404)
  }

  return {
    branchId: claims.branchId,
    branchCode: claims.branchCode,
    receiptNo: claims.receiptNo,
  }
}
