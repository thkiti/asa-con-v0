/** Server-side feature flag — read only here, not in orchestrators. */
export function isFinancePostingEnabled(): boolean {
  return process.env.FINANCE_POSTING_ENABLED === "true"
}
