/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReceiptLayoutSetupPanel } from "@/components/admin/ReceiptLayoutSetupPanel"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"

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

function renderPanel(initialLayout = DEFAULT_THERMAL_LAYOUTS.RECEIPT) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(
      <ReceiptLayoutSetupPanel initialLayout={initialLayout} onSaved={() => {}} />
    )
  })
  return { container, root }
}

async function renderPanelReady(initialLayout = DEFAULT_THERMAL_LAYOUTS.RECEIPT) {
  const result = renderPanel(initialLayout)
  await act(async () => {
    await Promise.resolve()
  })
  return result
}

describe("ReceiptLayoutSetupPanel", () => {
  it("renders Header, Sub-header, and Footer editors without tax checkboxes", async () => {
    const { container, root } = await renderPanelReady()
    const html = container.innerHTML

    expect(container.querySelector('[data-testid="receipt-block-editor-header"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="receipt-block-editor-sub-header"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="receipt-block-editor-footer"]')).toBeTruthy()

    expect(container.querySelector('[data-testid="receipt-block-textarea-sub-header"]')).toBeTruthy()

    expect(html).not.toContain("Show abbreviated tax title")
    expect(html).not.toContain("Show ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว")
    expect(container.querySelector('input[type="checkbox"]')).toBeNull()

    const footerTextarea = container.querySelector(
      '[data-testid="receipt-block-textarea-footer"]'
    ) as HTMLTextAreaElement
    expect(footerTextarea.rows).toBe(4)

    const headerTextarea = container.querySelector(
      '[data-testid="receipt-block-textarea-header"]'
    ) as HTMLTextAreaElement
    expect(headerTextarea.rows).toBe(2)

    act(() => root.unmount())
  })

  it("renders sub-header preview text and font size changes", async () => {
    const layout = {
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      subHeaderBlockText: "TAX INVOICE (ABB)",
      subHeaderFontSize: 15,
      subHeaderBlockBold: false,
      showAbbreviatedTaxTitle: false,
    }
    const { container, root } = await renderPanelReady(layout)

    const subHeaderPreview = container.querySelector(
      "[data-testid='thermal-ticket-subheader']"
    ) as HTMLElement
    expect(subHeaderPreview).toBeTruthy()
    expect(subHeaderPreview.textContent).toContain("TAX INVOICE (ABB)")
    expect(subHeaderPreview.style.fontSize).toBe("15px")

    const increaseBtn = container.querySelector(
      '[data-testid="receipt-block-font-increase-sub-header"]'
    ) as HTMLButtonElement
    act(() => {
      increaseBtn.click()
    })

    const updatedPreview = container.querySelector(
      "[data-testid='thermal-ticket-subheader']"
    ) as HTMLElement
    expect(updatedPreview.style.fontSize).toBe("16px")

    act(() => root.unmount())
  })

  it("shows sub-header in preview and skips empty sub-header block", async () => {
    const layout = {
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      subHeaderBlockText: null,
      showAbbreviatedTaxTitle: false,
    }
    const { container, root } = await renderPanelReady(layout)

    expect(
      container.querySelector("[data-testid='thermal-ticket-subheader']")
    ).toBeNull()

    act(() => root.unmount())
  })

  it("renders info block editor and updates identity/ref-staff preview typography", async () => {
    const layout = {
      ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
      infoBlockFontSize: 14,
      infoBlockBold: true,
    }
    const { container, root } = await renderPanelReady(layout)

    expect(container.querySelector('[data-testid="receipt-block-editor-info-block"]')).toBeTruthy()

    const identity = container.querySelector(
      "[data-testid='receipt-slip-identity']"
    ) as HTMLElement
    const refStaff = container.querySelector(
      "[data-testid='receipt-slip-ref-staff']"
    ) as HTMLElement
    expect(identity.style.fontSize).toBe("14px")
    expect(refStaff.style.fontSize).toBe("14px")

    const increaseBtn = container.querySelector(
      '[data-testid="receipt-block-font-increase-info-block"]'
    ) as HTMLButtonElement
    act(() => {
      increaseBtn.click()
    })

    const updatedIdentity = container.querySelector(
      "[data-testid='receipt-slip-identity']"
    ) as HTMLElement
    expect(updatedIdentity.style.fontSize).toBe("15px")

    const refRow = refStaff.querySelector(".receipt-slip-ref-staff-row") as HTMLElement
    expect(refStaff.textContent).toContain("Ref.")
    expect(refStaff.textContent).toContain("REC-SH001-202606-0001")
    expect(refStaff.textContent).toContain("Staff")
    expect(refStaff.textContent).toContain("103-Somsak")
    expect(refRow?.querySelector(".text-left")?.textContent).toContain("Ref.")
    expect(refRow?.querySelector(".text-right")?.textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/)

    act(() => root.unmount())
  })
})
