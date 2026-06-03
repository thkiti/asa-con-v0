import type { KeyboardEvent } from "react"

export const COUNTING_SHEET_ROOT_ATTR = "data-counting-sheet-root"
export const COUNTING_QTY_INPUT_ATTR = "data-counting-qty-input"

export const COUNTING_SHEET_ROOT_SELECTOR = `[${COUNTING_SHEET_ROOT_ATTR}="true"]`
export const COUNTING_QTY_INPUT_SELECTOR = `[${COUNTING_QTY_INPUT_ATTR}="true"]`

function resolveCountingSheetScope(
  root: ParentNode,
  from?: HTMLElement
): Element | null {
  if (from) {
    return from.closest(COUNTING_SHEET_ROOT_SELECTOR)
  }
  if (root instanceof Element && root.matches(COUNTING_SHEET_ROOT_SELECTOR)) {
    return root
  }
  return root.querySelector(COUNTING_SHEET_ROOT_SELECTOR)
}

export function getEnabledCountingQtyInputs(
  root: ParentNode,
  from?: HTMLElement
): HTMLInputElement[] {
  const scope = resolveCountingSheetScope(root, from)

  if (!scope) return []

  return Array.from(
    scope.querySelectorAll<HTMLInputElement>(COUNTING_QTY_INPUT_SELECTOR)
  ).filter((input) => !input.disabled)
}

/** Select-all on Enter navigation so the next keystroke replaces the value. */
export function selectCountingQtyInputValueAfterFocus(input: HTMLInputElement): void {
  if (input.value === "") return

  const runSelect = () => {
    try {
      input.select()
    } catch {
      // no-op when select is unavailable
    }
  }

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(runSelect))
  } else {
    queueMicrotask(runSelect)
  }
}

/** Focus next qty input in DOM order within the counting sheet. Returns false if none. */
export function focusNextCountingQtyInput(current: HTMLInputElement): boolean {
  const sheetRoot = current.closest(COUNTING_SHEET_ROOT_SELECTOR)
  if (!sheetRoot) return false

  const inputs = getEnabledCountingQtyInputs(sheetRoot)
  const index = inputs.indexOf(current)
  if (index < 0 || index >= inputs.length - 1) return false

  const next = inputs[index + 1]
  if (!next) return false

  next.focus()
  selectCountingQtyInputValueAfterFocus(next)
  return true
}

export function handleCountingQtyKeyDown(
  event: KeyboardEvent<HTMLInputElement>
): void {
  if (event.key !== "Enter") return
  event.preventDefault()
  focusNextCountingQtyInput(event.currentTarget)
}
