import type { DocumentArchiveKind, DocumentKind } from "@/generated/prisma/client"
import type {
  DocumentArchiveStatusInput,
  DocumentArchiveTriState,
  VaultArchiveRecord,
} from "./resolve-status-types"
import { resolveDocumentArchiveStatus } from "./resolve-status"

export type ColArchiveAvailableInput = Pick<
  DocumentArchiveStatusInput,
  | "documentKind"
  | "documentId"
  | "documentNo"
  | "workflowStatus"
  | "requiredPolicy"
> & {
  archiveKind?: DocumentArchiveKind
}

/**
 * COL bank pay-in slip evidence tri-state (`archiveAvailable` column semantics).
 * Workflow gating is not wired in Phase 2 — requirement stays null unless caller
 * passes `requiredPolicy: "required"`.
 */
export function resolveColBankPayInArchiveAvailable(
  input: ColArchiveAvailableInput,
  vaultHit?: VaultArchiveRecord | null
): DocumentArchiveTriState {
  const documentKind = (input.documentKind ?? "COL") as DocumentKind
  const statusInput: DocumentArchiveStatusInput = {
    documentKind,
    documentId: input.documentId,
    documentNo: input.documentNo,
    archiveKind: input.archiveKind ?? "BANK_PAY_IN_SLIP",
    workflowStatus: input.workflowStatus,
    requiredPolicy: input.requiredPolicy,
  }

  return resolveDocumentArchiveStatus(statusInput, vaultHit).archiveAvailable
}

/** Alias for inquiry hubs that use generic archiveAvailable naming. */
export function resolveArchiveAvailable(
  input: DocumentArchiveStatusInput,
  vaultHit?: VaultArchiveRecord | null
): DocumentArchiveTriState {
  if (input.documentKind === "COL" && input.archiveKind === "BANK_PAY_IN_SLIP") {
    return resolveColBankPayInArchiveAvailable(input, vaultHit)
  }
  return resolveDocumentArchiveStatus(input, vaultHit).archiveAvailable
}
