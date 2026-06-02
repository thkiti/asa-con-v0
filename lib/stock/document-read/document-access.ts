import type { DocType, StockDocument } from "@/generated/prisma/client"
import type { SessionUser } from "@/lib/auth/types"
import type { Role } from "@/lib/shared"
import { DocumentError, DocumentErrorCodes } from "../document/document-errors"
import { SHOP_STOCK_DOC_TYPES } from "./constants"

export class StockDocumentAuthError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "StockDocumentAuthError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

const HO_ROLES: ReadonlySet<Role> = new Set([
  "HO_FINANCE",
  "HO_ADMIN",
  "HO_OPERATIONS",
])

export function isHoRole(role: Role): boolean {
  return HO_ROLES.has(role)
}

export function requireStockDocumentSession(
  session: SessionUser | null
): SessionUser {
  if (!session) {
    throw new StockDocumentAuthError(
      "Authentication required",
      "UNAUTHENTICATED",
      401
    )
  }
  if (!session.staffId.trim()) {
    throw new StockDocumentAuthError(
      "Staff ID missing from session",
      "MISSING_STAFF_ID",
      401
    )
  }
  return session
}

/** Resolve branch filter for list queries. Shop staff are pinned to session branch. */
export function resolveListBranchId(
  session: SessionUser,
  requestedBranchId: string | null | undefined
): string {
  const requested = String(requestedBranchId ?? "").trim()
  const sessionBranch = session.branchId.trim()

  if (session.role === "SH_STAFF") {
    if (!sessionBranch) {
      throw new StockDocumentAuthError(
        "Shop session requires branchId",
        "BRANCH_ACCESS_DENIED",
        403
      )
    }
    if (requested && requested !== sessionBranch) {
      throw new StockDocumentAuthError(
        "Shop staff may only access their own branch",
        "BRANCH_ACCESS_DENIED",
        403
      )
    }
    return sessionBranch
  }

  if (requested) return requested
  if (sessionBranch) return sessionBranch

  throw new StockDocumentAuthError(
    "branchId is required",
    "BRANCH_ACCESS_DENIED",
    400
  )
}

export function listDocTypesForRole(role: Role): readonly DocType[] | undefined {
  if (role === "SH_STAFF") return SHOP_STOCK_DOC_TYPES
  return undefined
}

export function documentTouchesBranch(
  doc: Pick<StockDocument, "branchId" | "fromLocId" | "toLocId">,
  branchId: string
): boolean {
  return (
    doc.branchId === branchId ||
    doc.fromLocId === branchId ||
    doc.toLocId === branchId
  )
}

export function assertCanReadDocument(
  session: SessionUser,
  doc: Pick<StockDocument, "branchId" | "fromLocId" | "toLocId" | "docType">
): void {
  if (session.role === "SH_STAFF") {
    if (!SHOP_STOCK_DOC_TYPES.includes(doc.docType)) {
      throw new DocumentError(
        "Document not found",
        DocumentErrorCodes.DOCUMENT_NOT_FOUND,
        404
      )
    }
    const branchId = session.branchId.trim()
    if (!branchId || !documentTouchesBranch(doc, branchId)) {
      throw new DocumentError(
        "Document not found",
        DocumentErrorCodes.DOCUMENT_NOT_FOUND,
        404
      )
    }
    return
  }

  if (isHoRole(session.role)) {
    const branchId = session.branchId.trim()
    if (branchId && !documentTouchesBranch(doc, branchId)) {
      throw new DocumentError(
        "Document not found",
        DocumentErrorCodes.DOCUMENT_NOT_FOUND,
        404
      )
    }
  }
}
