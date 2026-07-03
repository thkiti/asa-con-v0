import { resolveBankReconciliationGlBalance } from "../bank-reconciliation/bank-reconciliation-gl-balance"

/** Cash expected balance uses the same cumulative GL balance resolver as bank reconciliation. */
export const resolveCashReconciliationExpectedCash = resolveBankReconciliationGlBalance
