import "server-only"

import type { DocStatus, Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/shared/prisma"
import { assertTransitionAllowed } from "@/lib/stock/document/document-transition-policy"
import { EndError, EndErrorCodes } from "./end-errors"
import type {
  ConfirmShopReceiptInput,
  ConfirmShopReceiptResult,
} from "./end-types"

const ALLOWED_STATUSES: ReadonlySet<DocStatus> = new Set([
  "SUBMITTED",
  "CONFIRMED",
  "SHIPPED",
])

export async function confirmShopReceipt(
  input: ConfirmShopReceiptInput
): Promise<ConfirmShopReceiptResult> {
  const documentId = String(input.documentId ?? "").trim()
  const staffId = String(input.staffId ?? "").trim()
  if (!documentId || !staffId) {
    throw new EndError(
      "documentId and staffId are required",
      EndErrorCodes.INVALID_INPUT
    )
  }

  const run = async (
    tx: Prisma.TransactionClient
  ): Promise<ConfirmShopReceiptResult> => {
    const doc = await tx.stockDocument.findUnique({
      where: { id: documentId },
      include: { lines: true },
    })

    if (!doc) {
      throw new EndError(
        "Document not found",
        EndErrorCodes.DOCUMENT_NOT_FOUND,
        404
      )
    }
    if (doc.docType !== "TRANSFER_OUT") {
      throw new EndError(
        "Shop receipt confirmation is only for TRANSFER_OUT (DEY)",
        EndErrorCodes.INVALID_STATUS
      )
    }
    if (doc.status === "CANCELLED" || doc.status === "POSTED") {
      throw new EndError(
        `Cannot confirm receipt for status ${doc.status}`,
        EndErrorCodes.INVALID_STATUS,
        409
      )
    }
    if (!ALLOWED_STATUSES.has(doc.status)) {
      throw new EndError(
        `Status ${doc.status} cannot confirm shop receipt`,
        EndErrorCodes.INVALID_STATUS,
        409
      )
    }
    if (!doc.toLocId) {
      throw new EndError(
        "TRANSFER_OUT must have toLocId (destination shop)",
        EndErrorCodes.INVALID_INPUT
      )
    }

    const overrides = new Map(
      (input.lines ?? []).map((l) => [l.lineId, l.receivedQty] as const)
    )

    for (const line of doc.lines) {
      const override = overrides.get(line.id)
      const receivedQty =
        override === undefined ? line.qty : Math.trunc(Number(override))
      if (!Number.isFinite(receivedQty) || receivedQty < 0) {
        throw new EndError(
          `Invalid receivedQty for line ${line.id}`,
          EndErrorCodes.INVALID_INPUT
        )
      }
      await tx.stockDocumentLine.update({
        where: { id: line.id },
        data: { receivedQty },
      })
    }

    const now = new Date()
    let statusChanged = false
    let nextStatus: DocStatus = doc.status

    try {
      assertTransitionAllowed({
        docType: doc.docType,
        fromStatus: doc.status,
        action: "RECEIVE",
      })
      nextStatus = "RECEIVED"
      statusChanged = true
    } catch {
      statusChanged = false
      nextStatus = doc.status
    }

    const document = await tx.stockDocument.update({
      where: { id: doc.id },
      data: {
        shopReceivedAt: now,
        shopReceivedByStaffId: staffId,
        ...(statusChanged ? { status: nextStatus } : {}),
      },
      include: {
        lines: {
          select: { id: true, receivedQty: true, qty: true },
        },
      },
    })

    return { document, statusChanged }
  }

  if (input.tx) return run(input.tx)
  return prisma.$transaction(run)
}
