import { getSession } from "@/lib/auth"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { ReportError } from "@/lib/reporting/report-errors"

/** Session legal entity for finance voucher/document APIs — no silent default. */
export function resolveFinanceSessionLegalEntityCode(
  session: { documentEntityCode?: DocumentEntityCode | null } | null | undefined
): DocumentEntityCode {
  if (!session?.documentEntityCode) {
    throw new ReportError("Session legal entity is required", "UNAUTHORIZED")
  }
  return session.documentEntityCode
}

export async function resolveFinanceSessionLegalEntityCodeFromCookies(): Promise<DocumentEntityCode> {
  return resolveFinanceSessionLegalEntityCode(await getSession())
}
