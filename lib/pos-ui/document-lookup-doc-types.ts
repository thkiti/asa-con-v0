import type { Role } from "@/lib/shared"

export type PosDocumentLookupDocType =
  | "receipt"
  | "refund"
  | "collector"
  | "read-z"

export type PosDocumentLookupDocTypeOption = {
  id: PosDocumentLookupDocType
  label: string
  enabled: boolean
}

/** POS Document Lookup — receipt, refund, collector, and READ Z. */
export const POS_DOCUMENT_LOOKUP_DOC_TYPES: readonly PosDocumentLookupDocTypeOption[] =
  [
    { id: "receipt", label: "Receipt", enabled: true },
    { id: "refund", label: "Refund", enabled: true },
    { id: "collector", label: "Collector", enabled: true },
    { id: "read-z", label: "READ Z", enabled: true },
  ]

/** Enabled document types are available to all POS Document Lookup users. */
export function isPosDocumentLookupDocTypeAvailable(
  docType: PosDocumentLookupDocType,
  _role?: Role
): boolean {
  return isPosDocumentLookupDocTypeEnabled(docType)
}

export function documentLookupUsesReadZLookup(
  docType: PosDocumentLookupDocType
): boolean {
  return docType === "read-z"
}

export function documentLookupUsesDaySelector(
  _docType: PosDocumentLookupDocType
): boolean {
  return false
}

export function documentLookupUsesCumulativeAction(
  docType: PosDocumentLookupDocType
): boolean {
  return docType === "read-z"
}

export function isPosDocumentLookupDocTypeEnabled(
  docType: PosDocumentLookupDocType
): boolean {
  return (
    POS_DOCUMENT_LOOKUP_DOC_TYPES.find((row) => row.id === docType)?.enabled ??
    false
  )
}

/** Enabled document types use a running dropdown. */
export function documentLookupUsesRunningInput(
  _docType: PosDocumentLookupDocType
): boolean {
  return false
}

export function documentLookupUsesRunningDropdown(
  docType: PosDocumentLookupDocType
): boolean {
  return isPosDocumentLookupDocTypeEnabled(docType)
}

export function documentLookupUsesReceiptDateFilter(
  docType: PosDocumentLookupDocType
): boolean {
  return docType === "receipt" || docType === "read-z"
}
