import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import {
  readFinanceRequestLegalEntityCode,
  resolveFinanceRequestLegalEntityCode,
} from "@/lib/finance/finance-request-scope"
import {
  withSessionLegalEntityFilter,
  type EntityScopedIdWhere,
} from "@/lib/finance/voucher-entity-scope"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { ReportError } from "@/lib/reporting/report-errors"

type FinanceVoucherActor = ReturnType<typeof requirePeriodAdminActor>

/** Route handlers may receive standard Request or NextRequest. */
export type FinanceVoucherScopeRequest = Pick<Request, "headers" | "url">

function resolveScopeFromRequest(req?: FinanceVoucherScopeRequest): unknown {
  if (!req) return null
  return readFinanceRequestLegalEntityCode({
    searchParams: new URL(req.url).searchParams,
    headers: req.headers,
  })
}

export async function requireFinanceVoucherScope(
  req?: FinanceVoucherScopeRequest
): Promise<{
  actor: FinanceVoucherActor
  legalEntityCode: DocumentEntityCode
}> {
  const session = await getSession()
  const actor = requirePeriodAdminActor(session)
  if (!session) {
    throw new ReportError("Session legal entity is required", "UNAUTHORIZED")
  }
  const legalEntityCode = resolveFinanceRequestLegalEntityCode(
    session,
    resolveScopeFromRequest(req)
  )
  return { actor, legalEntityCode }
}

export function applyFinanceVoucherListScope<T extends object>(
  filter: T,
  legalEntityCode: DocumentEntityCode
): T & { legalEntityCode: DocumentEntityCode } {
  return withSessionLegalEntityFilter(
    { ...filter, legalEntityCode },
    legalEntityCode
  )
}

export function financeVoucherEntityWhere(
  id: string,
  legalEntityCode: DocumentEntityCode
): EntityScopedIdWhere {
  return { id, legalEntityCode }
}
