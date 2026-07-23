import { rejectPerEventStockLedger } from "./stock-transaction-authority"
import type {
  IssueStockInput,
  ReceiveStockInput,
  StockLedgerResult,
} from "./transaction-types"

/**
 * Retired per-event stock ledger API.
 *
 * Operational callers must not use these functions. StockTransaction may only
 * be created later by Cost Calculation (END_COST_CALCULATION) from locked END
 * documents. See lib/stock/stock-transaction-authority.ts.
 */
export async function issueStock(
  _input: IssueStockInput
): Promise<StockLedgerResult> {
  rejectPerEventStockLedger("issueStock")
}

export async function receiveStock(
  _input: ReceiveStockInput
): Promise<StockLedgerResult> {
  rejectPerEventStockLedger("receiveStock")
}
