const INTERNAL_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const FINANCE_BRANCH_UNASSIGNED_LABEL = "—"

/** True when value looks like an internal UUID — never show in finance documents. */
export function looksLikeInternalFinanceId(value: string | null | undefined): boolean {
  return INTERNAL_ID_RE.test(String(value ?? "").trim())
}

function sanitizeBranchField(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim()
  if (!trimmed || looksLikeInternalFinanceId(trimmed)) return ""
  return trimmed
}

/** User-facing branch label: `{code} • {name}`. */
export function formatFinanceBranchLabel(input: {
  branchCode?: string | null
  branchName?: string | null
}): string {
  const code = sanitizeBranchField(input.branchCode)
  const name = sanitizeBranchField(input.branchName)
  if (code && name) return `${code} • ${name}`
  if (code) return code
  if (name) return name
  return FINANCE_BRANCH_UNASSIGNED_LABEL
}

function normalizeLegacyBranchOverride(label: string): string {
  const trimmed = label.trim()
  if (trimmed.includes(" — ")) {
    const [code, ...rest] = trimmed.split(" — ")
    const name = rest.join(" — ").trim()
    if (code?.trim() && name) {
      return formatFinanceBranchLabel({
        branchCode: code.trim(),
        branchName: name,
      })
    }
  }
  return trimmed
}

/**
 * Resolve branch label for finance documents.
 * Prefers explicit code/name; accepts a legacy override; never returns raw UUIDs.
 */
export function resolveFinanceBranchLabel(input: {
  branchCode?: string | null
  branchName?: string | null
  overrideLabel?: string | null
}): string {
  const fromFields = formatFinanceBranchLabel({
    branchCode: input.branchCode,
    branchName: input.branchName,
  })
  if (fromFields !== FINANCE_BRANCH_UNASSIGNED_LABEL) return fromFields

  const override = String(input.overrideLabel ?? "").trim()
  if (override && !looksLikeInternalFinanceId(override)) {
    return normalizeLegacyBranchOverride(override)
  }

  return FINANCE_BRANCH_UNASSIGNED_LABEL
}
