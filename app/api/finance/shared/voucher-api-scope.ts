import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { resolveFinanceSessionLegalEntityCode } from "@/lib/finance/finance-session"
import {
  withSessionLegalEntityFilter,
  type EntityScopedIdWhere,
} from "@/lib/finance/voucher-entity-scope"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

type FinanceVoucherActor = ReturnType<typeof requirePeriodAdminActor>

export async function requireFinanceVoucherScope(): Promise<{
  actor: FinanceVoucherActor
  legalEntityCode: DocumentEntityCode
}> {
  const session = await getSession()
  const actor = requirePeriodAdminActor(session)
  const legalEntityCode = resolveFinanceSessionLegalEntityCode(session)
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
