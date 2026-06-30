export {
  DocumentArchiveError,
  DocumentArchiveErrorCodes,
  type DocumentArchiveErrorCode,
} from "./errors"

export type {
  DocumentArchivePdfFields,
  DocumentArchiveReadinessStatus,
  DocumentArchiveStatus,
  DocumentArchiveStorageBackend,
  DocumentArchiveStorageFields,
  DocumentArchiveType,
  DocumentPdfReadRef,
  StoredDocumentPdfRef,
} from "./types"

export {
  buildDocumentArchiveRefKey,
  defaultArchiveKindForDocumentKind,
  resolveArchiveRequirementPolicy,
  type ArchiveRequirementPolicy,
  ARCHIVE_UNSUPPORTED_DOCUMENT_KINDS,
  POSTED_PDF_REQUIRED_DOCUMENT_KINDS,
} from "./kinds"

export type {
  DocumentArchiveStatusInput,
  DocumentArchiveStatusResult,
  DocumentArchiveStatusSource,
  DocumentArchiveTriState,
  VaultArchiveRecord,
} from "./resolve-status-types"

export {
  resolveDocumentArchiveStatus,
  resolveDocumentArchiveStatusKey,
  resolveDocumentArchiveStatuses,
} from "./resolve-status"

export { resolvePdfAvailable } from "./resolve-pdf-available"

export {
  resolveArchiveAvailable,
  resolveColBankPayInArchiveAvailable,
  type ColArchiveAvailableInput,
} from "./resolve-col-archive-available"

export {
  isVaultArchiveRecordReadable,
  loadVaultArchivesForRefs,
  type VaultArchiveLookupPrisma,
} from "./vault-lookup"

export {
  buildDocumentArchiveReadinessPayload,
  isDocumentArchivePdfReadable,
  isDocumentArchiveStorageReadable,
  resolveDocumentArchivePdfBlobUrl,
  resolveDocumentArchiveReadinessStatus,
} from "./readiness"

export {
  assertSafeReceiptNo,
  buildReceiptArchivePdfPathname,
} from "./paths/receipt"

export {
  attachReceiptPdfArchive,
  type AttachReceiptPdfArchiveInput,
  type AttachReceiptPdfArchiveResult,
} from "./attach-receipt-pdf"

export {
  getDocumentArchivePdfRootDir,
  readStoredDocumentArchivePdf,
  resolveDocumentArchiveStorageBackend,
  resolveLocalDocumentArchivePdfAbsolutePath,
  storeDocumentArchivePdf,
} from "./storage/storage"
