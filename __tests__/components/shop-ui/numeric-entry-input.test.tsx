/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { NumericEntryInput } from "@/components/shop-ui/NumericEntryInput"
import {
  isAllowedDecimalDraft,
  isAllowedFinancialDraft,
  parseFinancialInput,
} from "@/lib/shop-ui/compact-form-helpers"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

describe("NumericEntryInput", () => {
  it("renders text decimal input without spinner", () => {
    const html = renderToStaticMarkup(
      <NumericEntryInput
        value="1.2"
        onValueChange={() => {}}
        aria-label="Weight"
      />
    )
    expect(html).toContain('type="text"')
    expect(html).toContain('inputMode="decimal"')
    expect(html).toContain("appearance:textfield")
  })

  it("supports decimal and financial draft patterns", () => {
    expect(isAllowedDecimalDraft("0.")).toBe(true)
    expect(isAllowedDecimalDraft("0.8")).toBe(true)
    expect(isAllowedDecimalDraft("1.2")).toBe(true)
    expect(isAllowedFinancialDraft("270,000")).toBe(true)
    expect(parseFinancialInput("270,000")).toBe("270000")
  })

  it("select-all on focus", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <NumericEntryInput
          value="100"
          onValueChange={() => {}}
          aria-label="Amount"
        />
      )
    })

    const input = container.querySelector("input") as HTMLInputElement
    const selectSpy = jest.spyOn(input, "select")
    await act(async () => {
      input.focus()
    })
    expect(selectSpy).toHaveBeenCalled()
    selectSpy.mockRestore()
  })

  it("Enter focuses next field when configured", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)
    const next = document.createElement("input")
    document.body.appendChild(next)
    const nextFocus = jest.spyOn(next, "focus")

    await act(async () => {
      root.render(
        <NumericEntryInput
          value="100"
          onValueChange={() => {}}
          aria-label="Amount"
          onEnterFocusNext={next}
        />
      )
    })

    const input = container.querySelector("input") as HTMLInputElement
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    })
    expect(nextFocus).toHaveBeenCalled()
    nextFocus.mockRestore()
  })
})
