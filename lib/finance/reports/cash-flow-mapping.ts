/** v1 active indirect cash-flow account code mappings (config only — no schema). */
export const CASH_FLOW_V1_MAPPINGS = {
  cashAndEquivalents: ["1100", "1110"],
  workingCapitalAssets: ["1000"],
  workingCapitalLiabilities: ["2100"],
} as const

export type PendingCashFlowMappingKey =
  | "AR"
  | "DIRECTOR_LOAN"
  | "INTEREST"
  | "FIXED_ASSET"
  | "DEPRECIATION"

export type PendingCashFlowMapping = {
  key: PendingCashFlowMappingKey
  label: string
  /** Reserved for future code lists when real CoA is wired. */
  accountCodes: readonly string[]
}

/** Documented categories not yet mapped in v1 — warn only. */
export const PENDING_CASH_FLOW_MAPPINGS: readonly PendingCashFlowMapping[] = [
  {
    key: "AR",
    label: "Accounts receivable",
    accountCodes: [],
  },
  {
    key: "DIRECTOR_LOAN",
    label: "Director loan / Due to director",
    accountCodes: [],
  },
  {
    key: "INTEREST",
    label: "Interest expense / Interest payable",
    accountCodes: [],
  },
  {
    key: "FIXED_ASSET",
    label: "Fixed asset",
    accountCodes: [],
  },
  {
    key: "DEPRECIATION",
    label: "Depreciation (non-cash add-back)",
    accountCodes: [],
  },
] as const

export function allMappedAccountCodes(): string[] {
  return [
    ...CASH_FLOW_V1_MAPPINGS.cashAndEquivalents,
    ...CASH_FLOW_V1_MAPPINGS.workingCapitalAssets,
    ...CASH_FLOW_V1_MAPPINGS.workingCapitalLiabilities,
  ]
}

export function isCashFlowMappedAccountCode(code: string): boolean {
  return allMappedAccountCodes().includes(code)
}

export function cashFlowMappingLabelForCode(code: string): string | null {
  if (CASH_FLOW_V1_MAPPINGS.cashAndEquivalents.includes(code as "1100" | "1110")) {
    return "Cash and equivalents"
  }
  if (CASH_FLOW_V1_MAPPINGS.workingCapitalAssets.includes(code as "1000")) {
    return "Working capital asset"
  }
  if (CASH_FLOW_V1_MAPPINGS.workingCapitalLiabilities.includes(code as "2100")) {
    return "Working capital liability"
  }
  return null
}
