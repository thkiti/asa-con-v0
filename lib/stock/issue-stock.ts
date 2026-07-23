import type { Prisma } from "@/generated/prisma/client"
import { rejectPerEventStockLedger } from "./stock-transaction-authority"
import type { ApplyLineContext, ApplyLineResult, StockMoveItem } from "./transaction-types"

/**
 * Retired per-event outbound ledger path.
 * Must not mutate Stock, StockLayer, or StockTransaction.
 */
export async function applyIssueItem(
  _tx: Prisma.TransactionClient,
  _ctx: ApplyLineContext,
  _raw: StockMoveItem
): Promise<ApplyLineResult> {
  rejectPerEventStockLedger("issueStock")
}
