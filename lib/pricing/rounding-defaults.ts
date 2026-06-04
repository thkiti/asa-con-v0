/** Rounding mode codes (mirror `RoundingMode` enum in schema). */
export type RoundingModeCode =
  | "NONE"
  | "CENT_01"
  | "CENT_05"
  | "BAHT_1"
  | "BAHT_10"
  | "BAHT_100"

/** Suggested default rounding when creating a policy for each pricing class. */
export function defaultRoundingModeForClass(
  pricingClass: string
): RoundingModeCode {
  switch (pricingClass) {
    case "MATERIAL":
      return "CENT_05"
    case "MACHINERY":
      return "BAHT_10"
    case "CONSUMABLE":
      return "CENT_01"
    default:
      return "CENT_05"
  }
}

export const ROUNDING_MODE_LABELS: Record<RoundingModeCode, string> = {
  NONE: "No rounding",
  CENT_01: "Nearest 0.01 (1 satang)",
  CENT_05: "Nearest 0.05 (25/50 satang)",
  BAHT_1: "Nearest 1 baht",
  BAHT_10: "Nearest 10 baht",
  BAHT_100: "Nearest 100 baht",
}
