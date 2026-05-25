import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { assertRequiredString } from "./stock-errors"
import { applyIssueItem } from "./issue-stock"
import { applyReceiveItem } from "./receive-stock"
import type {
  ApplyLineContext,
  IssueStockInput,
  ReceiveStockInput,
  StockLedgerResult,
  StockMoveItem,
} from "./transaction-types"

function buildContext(
  input: IssueStockInput | ReceiveStockInput,
  fn: string
): ApplyLineContext {
  return {
    branchId: assertRequiredString(input.branchId, "branchId", fn),
    refType: assertRequiredString(input.refType, "refType", fn),
    refId: assertRequiredString(input.refId, "refId", fn),
    documentId: input.documentId ?? null,
    date: input.date ?? new Date(),
  }
}

async function runItems(
  tx: Prisma.TransactionClient,
  ctx: ApplyLineContext,
  items: StockMoveItem[],
  apply: (
    tx: Prisma.TransactionClient,
    ctx: ApplyLineContext,
    item: StockMoveItem
  ) => Promise<"applied" | "skipped">
): Promise<StockLedgerResult> {
  let applied = 0
  let skippedZeroQty = 0
  for (const item of items) {
    const result = await apply(tx, ctx, item)
    if (result === "applied") applied++
    else skippedZeroQty++
  }
  return { applied, skippedZeroQty }
}

export async function issueStock(input: IssueStockInput): Promise<StockLedgerResult> {
  const fn = "issueStock"
  const ctx = buildContext(input, fn)
  const items = Array.isArray(input.items) ? input.items : []
  if (items.length === 0) return { applied: 0, skippedZeroQty: 0 }

  const run = (tx: Prisma.TransactionClient) =>
    runItems(tx, ctx, items, applyIssueItem)

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}

export async function receiveStock(
  input: ReceiveStockInput
): Promise<StockLedgerResult> {
  const fn = "receiveStock"
  const ctx = buildContext(input, fn)
  const items = Array.isArray(input.items) ? input.items : []
  if (items.length === 0) return { applied: 0, skippedZeroQty: 0 }

  const run = (tx: Prisma.TransactionClient) =>
    runItems(tx, ctx, items, applyReceiveItem)

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}