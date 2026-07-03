/** Server-side feature flag — read only here, not in orchestrators. */
export function isFinancePostingEnabled(): boolean {
  return process.env.FINANCE_POSTING_ENABLED === "true"
}

/**
 * Manual accounting period creation (POST /api/finance/periods) is hidden from normal
 * Finance UI by default. Enable only for bootstrap, repair, migration, or emergency admin.
 */
export function isFinanceManualPeriodCreationEnabled(): boolean {
  return process.env.FINANCE_MANUAL_PERIOD_CREATION_ENABLED === "true"
}
