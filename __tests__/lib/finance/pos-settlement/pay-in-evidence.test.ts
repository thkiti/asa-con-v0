import { PaymentEvidenceStatus } from "@/generated/prisma/client"
import {
  buildPayInEvidenceSummary,
  isPayInEvidenceUploaded,
} from "@/lib/finance/pos-settlement/pay-in-evidence"

describe("pay-in evidence summary", () => {
  it("marks missing slip warning for posted deposit without uploaded evidence", () => {
    const summary = buildPayInEvidenceSummary({
      evidence: null,
      depositPosted: true,
    })

    expect(summary.payInSlipMissingWarning).toBe(true)
    expect(summary.payInEvidenceUrl).toBeNull()
  })

  it("returns evidence url when slip uploaded", () => {
    const summary = buildPayInEvidenceSummary({
      evidence: {
        id: "evidence-1",
        collectorReportId: "collector-report-1",
        collectNo: "COL-SH001-202606-0001",
        branchId: "branch-1",
        status: PaymentEvidenceStatus.UPLOADED,
        blobPathname: "finance/pos-settlement/pay-in/collector-report-1.jpg",
        blobUrl: "https://example.test/pay-in.jpg",
        mimeType: "image/jpeg",
        byteSize: 1024,
        originalFilename: "slip.jpg",
        uploadedAt: new Date(),
        uploadedByStaffId: "staff-1",
        bankDepositDate: null,
        bankAccountCode: "1021",
        bankDepositVoucherId: null,
      },
      depositPosted: false,
    })

    expect(summary.payInSlipMissingWarning).toBe(false)
    expect(summary.payInEvidenceUrl).toBe("https://example.test/pay-in.jpg")
    expect(isPayInEvidenceUploaded({ status: PaymentEvidenceStatus.UPLOADED })).toBe(
      true
    )
  })
})

describe("buildPayInSlipBlobPath", () => {
  it("uses finance/pos-settlement/pay-in prefix", async () => {
    const { buildPayInSlipBlobPath } = await import(
      "@/lib/finance/pos-settlement/pay-in-evidence-blob"
    )
    expect(
      buildPayInSlipBlobPath("550e8400-e29b-41d4-a716-446655440000")
    ).toBe("finance/pos-settlement/pay-in/550e8400-e29b-41d4-a716-446655440000.jpg")
  })
})
