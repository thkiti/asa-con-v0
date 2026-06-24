import {
  THERMAL_CLONE_PRINT_STYLES,
  THERMAL_PRINT_CLONE_WRAP_ATTR,
  THERMAL_PRINT_SLIP_SELECTOR,
} from "./print-css"
import { THERMAL_PRINT_SCALE } from "./thermal-paper"

const PRINT_BODY_CLASS = "thermal-clone-print-active"
const PRINT_STYLES_ID = "thermal-clone-print-styles"

let printClone: HTMLElement | null = null
let cleanupFallbackId: number | null = null
let afterPrintHandler: (() => void) | null = null

function removePrintClone(): void {
  printClone?.remove()
  printClone = null
}

export function cleanupThermalClonePrint(): void {
  document.body.classList.remove(PRINT_BODY_CLASS)
  removePrintClone()
  if (afterPrintHandler) {
    window.removeEventListener("afterprint", afterPrintHandler)
    afterPrintHandler = null
  }
  if (cleanupFallbackId != null) {
    window.clearTimeout(cleanupFallbackId)
    cleanupFallbackId = null
  }
}

function ensureThermalClonePrintStyles(): void {
  if (document.getElementById(PRINT_STYLES_ID)) return
  const style = document.createElement("style")
  style.id = PRINT_STYLES_ID
  style.textContent = THERMAL_CLONE_PRINT_STYLES
  document.head.appendChild(style)
}

/** Printable slip inside a thermal print source (matches on-screen preview box). */
export function resolveThermalPrintSlipNode(source: HTMLElement): HTMLElement {
  return source.querySelector<HTMLElement>(THERMAL_PRINT_SLIP_SELECTOR) ?? source
}

/** Size wrapper to scaled visual bounds so print layout does not clip overflow. */
function sizeThermalPrintCloneWrapper(wrapper: HTMLElement, slip: HTMLElement): void {
  void slip.offsetHeight
  const fullHeight = slip.getBoundingClientRect().height
  wrapper.style.height = `${fullHeight * THERMAL_PRINT_SCALE}px`
}

/** Clone a hidden thermal print source and print — shared by admin setup + POS tickets. */
export function printThermalSlipClone(sourceSelector: string): boolean {
  ensureThermalClonePrintStyles()

  const source = document.querySelector<HTMLElement>(sourceSelector)
  if (!source) return false

  cleanupThermalClonePrint()

  const slip = resolveThermalPrintSlipNode(source)
  const clone = slip.cloneNode(true) as HTMLElement
  clone.setAttribute("data-thermal-print-clone", "")

  const wrapper = document.createElement("div")
  wrapper.setAttribute(THERMAL_PRINT_CLONE_WRAP_ATTR, "")
  wrapper.appendChild(clone)
  printClone = wrapper
  document.body.appendChild(wrapper)

  document.body.classList.add(PRINT_BODY_CLASS)

  sizeThermalPrintCloneWrapper(wrapper, clone)

  // Force layout while still inside the user-gesture call stack (required for window.print).
  void clone.offsetHeight

  let cleaned = false
  const safeCleanup = () => {
    if (cleaned) return
    cleaned = true
    cleanupThermalClonePrint()
  }

  afterPrintHandler = safeCleanup
  window.addEventListener("afterprint", safeCleanup)
  cleanupFallbackId = window.setTimeout(safeCleanup, 60_000)

  window.print()
  return true
}

export const THERMAL_PRINT_SOURCE_ATTR = "data-thermal-print-source"

export function thermalPrintSourceSelector(kind?: string): string {
  if (kind) {
    return `[${THERMAL_PRINT_SOURCE_ATTR}="${kind}"]`
  }
  return `[${THERMAL_PRINT_SOURCE_ATTR}]`
}
