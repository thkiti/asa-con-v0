/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentCountingBlock } from "@/components/stock/StockDocumentCountingBlock"
import { StockDocumentCountingSheet } from "@/components/stock/StockDocumentCountingSheet"
import {
  COUNTING_QTY_INPUT_ATTR,
  COUNTING_SHEET_ROOT_ATTR,
  focusNextCountingQtyInput,
  getEnabledCountingQtyInputs,
  handleCountingQtyKeyDown,
} from "@/components/stock/counting-qty-input"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"

async function flushSelectAfterFocus(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function makeLine(n: number): EditorLineRowVM {
  return {
    key: `K-${n}`,
    productId: `prod-${n}`,
    productCode: `010${n}`,
    productName: `Item ${n}`,
    displayCode: `CODE-${n}`,
    hookGroup: "K",
    hookNo: n,
    hookLabel: `K.${n}`,
    qty: "",
    endingQty: "",
    reviewPostingDelta: "",
  }
}

describe("counting qty input UX", () => {
  it("renders text inputs with numeric inputMode and qty data attribute", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingSheet
        lines={[makeLine(1), makeLine(2)]}
        activeHookGroup="K"
        readOnly={false}
        onHookGroupChange={() => {}}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain('type="text"')
    expect(html).toContain('inputMode="numeric"')
    expect(html).not.toContain('type="number"')
    expect(html).toContain(`${COUNTING_QTY_INPUT_ATTR}="true"`)
    expect(html).toContain(`${COUNTING_SHEET_ROOT_ATTR}="true"`)
  })

  it("block qty input is text with numeric inputMode", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlock
        rows={[makeLine(1)]}
        showHook
        hookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain('type="text"')
    expect(html).toContain('inputMode="numeric"')
    expect(html).not.toContain('type="number"')
  })

  it("focusNextCountingQtyInput focuses next enabled input in DOM order", () => {
    const sheet = document.createElement("section")
    sheet.setAttribute(COUNTING_SHEET_ROOT_ATTR, "true")

    const first = document.createElement("input")
    first.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")
    const second = document.createElement("input")
    second.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")

    sheet.append(first, second)
    document.body.appendChild(sheet)

    const focusSpy = jest.spyOn(second, "focus")
    expect(focusNextCountingQtyInput(first)).toBe(true)
    expect(focusSpy).toHaveBeenCalled()

    sheet.remove()
  })

  it("handleCountingQtyKeyDown on Enter prevents default and focuses next", () => {
    const sheet = document.createElement("section")
    sheet.setAttribute(COUNTING_SHEET_ROOT_ATTR, "true")

    const first = document.createElement("input")
    first.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")
    const second = document.createElement("input")
    second.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")

    sheet.append(first, second)
    document.body.appendChild(sheet)

    const focusSpy = jest.spyOn(second, "focus")
    const event = {
      key: "Enter",
      preventDefault: jest.fn(),
      currentTarget: first,
    } as import("react").KeyboardEvent<HTMLInputElement>

    handleCountingQtyKeyDown(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(focusSpy).toHaveBeenCalled()

    sheet.remove()
  })

  it("Enter on last qty input does not throw or focus another", () => {
    const sheet = document.createElement("section")
    sheet.setAttribute(COUNTING_SHEET_ROOT_ATTR, "true")

    const only = document.createElement("input")
    only.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")
    sheet.append(only)
    document.body.appendChild(sheet)

    expect(() => focusNextCountingQtyInput(only)).not.toThrow()
    expect(focusNextCountingQtyInput(only)).toBe(false)

    sheet.remove()
  })

  it("selects existing value after Enter navigation", async () => {
    const sheet = document.createElement("section")
    sheet.setAttribute(COUNTING_SHEET_ROOT_ATTR, "true")

    const first = document.createElement("input")
    first.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")
    const second = document.createElement("input")
    second.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")
    second.value = "8"

    sheet.append(first, second)
    document.body.appendChild(sheet)

    const selectSpy = jest.spyOn(second, "select")
    expect(focusNextCountingQtyInput(first)).toBe(true)
    await flushSelectAfterFocus()

    expect(selectSpy).toHaveBeenCalled()
    expect(second.selectionStart).toBe(0)
    expect(second.selectionEnd).toBe(second.value.length)

    sheet.remove()
  })

  it("does not select when next field is empty", async () => {
    const sheet = document.createElement("section")
    sheet.setAttribute(COUNTING_SHEET_ROOT_ATTR, "true")

    const first = document.createElement("input")
    first.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")
    const second = document.createElement("input")
    second.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")
    second.value = ""

    sheet.append(first, second)
    document.body.appendChild(sheet)

    const selectSpy = jest.spyOn(second, "select")
    focusNextCountingQtyInput(first)
    await flushSelectAfterFocus()

    expect(selectSpy).not.toHaveBeenCalled()

    sheet.remove()
  })

  it("typing after Enter select-all replaces existing value", async () => {
    const sheet = document.createElement("section")
    sheet.setAttribute(COUNTING_SHEET_ROOT_ATTR, "true")

    const first = document.createElement("input")
    first.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")
    const second = document.createElement("input")
    second.setAttribute(COUNTING_QTY_INPUT_ATTR, "true")
    second.value = "8"

    sheet.append(first, second)
    document.body.appendChild(sheet)

    focusNextCountingQtyInput(first)
    await flushSelectAfterFocus()

    second.setRangeText("5", second.selectionStart ?? 0, second.selectionEnd ?? 0, "end")
    expect(second.value).toBe("5")

    sheet.remove()
  })

  it("getEnabledCountingQtyInputs skips disabled inputs", () => {
    const sheet = document.createElement("section")
    sheet.setAttribute(COUNTING_SHEET_ROOT_ATTR, "true")
    sheet.innerHTML = `
      <input data-counting-qty-input="true" />
      <input data-counting-qty-input="true" disabled />
      <input data-counting-qty-input="true" />
    `
    document.body.appendChild(sheet)

    const enabled = getEnabledCountingQtyInputs(document, sheet.querySelector("input")!)
    expect(enabled).toHaveLength(2)

    sheet.remove()
  })
})
