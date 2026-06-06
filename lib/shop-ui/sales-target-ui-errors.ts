export type SalesTargetErrorContext =
  | "branches"
  | "load"
  | "save"
  | "preview"
  | "copy"

const FRIENDLY_MESSAGES: Record<SalesTargetErrorContext, string> = {
  branches: "Unable to load branches. Please reload the page.",
  load: "Unable to load sales target. Please reload.",
  save: "Unable to save sales target. Please try again.",
  preview: "Unable to load daily preview. Please reload.",
  copy: "Unable to load previous month target. Please try again.",
}

const TECHNICAL_ERROR_RE =
  /cannot read propert|undefined|null is not|findUnique|TypeError|SyntaxError|ECONNREFUSED|fetch failed/i

export function isTechnicalSalesTargetError(message: string): boolean {
  return TECHNICAL_ERROR_RE.test(message)
}

/** Map API/raw errors to user-safe copy; log technical detail separately. */
export function friendlySalesTargetError(
  raw: string,
  context: SalesTargetErrorContext
): string {
  const trimmed = raw.trim()
  if (!trimmed || isTechnicalSalesTargetError(trimmed)) {
    return FRIENDLY_MESSAGES[context]
  }
  return trimmed
}

export function logSalesTargetError(
  context: SalesTargetErrorContext,
  raw: string
): void {
  console.error(`[SalesTargetSetup:${context}]`, raw)
}
