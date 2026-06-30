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
  ensureLegacyMjvArchiveLink,
  ensureLegacyReceiptArchiveLink,
  loadLegacyMjvArchiveContext,
  loadLegacyReceiptArchiveContext,
  loadLegacyPilotReceiptArchiveRow,
  type LegacyBridgeDb,
  type LegacyBridgeResult,
} from "./legacy-bridge"

export {
  getDocumentArchiveStatus,
  loadActiveArchiveByDocumentRef,
  loadActiveArchiveByDocumentRefWithBridge,
  loadActiveArchiveById,
  safeArchiveDownloadFileName,
  type DocumentArchiveDownloadDb,
  type DocumentArchiveStatusDb,
  type DocumentArchiveStatusOptions,
  type DocumentArchiveStatusPayload,
  type DocumentArchiveStatusQuery,
} from "./get-archive-status"

export {
  uploadDocumentArchive,
  type UploadDocumentArchiveInput,
  type UploadDocumentArchiveResult,
  type ActiveArchiveDownloadRow,
} from "./upload-archive"

export {
  assertArchiveFileSize,
  assertMimeTypeAllowedForArchiveKind,
  normalizeMimeType,
  parseArchiveRequirementPolicy,
  parseDocumentArchiveKind,
  parseDocumentArchiveLinks,
  parseDocumentKind,
  type DocumentArchiveLinkInput,
  MAX_DOCUMENT_ARCHIVE_FILE_BYTES,
} from "./validation"

export { buildVaultArchiveStoragePathname } from "./paths/vault"

export {
  readStoredDocumentArchive,
  storeDocumentArchiveFile,
  type DocumentArchiveReadRef,
  type StoredDocumentArchiveRef,
} from "./storage/store-archive-file"

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
