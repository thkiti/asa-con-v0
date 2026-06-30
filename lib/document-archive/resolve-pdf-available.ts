import type {
  DocumentArchiveStatusInput,
  DocumentArchiveTriState,
  VaultArchiveRecord,
} from "./resolve-status-types"
import { resolveDocumentArchiveStatus } from "./resolve-status"

export function resolvePdfAvailable(
  input: DocumentArchiveStatusInput,
  vaultHit?: VaultArchiveRecord | null
): DocumentArchiveTriState {
  return resolveDocumentArchiveStatus(input, vaultHit).pdfAvailable
}
