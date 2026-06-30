import { isManualJournalPdfReadable } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-readiness"
import {
  buildDocumentArchiveRefKey,
  POSTED_PDF_REQUIRED_DOCUMENT_KINDS,
  resolveArchiveRequirementPolicy,
} from "./kinds"
import type { ArchiveRequirementPolicy } from "./kinds"
import {
  isDocumentArchiveStorageReadable,
  resolveDocumentArchiveReadinessStatus,
} from "./readiness"
import type {
  DocumentArchiveStatusInput,
  DocumentArchiveStatusResult,
  DocumentArchiveStatusSource,
  DocumentArchiveTriState,
  VaultArchiveRecord,
} from "./resolve-status-types"
import {
  isVaultArchiveRecordReadable,
  loadVaultArchivesForRefs,
  type VaultArchiveLookupPrisma,
} from "./vault-lookup"

export type { DocumentArchiveStatusInput, DocumentArchiveStatusResult } from "./resolve-status-types"

function availableResult(
  source: DocumentArchiveStatusSource,
  input: DocumentArchiveStatusInput
): DocumentArchiveStatusResult {
  const pdfAvailable = isPdfArchiveKind(input) ? true : null
  const archiveAvailable = isArchiveEvidenceKind(input) ? true : null
  return { pdfAvailable, archiveAvailable, source }
}

function isPdfArchiveKind(input: DocumentArchiveStatusInput): boolean {
  return (
    input.archiveKind === "DOCUMENT_PDF" ||
    input.archiveKind === "RECEIPT_SLIP" ||
    input.archiveKind === "REFUND_SLIP" ||
    input.archiveKind === "READ_REPORT"
  )
}

function isArchiveEvidenceKind(input: DocumentArchiveStatusInput): boolean {
  return input.archiveKind === "BANK_PAY_IN_SLIP"
}

function resolveTriStateWhenMissing(input: {
  policy: ArchiveRequirementPolicy
  hasArchiveAttempt: boolean
}): DocumentArchiveTriState {
  if (input.policy === "unsupported") {
    return null
  }
  if (input.policy === "required") {
    return false
  }
  return input.hasArchiveAttempt ? false : null
}

function hasLegacyArchiveAttempt(input: DocumentArchiveStatusInput): boolean {
  const archive = input.legacyDocumentArchive
  if (!archive) {
    return false
  }
  const status = String(archive.status ?? "").trim()
  return status.length > 0 && status !== "ACTIVE" && status !== "READY"
}

function resolveLegacyManualJournalPdfAvailable(
  input: DocumentArchiveStatusInput
): boolean | null {
  if (!POSTED_PDF_REQUIRED_DOCUMENT_KINDS.has(input.documentKind)) {
    return null
  }
  if (input.archiveKind !== "DOCUMENT_PDF") {
    return null
  }

  const workflowStatus = String(input.workflowStatus ?? "").trim().toUpperCase()
  if (workflowStatus && workflowStatus !== "POSTED") {
    return null
  }

  if (!input.legacyPdfPath && input.legacyPdfBlobUrl == null && !workflowStatus) {
    return null
  }

  return isManualJournalPdfReadable({
    status: "POSTED",
    pdfPath: input.legacyPdfPath ?? null,
    pdfBlobUrl: input.legacyPdfBlobUrl,
  })
}

function resolveLegacyReceiptPdfAvailable(
  input: DocumentArchiveStatusInput
): boolean | null {
  if (input.documentKind !== "REC" || input.archiveKind !== "RECEIPT_SLIP") {
    return null
  }

  const receiptPath = String(
    input.legacyReceiptPdfPath ?? input.legacyPdfPath ?? ""
  ).trim()
  if (receiptPath) {
    return true
  }

  const archive = input.legacyDocumentArchive
  if (!archive) {
    return null
  }

  if (isDocumentArchiveStorageReadable(archive)) {
    return true
  }

  const readiness = resolveDocumentArchiveReadinessStatus(archive)
  if (readiness === "failed" || readiness === "pending") {
    return false
  }

  return null
}

function resolveLegacyReadable(
  input: DocumentArchiveStatusInput
): { readable: boolean; source: DocumentArchiveStatusSource } | null {
  const manualJournal = resolveLegacyManualJournalPdfAvailable(input)
  if (manualJournal === true) {
    return { readable: true, source: "legacy" }
  }
  if (manualJournal === false) {
    return { readable: false, source: "legacy" }
  }

  const receipt = resolveLegacyReceiptPdfAvailable(input)
  if (receipt === true) {
    return { readable: true, source: "legacy" }
  }
  if (receipt === false) {
    return { readable: false, source: "legacy" }
  }

  return null
}

function formatUnavailableResult(
  input: DocumentArchiveStatusInput,
  source: DocumentArchiveStatusSource,
  triState: DocumentArchiveTriState
): DocumentArchiveStatusResult {
  const pdfAvailable = isPdfArchiveKind(input) ? triState : null
  const archiveAvailable = isArchiveEvidenceKind(input) ? triState : null
  return { pdfAvailable, archiveAvailable, source }
}

/**
 * Resolve tri-state archive/pdf availability for one document ref.
 * Vault hit is optional — pass when already loaded (batch) or omit for legacy-only resolution.
 */
export function resolveDocumentArchiveStatus(
  input: DocumentArchiveStatusInput,
  vaultHit?: VaultArchiveRecord | null
): DocumentArchiveStatusResult {
  const policy = resolveArchiveRequirementPolicy(input)

  if (isVaultArchiveRecordReadable(vaultHit)) {
    return availableResult("vault", input)
  }

  const legacy = resolveLegacyReadable(input)
  if (legacy?.readable) {
    return availableResult(legacy.source, input)
  }

  if (legacy?.readable === false) {
    return formatUnavailableResult(input, legacy.source, false)
  }

  const hasAttempt = Boolean(vaultHit) || hasLegacyArchiveAttempt(input)

  const triState = resolveTriStateWhenMissing({ policy, hasArchiveAttempt: hasAttempt })
  return formatUnavailableResult(input, "policy", triState)
}

export function resolveDocumentArchiveStatusKey(
  input: Pick<DocumentArchiveStatusInput, "documentKind" | "documentId" | "archiveKind">
): string {
  return buildDocumentArchiveRefKey(
    input.documentKind,
    input.documentId,
    input.archiveKind
  )
}

/**
 * Batch resolver — one vault query for all refs, then per-input tri-state map.
 */
export async function resolveDocumentArchiveStatuses(
  prisma: VaultArchiveLookupPrisma | null,
  inputs: DocumentArchiveStatusInput[]
): Promise<Map<string, DocumentArchiveStatusResult>> {
  const vaultByKey =
    prisma && inputs.length
      ? await loadVaultArchivesForRefs(prisma, inputs)
      : new Map<string, VaultArchiveRecord>()

  const results = new Map<string, DocumentArchiveStatusResult>()
  for (const input of inputs) {
    const key = resolveDocumentArchiveStatusKey(input)
    const vaultHit = vaultByKey.get(key) ?? null
    results.set(key, resolveDocumentArchiveStatus(input, vaultHit))
  }
  return results
}
