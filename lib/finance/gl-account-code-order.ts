/**
 * Canonical GL account-code order — same rule as Finance → General Ledger
 * Account dropdown (`filterAndSortGlAccountsForInquiry`) and flat/tree lists.
 *
 * Plain lexicographic `localeCompare` (not numeric-aware): e.g.
 * 1, 1000, 1001, 101, 1011, 1021, 1021001
 */
export function compareGlAccountCodes(a: string, b: string): number {
  return a.localeCompare(b)
}
