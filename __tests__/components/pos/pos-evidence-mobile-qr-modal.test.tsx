/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { PosEvidenceMobileQrModal } from "@/components/pos/PosEvidenceMobileQrModal"

jest.mock("@/lib/pos-ui/payment-evidence-mobile-link-client", () => ({
  fetchPaymentEvidenceMobileLink: jest.fn(async () => ({
    ok: true,
    uploadUrl: "http://localhost/payment-evidence/mobile/signed.token",
    expiresAt: "2026-06-09T12:00:00.000Z",
    receiptNo: "REC-SH001-202606-0001",
  })),
}))

jest.mock("react-qr-code", () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => (
    <div data-testid="mock-qr-code">{value}</div>
  ),
}))

describe("PosEvidenceMobileQrModal", () => {
  it("renders receipt, shop, and amount above QR area", () => {
    const html = renderToStaticMarkup(
      <PosEvidenceMobileQrModal
        row={{
          evidenceId: "ev-1",
          saleId: "sale-1",
          receiptNo: "REC-SH001-202606-0001",
          issuedAt: "2026-06-05T03:00:00.000Z",
          total: "250.00",
          staff: "101-Ann",
        }}
        branchCode="SH001"
        branchName="Chidlom"
        onClose={() => {}}
      />
    )

    expect(html).toContain('data-testid="pos-evidence-mobile-qr-modal"')
    expect(html).toContain('data-testid="pos-evidence-mobile-qr-details"')
    expect(html).toContain("REC-SH001-202606-0001")
    expect(html).toContain("SH001")
    expect(html).toContain("Chidlom")
    expect(html).toContain("250.00")
    expect(html).toContain("Preparing upload link")
  })
})
