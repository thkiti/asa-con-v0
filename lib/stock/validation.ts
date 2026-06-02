import { POSTABLE_BY_DOC_TYPE } from "./document/document-transition-policy"
import { mapDocumentToLedgerMoves } from "./document-mapper"
import { PostingError } from "./posting-errors"
import type { StockDocumentWithLines } from "./posting-types"

export { POSTABLE_BY_DOC_TYPE }

export function assertCanPost(
  doc: StockDocumentWithLines | null
): asserts doc is StockDocumentWithLines {
  if (!doc) {
    throw new PostingError("Document not found", "NOT_FOUND", 404)
  }

  if (doc.status === "POSTED") {
    throw new PostingError("Document is already POSTED", "ALREADY_POSTED", 400)
  }

  if (doc.status === "CANCELLED") {
    throw new PostingError("Document is CANCELLED", "INVALID_STATUS", 400)
  }

  const postable = POSTABLE_BY_DOC_TYPE[doc.docType]
  if (!postable.has(doc.status)) {
    throw new PostingError(
      `Status ${doc.status} is not postable for ${doc.docType}`,
      "INVALID_STATUS",
      400
    )
  }

  if (!doc.lines || doc.lines.length === 0) {
    throw new PostingError("No document lines", "NO_LINES", 400)
  }

  const mapped = mapDocumentToLedgerMoves(doc)
  if (!mapped.branchId) {
    throw new PostingError("Missing branch/location", "MISSING_BRANCH", 400)
  }

  if (doc.docType === "ADJUSTMENT") {
    for (const line of doc.lines) {
      if (line.reviewPostingDelta == null) {
        throw new PostingError(
          "ADJUSTMENT line missing reviewPostingDelta",
          "MISSING_ADJ_DELTA",
          400
        )
      }
    }
    return
  }

  if (mapped.inbound.length === 0 && mapped.outbound.length === 0) {
    throw new PostingError("All qty are zero", "ALL_ZERO", 400)
  }
}