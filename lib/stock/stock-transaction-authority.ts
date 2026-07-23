import type { Prisma } from "@/generated/prisma/client"
import { StockLedgerError } from "./stock-errors"

/**
 * Sole future authorized writer of StockTransaction rows.
 * Not implemented yet — Cost Calculation based on locked END documents.
 */
export const AUTHORIZED_STOCK_TRANSACTION_SOURCE = "END_COST_CALCULATION" as const

export type StockTransactionWriteSource =
  | typeof AUTHORIZED_STOCK_TRANSACTION_SOURCE

const RETIRED_MESSAGE =
  "Per-event StockTransaction creation is retired. Operational REC, DEY, CNT, and other workflows must not write StockTransaction. Future StockTransaction rows may only be created by Cost Calculation (source: END_COST_CALCULATION) from locked END Stock Documents."

/**
 * Central application boundary: reject every StockTransaction write until
 * Cost Calculation calls createStockTransaction with END_COST_CALCULATION.
 */
export function assertCanCreateStockTransaction(
  source: string | null | undefined
): asserts source is StockTransactionWriteSource {
  if (source !== AUTHORIZED_STOCK_TRANSACTION_SOURCE) {
    throw new StockLedgerError(RETIRED_MESSAGE, "PER_EVENT_LEDGER_RETIRED")
  }
}

export type CreateStockTransactionInput = {
  source: string
  data: Prisma.StockTransactionCreateInput
  tx: Prisma.TransactionClient
}

/**
 * Only permitted StockTransaction create entry point.
 * Throws for any source other than END_COST_CALCULATION (not implemented yet).
 */
export async function createStockTransaction(
  input: CreateStockTransactionInput
): Promise<never> {
  assertCanCreateStockTransaction(input.source)
  // Cost Calculation will call this with END_COST_CALCULATION and persist rows.
  // Until then the assert above always throws for non-authorized sources, and
  // the authorized path is intentionally unimplemented.
  throw new StockLedgerError(
    "END_COST_CALCULATION StockTransaction creation is not implemented yet.",
    "COST_CALCULATION_NOT_IMPLEMENTED"
  )
}

/** @deprecated Per-event issue/receive ledger — always throws. */
export function rejectPerEventStockLedger(fn: string): never {
  throw new StockLedgerError(
    `${fn}: ${RETIRED_MESSAGE}`,
    "PER_EVENT_LEDGER_RETIRED"
  )
}
