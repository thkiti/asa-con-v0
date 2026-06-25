/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PosKeypadGrid } from "@/components/pos/PosKeypadGrid"
import { PosKeypadMessageBlock } from "@/components/pos/PosKeypadMessageBlock"
import { getPosKeypadButtonPlacement } from "@/lib/pos-ui/keypad-layout"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

describe("PosKeypadGrid", () => {
  it("uses cursor-pointer on enabled keypad buttons", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(
        <PosKeypadGrid
          onAction={() => {}}
          messageSlot={
            <PosKeypadMessageBlock pendingEvidenceCount={0} onOpenPendingEvidence={() => {}} />
          }
        />
      )
    })

    const buttons = Array.from(container.querySelectorAll("button"))
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      expect(button.className).toContain("cursor-pointer")
      expect(button.className).not.toMatch(/\bdisabled:cursor-pointer\b/)
    }

    const refundBtn = buttons.find((b) => b.textContent?.trim() === "REFUND")
    const orderBtn = buttons.find((b) => b.textContent?.trim() === "ORDER")
    const stockBtn = buttons.find(
      (b) => b.textContent?.includes("STOCK") && b.textContent?.includes("COUNT")
    )
    const checkoutBtn = buttons.find((b) => b.textContent?.trim() === "CHECKOUT")
    expect(refundBtn?.className).toContain("cursor-pointer")
    expect(orderBtn?.className).toContain("cursor-pointer")
    expect(stockBtn?.className).toContain("cursor-pointer")
    expect(checkoutBtn?.className).toContain("cursor-pointer")
    expect(checkoutBtn?.className).toContain("bg-[#16A34A]")
    expect(checkoutBtn?.className).toContain("hover:bg-[#15803D]")
    expect(checkoutBtn?.className).not.toContain("max-h-")

    const printBtn = buttons.find((b) => b.textContent?.includes("PRINT"))
    expect(printBtn).toBeTruthy()
    expect(getPosKeypadButtonPlacement("print-report")).toMatchObject({ col: 7, row: 4 })

    expect(container.querySelector('[data-testid="pos-keypad-message-slot"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="pos-keypad-message-block"]')).toBeTruthy()
    expect(container.querySelectorAll('[data-testid="pos-keypad-placeholder-cell"]').length).toBe(0)
    const staffEvidenceBtn = buttons.find((b) => b.textContent?.includes("ทำประวัติ"))
    expect(staffEvidenceBtn).toBeTruthy()
    expect(getPosKeypadButtonPlacement("staff-evidence")).toMatchObject({ col: 7, row: 3 })

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
    const lookupBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "REC. LOOKUP"
    )
    expect(refundBtn?.disabled).toBe(true)
    expect(lookupBtn?.disabled).toBe(true)
    expect(refundBtn?.className).not.toContain("cursor-pointer")
    expect(refundBtn?.className).toContain("cursor-not-allowed")

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("calls onReceiptLookup from split button lower half", () => {
    const onReceiptLookup = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(
        <PosKeypadGrid onAction={() => {}} onReceiptLookup={onReceiptLookup} />
      )
    })

    const lookupBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "REC. LOOKUP"
    )
    expect(lookupBtn).toBeTruthy()
    act(() => {
      lookupBtn!.click()
    })
    expect(onReceiptLookup).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("ghosts staff evidence button when evidence is complete", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(
        <PosKeypadGrid
          onAction={() => {}}
          ghostButtonIds={new Set(["staff-evidence"])}
        />
      )
    })

    const labeledStaffEvidence = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("ทำประวัติ")
    )
    expect(labeledStaffEvidence).toBeUndefined()

    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
