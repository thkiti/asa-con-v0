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

    const readXBtn = buttons.find((b) => b.textContent?.trim() === "READ X")
    const readZBtn = buttons.find((b) => b.textContent?.trim() === "READ Z")
    expect(readXBtn?.className).toContain("from-cyan-600")
    expect(readZBtn?.className).toContain("from-red-600")

    const printBtn = buttons.find((b) => b.textContent?.includes("PRINT"))
    expect(printBtn).toBeFalsy()
    expect(getPosKeypadButtonPlacement("print-report")).toMatchObject({ col: 2, row: 1 })

    expect(container.querySelector('[data-testid="pos-keypad-message-slot"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="pos-keypad-message-block"]')).toBeTruthy()
    expect(container.querySelectorAll('[data-testid="pos-keypad-placeholder-cell"]').length).toBe(0)
    const staffEvidenceBtn = buttons.find((b) => b.textContent?.includes("ทำประวัติ"))
    expect(staffEvidenceBtn).toBeTruthy()
    expect(getPosKeypadButtonPlacement("staff-evidence")).toMatchObject({ col: 2, row: 1 })
    expect(getPosKeypadButtonPlacement("receipt-lookup")).toMatchObject({ col: 7, row: 4 })
    expect(getPosKeypadButtonPlacement("collector")).toMatchObject({ col: 1, row: 3 })

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
      (b) => b.textContent?.trim() === "LOOKUP"
    )
    expect(refundBtn?.disabled).toBe(true)
    expect(lookupBtn?.disabled).toBe(true)
    expect(refundBtn?.className).not.toContain("cursor-pointer")
    expect(refundBtn?.className).toContain("cursor-not-allowed")

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("blankNumericKeypad replaces digit labels with blank tiles", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosKeypadGrid onAction={() => {}} blankNumericKeypad />)
    })

    expect(container.querySelectorAll('[data-testid="pos-keypad-numeric-blank"]').length).toBe(
      14
    )
    for (const label of ["0", "1", "7", "9", "C", "ENTER"]) {
      expect(
        Array.from(container.querySelectorAll("button")).some(
          (b) => b.textContent?.trim() === label
        )
      ).toBe(false)
    }

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
      (b) => b.textContent?.trim() === "LOOKUP"
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
          staffEvidenceComplete
          ghostButtonIds={new Set(["staff-evidence"])}
        />
      )
    })

    const labeledStaffEvidence = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("ทำประวัติ")
    )
    expect(labeledStaffEvidence).toBeUndefined()
    expect(container.querySelectorAll('[data-testid="pos-keypad-placeholder-cell"]').length).toBe(1)

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("disables collector when permanentlyDisabledButtonIds includes collector", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(
        <PosKeypadGrid
          onAction={() => {}}
          permanentlyDisabledButtonIds={new Set(["collector"])}
        />
      )
    })

    const collectorBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("COLLECTOR")
    )
    expect(collectorBtn?.disabled).toBe(true)

    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("fires collector action when keypad collector is enabled", () => {
    const onAction = jest.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root: Root = createRoot(container)
    act(() => {
      root.render(<PosKeypadGrid onAction={onAction} />)
    })

    const collectorBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("COLLECTOR")
    )
    expect(collectorBtn?.disabled).toBe(false)
    act(() => {
      collectorBtn!.click()
    })
    expect(onAction).toHaveBeenCalledWith("collector")

    act(() => root.unmount())
    document.body.removeChild(container)
  })
})
