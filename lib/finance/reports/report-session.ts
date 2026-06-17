import { getSession } from "@/lib/auth"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { ReportError } from "@/lib/reporting/report-errors"

/** Session legal entity for finance report APIs — no silent default. */
export async function resolveReportSessionLegalEntityCode(): Promise<DocumentEntityCode> {
  const session = await getSession()
  if (!session?.documentEntityCode) {
    throw new ReportError("Session legal entity is required", "UNAUTHORIZED")
  }
  return session.documentEntityCode
}
