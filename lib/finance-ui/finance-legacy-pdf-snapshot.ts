export const LEGACY_PDF_SNAPSHOT_MISSING_TITLE = "Archived PDF snapshot is missing"

export const LEGACY_PDF_SNAPSHOT_MISSING_BODY =
  "This document does not currently have a saved PDF archive. Regenerate the archived PDF from the current voucher data."

export const LEGACY_PDF_SNAPSHOT_MISSING_READONLY_BODY =
  "This document does not currently have a saved PDF archive. Contact an administrator to regenerate the archived PDF from the current voucher data."

/** @deprecated Use LEGACY_PDF_SNAPSHOT_MISSING_TITLE + BODY */
export const LEGACY_PDF_SNAPSHOT_MISSING_MESSAGE = LEGACY_PDF_SNAPSHOT_MISSING_BODY

export const LEGACY_PDF_SNAPSHOT_ACCESS_ERROR =
  "Could not open the archived PDF. Contact an administrator to regenerate the archive."

export const LEGACY_PDF_SNAPSHOT_REPLACE_HELPER =
  "Regenerate only when the archived PDF was created by an older layout or needs repair."

export const LEGACY_PDF_SNAPSHOT_DELETE_CONFIRM =
  "Delete the archived PDF snapshot for this document? You can regenerate it afterwards."
