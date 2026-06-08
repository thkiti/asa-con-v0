const PRINT_BODY_CLASS = "thermal-clone-print-active"

let printClone: HTMLElement | null = null

function removePrintClone(): void {
  printClone?.remove()
  printClone = null
}

export function cleanupThermalClonePrint(): void {
  document.body.classList.remove(PRINT_BODY_CLASS)
  removePrintClone()
}

/** Clone a hidden thermal print source and print — shared by COLLECTOR, READ_Z, REPAIR. */
export function printThermalSlipClone(sourceSelector: string): boolean {
  const source = document.querySelector<HTMLElement>(sourceSelector)
  if (!source) return false

  removePrintClone()
  const clone = source.cloneNode(true) as HTMLElement
  clone.setAttribute("data-thermal-print-clone", "")
  printClone = clone
  document.body.appendChild(clone)

  const onAfter = () => {
    cleanupThermalClonePrint()
    window.removeEventListener("afterprint", onAfter)
  }
  window.addEventListener("afterprint", onAfter)

  document.body.classList.add(PRINT_BODY_CLASS)
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
