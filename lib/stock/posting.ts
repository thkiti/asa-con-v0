import type { Prisma } from "@/generated/prisma/client"
import { isFinancePostingEnabled } from "@/lib/finance/config"
import { postStockDocumentVoucher } from "@/lib/finance/posting"
import { prisma } from "@/lib/shared/prisma"
import { mapDocumentToLedgerMoves } from "./document-mapper"
import { issueStock, receiveStock } from "./ledger"
import { assertPostingRequiredString } from "./posting-errors"
import type { PostDocumentInput, PostDocumentResult } from "./posting-types"
import { buildPostStockDocumentVoucherInput } from "./posting-finance"
import { assertCanPost } from "./validation"

const EMPTY_LEDGER = { applied: 0, skippedZeroQty: 0 }

/**
 * Post a stock document: ledger mutations + status POSTED in one transaction.
 * Only this module may mutate StockDocument.status for POST.
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
    const mapped = mapDocumentToLedgerMoves(doc)
    const ledgerBase = {
      branchId: mapped.branchId,
      refType: mapped.refType,
      refId: doc.id,
      documentId: doc.id,
      date: doc.date,
      tx,
    }

    let receiveResult = EMPTY_LEDGER
    let issueResult = EMPTY_LEDGER

    if (mapped.inbound.length > 0) {
      receiveResult = await receiveStock({
        ...ledgerBase,
        items: mapped.inbound,
      })
    }

    if (mapped.outbound.length > 0) {
      issueResult = await issueStock({
        ...ledgerBase,
        items: mapped.outbound,
      })
    }

    const now = new Date()
    const implicitConfirm =
      priorStatus === "SUBMITTED" && doc.confirmedAt == null
        ? {
            confirmedByStaffId: doc.confirmedByStaffId ?? postedByStaffId,
            confirmedAt: now,
          }
        : {}

    const updated = await tx.stockDocument.update({
      where: { id: documentId },
      data: {
        status: "POSTED",
        postedByStaffId,
        postedAt: now,
        ...implicitConfirm,
      },
      include: { lines: true },
    })

    if (isFinancePostingEnabled()) {
      const ledgerRows = await tx.stockTransaction.findMany({
        where: {
          refId: doc.id,
          documentId: doc.id,
        },
      })
      await postStockDocumentVoucher(
        buildPostStockDocumentVoucherInput({ tx, doc: updated, ledgerRows })
      )
    }

    return {
      document: updated,
      ledger: {
        issue: issueResult,
        receive: receiveResult,
      },
    }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}