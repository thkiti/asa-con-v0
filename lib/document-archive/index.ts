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
  DocumentArchiveType,
  DocumentPdfReadRef,
  StoredDocumentPdfRef,
} from "./types"

export {
  buildDocumentArchiveReadinessPayload,
  isDocumentArchivePdfReadable,
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
