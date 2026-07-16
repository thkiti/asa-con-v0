import type { Prisma } from "@/generated/prisma/client"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import {
  createLegacyHistoricalRefund,
  postLegacyHistoricalRefundVoucher,
} from "./create"
import type {
  HistoricalRefundExecuteResult,
  HistoricalRefundPlan,
} from "./types"

type ExecutePrisma = {
  $transaction: <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ) => Promise<T>
}

export async function executeHistoricalPosRefundImport(
  prisma: ExecutePrisma,
  plan: HistoricalRefundPlan
): Promise<HistoricalRefundExecuteResult> {
  const result: HistoricalRefundExecuteResult = {
    attemptedImport: 0,
    imported: 0,
    skippedAlreadyImported: 0,
    attemptedPosting: 0,
    posted: 0,
    alreadyPosted: 0,
    failed: [],
  }

  for (const doc of plan.documents) {
    if (
      doc.skipReason === "MISSING_BRANCH" ||
      doc.skipReason === "ZERO_AMOUNT" ||
      doc.skipReason === "ALREADY_POSTED" ||
      doc.skipReason === "INCOMPLETE_VOUCHER"
    ) {
      continue
    }

    try {
      const outcome = await prisma.$transaction(async (tx) => {
        result.attemptedImport += 1
        const created = await createLegacyHistoricalRefund(tx, doc)
        if (created.alreadyImported) {
          result.skippedAlreadyImported += 1
        } else {
          result.imported += 1
        }

        result.attemptedPosting += 1
        const posted = await postLegacyHistoricalRefundVoucher(tx, {
          refundId: created.refundId,
          refundNo: created.refundNo,
          branchId: doc.branchId!,
          refundAt: doc.refundAt,
          gross: doc.gross,
          vatEconomics: doc.vatEconomics,
        })
        return posted
      })

      if (outcome.alreadyPosted) {
        result.alreadyPosted += 1
      } else {
        result.posted += 1
      }
    } catch (err) {
      const message =
        err instanceof FinancePostingError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err)
      result.failed.push({ key: doc.key, error: message })
    }
  }

  return result
}
