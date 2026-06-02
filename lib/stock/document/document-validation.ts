import type { BranchType, DocType, Prisma } from "@/generated/prisma/client"
import {
  canMutateLines,
  isImmutableStatus,
} from "./document-transition-policy"
import {
  DocumentError,
  DocumentErrorCodes,
} from "./document-errors"
import type { SaveDocumentLineInput } from "./document-types"
import type { StockDocumentWithLines } from "./document-types"

const DOC_TYPES_ALLOWING_NEGATIVE_QTY = new Set<DocType>([
  "ADJUSTMENT",
  "PERFORMANCE",
])

const TRANSFER_DOC_TYPES = new Set<DocType>(["TRANSFER_OUT", "TRANSFER_IN"])

export function periodMonthFromDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

/** Drop qty=0 lines; validate product and qty rules. */
export function buildSaveLines(
  rawLines: SaveDocumentLineInput[],
  docType: DocType
): SaveDocumentLineInput[] {
  const lines: SaveDocumentLineInput[] = []

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]
    const productId = String(raw?.productId ?? "").trim()
    const qty = Number(raw?.qty ?? 0)

    if (!Number.isFinite(qty)) {
      throw new DocumentError(
        `Line ${i + 1}: qty is not a number`,
        DocumentErrorCodes.INVALID_QUANTITY
      )
    }

    if (qty === 0) continue

    if (!productId) {
      throw new DocumentError(
        "Line must include productId",
        DocumentErrorCodes.INVALID_PRODUCT
      )
    }

    if (qty < 0 && !DOC_TYPES_ALLOWING_NEGATIVE_QTY.has(docType)) {
      throw new DocumentError(
        `Negative qty is only allowed for ADJUSTMENT or PERFORMANCE`,
        DocumentErrorCodes.INVALID_QUANTITY
      )
    }

    lines.push({
      productId,
      qty: Math.trunc(qty),
      endingQty:
        raw.endingQty === undefined || raw.endingQty === null
          ? null
          : Math.trunc(Number(raw.endingQty)),
      reviewPostingDelta:
        raw.reviewPostingDelta === undefined || raw.reviewPostingDelta === null
          ? null
          : Math.trunc(Number(raw.reviewPostingDelta)),
    })
  }

  return lines
}

export function assertNonEmptyLines(lines: SaveDocumentLineInput[]): void {
  if (lines.length === 0) {
    throw new DocumentError(
      "Document must have at least one line with non-zero qty",
      DocumentErrorCodes.EMPTY_DOCUMENT
    )
  }
}

export function assertDraftEditable(doc: StockDocumentWithLines): void {
  if (isImmutableStatus(doc.status)) {
    throw new DocumentError(
      `Document in status ${doc.status} cannot be edited`,
      DocumentErrorCodes.DOCUMENT_IMMUTABLE
    )
  }
  if (!canMutateLines(doc.status)) {
    throw new DocumentError(
      `Only DRAFT documents may be saved (status: ${doc.status})`,
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }
}

export function assertCanSubmit(doc: StockDocumentWithLines): void {
  if (doc.status !== "DRAFT") {
    throw new DocumentError(
      `Only DRAFT documents may be submitted (status: ${doc.status})`,
      DocumentErrorCodes.INVALID_DOCUMENT_STATUS
    )
  }
  const lines = buildSaveLines(
    doc.lines.map((l) => ({
      productId: l.productId,
      qty: l.qty,
      endingQty: l.endingQty,
      reviewPostingDelta: l.reviewPostingDelta,
    })),
    doc.docType
  )
  assertNonEmptyLines(lines)
}

export async function assertTransferRoute(
  tx: Prisma.TransactionClient,
  docType: DocType,
  fromLocId: string | null | undefined,
  toLocId: string | null | undefined
): Promise<void> {
  if (!TRANSFER_DOC_TYPES.has(docType)) return

  const fromId = String(fromLocId ?? "").trim()
  const toId = String(toLocId ?? "").trim()

  if (!fromId || !toId) {
    throw new DocumentError(
      "Transfer documents require both from and to locations",
      DocumentErrorCodes.INVALID_TRANSFER_ROUTE
    )
  }

  if (fromId === toId) {
    throw new DocumentError(
      "Transfer from and to locations must differ",
      DocumentErrorCodes.INVALID_TRANSFER_ROUTE
    )
  }

  const [fromBranch, toBranch] = await Promise.all([
    tx.branch.findUnique({
      where: { id: fromId },
      select: { id: true, type: true, isActive: true, deleted: true },
    }),
    tx.branch.findUnique({
      where: { id: toId },
      select: { id: true, type: true, isActive: true, deleted: true },
    }),
  ])

  if (
    !fromBranch ||
    !toBranch ||
    fromBranch.deleted ||
    toBranch.deleted ||
    !fromBranch.isActive ||
    !toBranch.isActive
  ) {
    throw new DocumentError(
      "Transfer locations must reference active branches",
      DocumentErrorCodes.INVALID_TRANSFER_ROUTE
    )
  }

  if (!isHoShopPair(fromBranch.type, toBranch.type)) {
    throw new DocumentError(
      "Transfer route must be HO ↔ SHOP only",
      DocumentErrorCodes.INVALID_TRANSFER_ROUTE
    )
  }
}

function isHoShopPair(a: BranchType, b: BranchType): boolean {
  return (a === "HO" && b === "SH") || (a === "SH" && b === "HO")
}
