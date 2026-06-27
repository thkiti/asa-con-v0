/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { RefundLayoutSetupPanel } from "@/components/admin/RefundLayoutSetupPanel"
import { RefundSetupPreview } from "@/components/admin/RefundSetupPreview"
import {
  buildRefundSetupSampleContext,
  buildRefundSetupTicketLayout,
} from "@/lib/admin/refund-setup-preview"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

jest.mock("@/lib/admin-ui/receipt-setup-branches-client", () => ({
  fetchReceiptSetupBranches: jest.fn().mockResolvedValue({
    ok: true,
    branches: [
      {
        id: "b-sh001",
        code: "SH001",
        name: "Chidlom",
        phone: "02-111-2222",
        taxId: "MACHINE-001",
        type: "SH",
      },
    ],
    companyTaxId: "0123456789012",
  }),
}))

jest.mock("@/lib/admin-ui/thermal-layout-client", () => ({
  patchThermalDocumentLayout: jest.fn(),
}))

const sampleBranch = {
  id: "b-sh001",
  code: "SH001",
  name: "Chidlom",
  phone: "02-111-2222",
  taxId: "MACHINE-001",
  type: "SH" as const,
}

const sampleRefund: RefundReceiptPrintContext = buildRefundSetupSampleContext({
  branch: sampleBranch,
  companyTaxId: "0123456789012",
})

describe("RefundLayoutSetupPanel", () => {
  it("renders header/sub-header/footer editors and shop dropdown", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(
        <RefundLayoutSetupPanel
          initialLayout={DEFAULT_THERMAL_LAYOUTS.REFUND}
          receiptLayout={DEFAULT_THERMAL_LAYOUTS.RECEIPT}
          onSaved={() => {}}
        />
      )
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="receipt-block-editor-header"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="receipt-block-editor-sub-header"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="receipt-block-editor-footer"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="refund-setup-shop-select"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="refund-setup-preview"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="receipt-setup-print-sample-receipt-setup-refund"]')).toBeTruthy()

    act(() => root.unmount())
  })
})

describe("RefundSetupPreview", () => {
  it("shows refund-specific header when set, inherits receipt blocks when empty", () => {
    const receiptLayout = {
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      headerBlockText: "Receipt Header Alpha",
      subHeaderBlockText: "Receipt Sub Beta",
      footerBlockText: "Receipt Footer Gamma",
      showAbbreviatedTaxTitle: false,
    }
    const refundLayout = {
      ...DEFAULT_THERMAL_LAYOUTS.REFUND,
      headerBlockText: "Refund Header Only",
      subHeaderBlockText: null,
      footerBlockText: null,
    }

    const ticketLayout = buildRefundSetupTicketLayout({
      receiptLayout,
      refundLayout,
      refund: sampleRefund,
    })

    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<RefundSetupPreview layout={ticketLayout} />)
    })

    const html = container.textContent ?? ""
    expect(html).toContain("Refund Header Only")
    expect(html).not.toContain("Receipt Header Alpha")
    expect(html).toContain("Receipt Sub Beta")
    expect(html).toContain("Receipt Footer Gamma")
    expect(html).not.toContain("REFUND RECEIPT")
    expect(html).toContain("Ref. No.")
    expect(html).toContain("RF-SH001-202606-0001")
    expect(html).toContain("Original Receipt No.")
    expect(html).toContain("REASON:")
    expect(html).toContain("Phone No.")
    expect(html).toContain("Sign")

    const phoneIdx = html.indexOf("Phone No.")
    const footerIdx = html.indexOf("Receipt Footer Gamma")
    expect(footerIdx).toBeGreaterThan(-1)
    expect(phoneIdx).toBeGreaterThan(footerIdx)

    act(() => root.unmount())
  })
})
