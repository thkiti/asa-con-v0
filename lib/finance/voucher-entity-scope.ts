import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type EntityScopedIdWhere = {
  id: string
  legalEntityCode: DocumentEntityCode
}

/** Composite id + legalEntityCode for voucher/journal scoped reads. */
export function entityScopedIdWhere(
  id: string,
  legalEntityCode: DocumentEntityCode
): EntityScopedIdWhere {
  return {
    id: String(id ?? "").trim(),
    legalEntityCode,
  }
}

/** Apply session entity to list filters; client query params must not widen scope. */
export function withSessionLegalEntityFilter<T extends { legalEntityCode?: DocumentEntityCode }>(
  filter: T,
  legalEntityCode: DocumentEntityCode
): T & { legalEntityCode: DocumentEntityCode } {
  return { ...filter, legalEntityCode }
}
