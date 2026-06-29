export const FINANCE_DOCUMENT_INQUIRY_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "POSTED", label: "Posted" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "VOIDED", label: "Voided" },
] as const

export const FINANCE_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "posted", label: "Posted" },
  { value: "unposted", label: "Unposted" },
] as const

export const FINANCE_DOCUMENT_INQUIRY_PDF_STATE_OPTIONS = [
  { value: "", label: "Any PDF" },
  { value: "has", label: "PDF exists" },
  { value: "missing", label: "PDF missing" },
] as const
