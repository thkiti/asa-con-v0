/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReceiptSetupPrintSampleButton } from "@/components/admin/ReceiptSetupPrintSampleButton"
import { printThermalSlipClone } from "@/lib/thermal/print-dom"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

jest.mock("@/lib/thermal/print-dom", () => ({
  printThermalSlipClone: jest.fn(() => true),
  thermalPrintSourceSelector: (kind: string) => `[data-thermal-print-source="${kind}"]`,
}))

describe("ReceiptSetupPrintSampleButton", () => {
  it("prints sample slip via thermal clone", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <ReceiptSetupPrintSampleButton
          kind="receipt-setup-receipt"
          sampleSlip={<div data-testid="sample-slip">HEADER Sample line</div>}
        />
      )
    })

    const button = container.querySelector(
      '[data-testid="receipt-setup-print-sample-receipt-setup-receipt"]'
    ) as HTMLButtonElement
    expect(button).toBeTruthy()
    expect(button.disabled).toBe(false)

    act(() => {
      button.click()
    })

    expect(printThermalSlipClone).toHaveBeenCalledWith(
      '[data-thermal-print-source="receipt-setup-receipt"]'
    )

    act(() => root.unmount())
  })

  it("disables print when sample slip is missing", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <ReceiptSetupPrintSampleButton kind="receipt-setup-collector" sampleSlip={null} />
      )
    })

    const button = container.querySelector(
      '[data-testid="receipt-setup-print-sample-receipt-setup-collector"]'
    ) as HTMLButtonElement
    expect(button.disabled).toBe(true)

    act(() => root.unmount())
  })
})
