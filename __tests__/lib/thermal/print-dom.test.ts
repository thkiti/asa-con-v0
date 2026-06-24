/**
 * @jest-environment jsdom
 */
import {
  cleanupThermalClonePrint,
  printThermalSlipClone,
  thermalPrintSourceSelector,
} from "@/lib/thermal/print-dom"

describe("printThermalSlipClone", () => {
  const printSpy = jest.spyOn(window, "print").mockImplementation(() => {})

  beforeEach(() => {
    cleanupThermalClonePrint()
    document.body.innerHTML = ""
    document.head.querySelector("#thermal-clone-print-styles")?.remove()
  })

  afterEach(() => {
    cleanupThermalClonePrint()
    printSpy.mockClear()
  })

  afterAll(() => {
    printSpy.mockRestore()
  })

  it("returns false when print source is missing", () => {
    expect(printThermalSlipClone(thermalPrintSourceSelector("missing"))).toBe(false)
    expect(printSpy).not.toHaveBeenCalled()
  })

  it("clones inner slip node, injects print styles, and opens print dialog", () => {
    const source = document.createElement("div")
    source.setAttribute("data-thermal-print-source", "receipt-setup-receipt")
    source.className = "thermal-print-area"
    const slip = document.createElement("div")
    slip.className = "receipt-setup-preview-slip receipt-setup-structured-preview thermal-ticket-slip"
    slip.innerHTML = "<div class='receipt-setup-printable-inner'>Sample slip</div>"
    source.appendChild(slip)
    document.body.appendChild(source)

    const ok = printThermalSlipClone(thermalPrintSourceSelector("receipt-setup-receipt"))

    expect(ok).toBe(true)
    expect(printSpy).toHaveBeenCalledTimes(1)
    expect(document.getElementById("thermal-clone-print-styles")).toBeTruthy()
    expect(document.body.classList.contains("thermal-clone-print-active")).toBe(true)

    const clone = document.querySelector("[data-thermal-print-clone]") as HTMLElement
    expect(clone).toBeTruthy()
    expect(clone.classList.contains("thermal-ticket-slip")).toBe(true)
    expect(clone.classList.contains("thermal-print-area")).toBe(false)
    expect(clone.textContent).toContain("Sample slip")
    expect(clone).not.toBe(source)
    expect(clone).not.toBe(slip)

    const wrapper = document.querySelector("[data-thermal-print-clone-wrap]") as HTMLElement
    expect(wrapper).toBeTruthy()
    expect(wrapper.contains(clone)).toBe(true)
    expect(wrapper.style.height).not.toBe("")
  })

  it("cleans up clone and body class on afterprint", () => {
    const source = document.createElement("div")
    source.setAttribute("data-thermal-print-source", "receipt-setup-refund")
    source.className = "thermal-print-area"
    source.textContent = "Refund"
    document.body.appendChild(source)

    printThermalSlipClone(thermalPrintSourceSelector("receipt-setup-refund"))
    expect(document.querySelector("[data-thermal-print-clone-wrap]")).toBeTruthy()

    window.dispatchEvent(new Event("afterprint"))

    expect(document.querySelector("[data-thermal-print-clone-wrap]")).toBeNull()
    expect(document.querySelector("[data-thermal-print-clone]")).toBeNull()
    expect(document.body.classList.contains("thermal-clone-print-active")).toBe(false)
  })
})
