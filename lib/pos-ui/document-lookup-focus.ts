/** When true, restore Running No focus for POS keypad entry; skip while filter controls are active. */
export function shouldRestoreDocumentLookupRunningNoFocus(
  activeElement: Element | null,
  filtersRoot: HTMLElement | null,
  runningInput: HTMLInputElement | null
): boolean {
  if (!runningInput) return false
  if (activeElement === runningInput) return false
  if (activeElement && filtersRoot?.contains(activeElement)) return false
  return true
}
