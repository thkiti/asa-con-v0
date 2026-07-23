import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { assertPostingRequiredString } from "./posting-errors"
import type { PostDocumentInput, PostDocumentResult } from "./posting-types"
import { applyPostedTransition } from "./document/document-status"
import { assertCanPost } from "./validation"

const EMPTY_LEDGER = { applied: 0, skippedZeroQty: 0 }

/**
 * Post a stock document: operational status POSTED only.
 *
 * Per-event StockTransaction / Stock / StockLayer mutations are retired.
 * Inventory-cost Finance vouchers are deferred until Cost Calculation on
 * locked END documents. Source document headers and lines are preserved.
 */
export async function postDocument(
  input: PostDocumentInput
): Promise<PostDocumentResult> {
  const documentId = assertPostingRequiredString(input.documentId, "documentId")
  const postedByStaffId = assertPostingRequiredString(
    input.postedByStaffId,
    "postedByStaffId"
  )

  const run = async (tx: Prisma.TransactionClient): Promise<PostDocumentResult> => {
    const doc = await tx.stockDocument.findUnique({
      where: { id: documentId },
      include: { lines: true },
    })

    assertCanPost(doc)

    const priorStatus = doc.status
    const updated = await applyPostedTransition(tx, {
      documentId,
      postedByStaffId,
      priorStatus,
      confirmedAt: doc.confirmedAt,
      confirmedByStaffId: doc.confirmedByStaffId,
    })

    return {
      document: updated,
      ledger: {
        issue: EMPTY_LEDGER,
        receive: EMPTY_LEDGER,
      },
    }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
