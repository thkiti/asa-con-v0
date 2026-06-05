/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosKeypadGrid } from "@/components/pos/PosKeypadGrid"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

describe("PosKeypadGrid", () => {
  it("uses cursor-pointer on enabled keypad buttons", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosKeypadGrid onAction={() => {}} />)
    })

    const buttons = Array.from(container.querySelectorAll("button"))
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      expect(button.className).toContain("cursor-pointer")
      expect(button.className).not.toMatch(/\bdisabled:cursor-pointer\b/)
    }

    const refundBtn = buttons.find((b) => b.textContent?.trim() === "REFUND")
    const stockBtn = buttons.find(
      (b) => b.textContent?.includes("STOCK") && b.textContent?.includes("COUNT")
    )
    expect(refundBtn?.className).toContain("cursor-pointer")
    expect(stockBtn?.className).toContain("cursor-pointer")

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("omits cursor-pointer when grid is disabled", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosKeypadGrid onAction={() => {}} disabled />)
    })

    const refundBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "REFUND"
    )
    expect(refundBtn?.disabled).toBe(true)
    expect(refundBtn?.className).not.toContain("cursor-pointer")
    expect(refundBtn?.className).toContain("disabled:cursor-not-allowed")

    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
