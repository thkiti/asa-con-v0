import {
  buildPaymentEvidenceMobileUploadUrl,
  mintPaymentEvidenceMobileUploadToken,
  resolvePaymentEvidenceMobileUploadBaseUrl,
  signPaymentEvidenceUploadToken,
  verifyPaymentEvidenceUploadToken,
} from "@/lib/pos/payment-evidence-upload-token"
import { PaymentEvidenceStatus, PaymentMethod } from "@/generated/prisma/client"

const TEST_SECRET = "test-upload-secret"

describe("payment-evidence-upload-token", () => {
  const originalSecret = process.env.PAYMENT_EVIDENCE_UPLOAD_SECRET
  const originalTtl = process.env.PAYMENT_EVIDENCE_UPLOAD_TTL_SECONDS
  const originalPosBaseUrl = process.env.NEXT_PUBLIC_POS_BASE_URL

  beforeEach(() => {
    process.env.PAYMENT_EVIDENCE_UPLOAD_SECRET = TEST_SECRET
    delete process.env.PAYMENT_EVIDENCE_UPLOAD_TTL_SECONDS
    delete process.env.NEXT_PUBLIC_POS_BASE_URL
  })

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.PAYMENT_EVIDENCE_UPLOAD_SECRET
    } else {
      process.env.PAYMENT_EVIDENCE_UPLOAD_SECRET = originalSecret
    }
    if (originalTtl === undefined) {
      delete process.env.PAYMENT_EVIDENCE_UPLOAD_TTL_SECONDS
    } else {
      process.env.PAYMENT_EVIDENCE_UPLOAD_TTL_SECONDS = originalTtl
    }
    if (originalPosBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_POS_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_POS_BASE_URL = originalPosBaseUrl
    }
  })

  it("signs and verifies a token", () => {
    const exp = Date.now() + 60_000
    const token = signPaymentEvidenceUploadToken({
      evidenceId: "ev-1",
      branchId: "branch-1",
      branchCode: "sh001",
      receiptNo: "rec-sh001-202606-0001",
      exp,
    })

    const claims = verifyPaymentEvidenceUploadToken(token)
    expect(claims).toEqual({
      evidenceId: "ev-1",
      branchId: "branch-1",
      branchCode: "SH001",
      receiptNo: "REC-SH001-202606-0001",
      exp,
    })
  })

  it("rejects tampered tokens", () => {
    const token = signPaymentEvidenceUploadToken({
      evidenceId: "ev-1",
      branchId: "branch-1",
      branchCode: "SH001",
      receiptNo: "REC-SH001-202606-0001",
      exp: Date.now() + 60_000,
    })

    const tampered = `${token}x`
    expect(() => verifyPaymentEvidenceUploadToken(tampered)).toThrow(
      expect.objectContaining({ code: "INVALID_TOKEN" })
    )
  })

  it("rejects expired tokens", () => {
    const token = signPaymentEvidenceUploadToken({
      evidenceId: "ev-1",
      branchId: "branch-1",
      branchCode: "SH001",
      receiptNo: "REC-SH001-202606-0001",
      exp: Date.now() - 1,
    })

    expect(() => verifyPaymentEvidenceUploadToken(token)).toThrow(
      expect.objectContaining({ code: "TOKEN_EXPIRED" })
    )
  })

  it("prefers NEXT_PUBLIC_POS_BASE_URL over request origin", () => {
    process.env.NEXT_PUBLIC_POS_BASE_URL = "http://10.0.1.138:3000"
    const token = "abc.def"
    const url = buildPaymentEvidenceMobileUploadUrl(
      "http://localhost:3000/api/pos/payment-evidence/mobile-link",
      token
    )
    expect(url).toBe(
      "http://10.0.1.138:3000/payment-evidence/mobile/abc.def"
    )
  })

  it("rejects localhost request origin when POS base URL is not configured", () => {
    expect(() =>
      resolvePaymentEvidenceMobileUploadBaseUrl(
        "http://localhost:3000/api/pos/payment-evidence/mobile-link"
      )
    ).toThrow(expect.objectContaining({ code: "POS_BASE_URL_REQUIRED" }))
  })

  it("allows explicit localhost in NEXT_PUBLIC_POS_BASE_URL", () => {
    process.env.NEXT_PUBLIC_POS_BASE_URL = "http://localhost:3000"
    expect(
      resolvePaymentEvidenceMobileUploadBaseUrl(
        "http://127.0.0.1:3000/api/pos/payment-evidence/mobile-link"
      )
    ).toBe("http://localhost:3000")
  })

  it("builds mobile upload URL from non-local request origin", () => {
    const token = "abc.def"
    const url = buildPaymentEvidenceMobileUploadUrl(
      "https://shop.example.com/api/pos/payment-evidence/mobile-link",
      token
    )
    expect(url).toBe(
      "https://shop.example.com/payment-evidence/mobile/abc.def"
    )
  })

  it("mints token for pending evidence", async () => {
    const db = {
      paymentEvidence: {
        findFirst: jest.fn().mockResolvedValue({ id: "ev-1" }),
      },
    }

    const result = await mintPaymentEvidenceMobileUploadToken(db as never, {
      branchId: "branch-1",
      branchCode: "SH001",
      receiptNo: "REC-SH001-202606-0001",
    })

    expect(result.token).toContain(".")
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it("rejects mint when pending evidence is missing", async () => {
    const db = {
      paymentEvidence: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    }

    await expect(
      mintPaymentEvidenceMobileUploadToken(db as never, {
        branchId: "branch-1",
        branchCode: "SH001",
        receiptNo: "REC-SH001-202606-0001",
      })
    ).rejects.toMatchObject({ code: "EVIDENCE_NOT_FOUND" })
  })
})
