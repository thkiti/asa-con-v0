/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { PosEvidencePendingOverlay } from "@/components/pos/PosEvidencePendingOverlay"

describe("PosEvidencePendingOverlay", () => {
  it("renders pending receipt rows with upload controls", () => {
    const html = renderToStaticMarkup(
      <PosEvidencePendingOverlay
        receipts={[
          {
            evidenceId: "ev-1",
            saleId: "sale-1",
            receiptNo: "REC-SH001-202606-0001",
            issuedAt: "2026-06-05T03:00:00.000Z",
            total: "250.00",
            staff: "101-Ann",
          },
        ]}
        loading={false}
        error={null}
        branchCode="SH001"
        branchName="Chidlom"
        onClose={() => {}}
        onUploadSuccess={() => {}}
      />
    )

    expect(html).toContain('data-testid="pos-evidence-pending-overlay"')
    expect(html).toContain('data-testid="pos-evidence-pending-table"')
    expect(html).toContain("REC-SH001-202606-0001")
    expect(html).toContain("101-Ann")
    expect(html).toContain('accept="image/*"')
    expect(html).toContain("Mobile Upload")
    expect(html).toContain("Upload from PC")
    expect(html).toContain('data-testid="pos-evidence-pending-mobile-upload"')
    expect(html).toContain('data-testid="pos-evidence-pending-pc-upload"')
  })

  it("shows loading state", () => {
    const html = renderToStaticMarkup(
      <PosEvidencePendingOverlay
        receipts={[]}
        loading
        error={null}
        branchCode="SH001"
        branchName="Chidlom"
        onClose={() => {}}
        onUploadSuccess={() => {}}
      />
    )
    expect(html).toContain("Loading pending receipts")
  })
})
