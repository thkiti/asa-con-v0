import type { Prisma } from "@/generated/prisma/client"
import { postSaleVoucher } from "@/lib/finance/posting"
import { buildPostSaleVoucherInput } from "@/lib/pos/checkout-finance"
import { resolvePosLegalEntityCode } from "@/lib/pos/resolve-pos-sale-vat"
import type {
  HistoricalPostingEligibleRow,
  HistoricalPostingExecuteResult,
  HistoricalPostingPlan,
} from "./types"

type ExecutePrisma = {
  $transaction: <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ) => Promise<T>
}

export async function executeHistoricalPosSalePosting(
  prisma: ExecutePrisma,
  plan: HistoricalPostingPlan
): Promise<HistoricalPostingExecuteResult> {
  const result: HistoricalPostingExecuteResult = {
    attempted: 0,
    created: 0,
    alreadyPosted: 0,
    failed: [],
  }

  for (const row of plan.eligibleRows) {
    result.attempted += 1
    try {
      const posted = await prisma.$transaction(async (tx) => {
        return postSaleVoucher(
          buildPostSaleVoucherInput({
            tx,
            legalEntityCode: resolvePosLegalEntityCode(),
            receiptNo: row.receiptNo,
            sale: row.sale,
            payment: row.payment,
            ledgerRows: row.ledgerRows,
            vatEconomics: row.vatEconomics,
          })
        )
      })

      if (posted.alreadyPosted) {
        result.alreadyPosted += 1
      } else {
        result.created += 1
      }
    } catch (err) {
      result.failed.push({
        saleId: row.saleId,
        receiptNo: row.receiptNo,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return result
}
