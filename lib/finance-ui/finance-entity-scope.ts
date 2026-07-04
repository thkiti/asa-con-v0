import {
  FINANCE_LEGAL_ENTITY_QUERY,
} from "@/lib/finance/finance-request-scope"
import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  parseDocumentEntityCode,
  type DocumentEntityCode,
} from "@/lib/legal-entity"

export { FINANCE_LEGAL_ENTITY_QUERY }

export function readFinanceLegalEntityFromSearchParams(
  params: Pick<URLSearchParams, "get">
): DocumentEntityCode | null {
  return parseDocumentEntityCode(params.get(FINANCE_LEGAL_ENTITY_QUERY))
}

export function resolveFinanceLegalEntityCode(
  requested: unknown,
  sessionFallback?: DocumentEntityCode | null
): DocumentEntityCode {
  return (
    parseDocumentEntityCode(requested) ??
    sessionFallback ??
    DEFAULT_DOCUMENT_ENTITY_CODE
  )
}

/** Append or replace legalEntityCode on a path or relative API URL. */
export function appendFinanceLegalEntityToPath(
  path: string,
  legalEntityCode: DocumentEntityCode
): string {
  const raw = String(path ?? "").trim()
  if (!raw) return `?${FINANCE_LEGAL_ENTITY_QUERY}=${legalEntityCode}`

  const hashIndex = raw.indexOf("#")
  const hash = hashIndex === -1 ? "" : raw.slice(hashIndex)
  const withoutHash = hashIndex === -1 ? raw : raw.slice(0, hashIndex)

  const queryIndex = withoutHash.indexOf("?")
  const pathname = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex)
  const search = queryIndex === -1 ? "" : withoutHash.slice(queryIndex + 1)

  const params = new URLSearchParams(search)
  params.set(FINANCE_LEGAL_ENTITY_QUERY, legalEntityCode)
  const query = params.toString()
  return `${pathname}?${query}${hash}`
}

export function appendFinanceLegalEntityToApiUrl(
  url: string,
  legalEntityCode: DocumentEntityCode
): string {
  const raw = String(url ?? "").trim()
  if (!raw.includes("?")) {
    return `${raw}?${FINANCE_LEGAL_ENTITY_QUERY}=${legalEntityCode}`
  }
  return appendFinanceLegalEntityToPath(raw, legalEntityCode)
}

export async function financeScopedFetch(
  legalEntityCode: DocumentEntityCode,
  input: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(appendFinanceLegalEntityToApiUrl(input, legalEntityCode), init)
}
