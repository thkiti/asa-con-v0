import type { SessionUser } from "@/lib/auth/types"
import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  DocumentEntityError,
  parseDocumentEntityCode,
  canChooseDocumentEntity,
  type DocumentEntityCode,
} from "@/lib/legal-entity"
import { isPosShopBranchCode } from "@/lib/pos/pos-shop-session"
import { ReportError } from "@/lib/reporting/report-errors"

export const FINANCE_LEGAL_ENTITY_QUERY = "legalEntityCode"
export const FINANCE_LEGAL_ENTITY_HEADER = "X-Finance-Legal-Entity"

/** Read explicit finance entity from request query or header (no inference). */
export function readFinanceRequestLegalEntityCode(input: {
  searchParams?: URLSearchParams | null
  headers?: Headers | null
}): DocumentEntityCode | null {
  const fromQuery = parseDocumentEntityCode(
    input.searchParams?.get(FINANCE_LEGAL_ENTITY_QUERY)
  )
  if (fromQuery) return fromQuery

  const fromHeader = parseDocumentEntityCode(
    input.headers?.get(FINANCE_LEGAL_ENTITY_HEADER)
  )
  if (fromHeader) return fromHeader

  return null
}

export function assertFinanceLegalEntityAllowed(
  session: Pick<SessionUser, "role" | "branchCode">,
  legalEntityCode: DocumentEntityCode
): void {
  const branchCode = String(session.branchCode ?? "").trim()
  if (isPosShopBranchCode(branchCode) && legalEntityCode !== DEFAULT_DOCUMENT_ENTITY_CODE) {
    throw new DocumentEntityError(
      "Document entity AD is not allowed for shop branches",
      "DOCUMENT_ENTITY_NOT_ALLOWED",
      403
    )
  }

  if (
    legalEntityCode !== DEFAULT_DOCUMENT_ENTITY_CODE &&
    !canChooseDocumentEntity(session.role, branchCode)
  ) {
    throw new DocumentEntityError(
      "Document entity is not allowed for this session",
      "DOCUMENT_ENTITY_NOT_ALLOWED",
      403
    )
  }
}

/**
 * Resolve finance scope for a single request.
 * Explicit request entity wins over session cookie (tab-safe).
 */
export function resolveFinanceRequestLegalEntityCode(
  session: SessionUser,
  requested: unknown
): DocumentEntityCode {
  const parsed = parseDocumentEntityCode(requested)
  const legalEntityCode = parsed ?? session.documentEntityCode

  if (!legalEntityCode) {
    throw new ReportError("Session legal entity is required", "UNAUTHORIZED")
  }

  assertFinanceLegalEntityAllowed(session, legalEntityCode)
  return legalEntityCode
}
