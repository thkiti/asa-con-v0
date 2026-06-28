export type PayInEvidenceUiStatus = "PENDING" | "UPLOADED" | "MISSING" | null

export function isPayInEvidenceUploadedStatus(
  status: PayInEvidenceUiStatus | undefined
): boolean {
  return status === "UPLOADED"
}

export function payInSlipIndicatorTitle(input: {
  uploaded: boolean
  missingWarning?: boolean
}): string {
  if (input.missingWarning) return "Missing PAY-IN slip"
  if (input.uploaded) return "View PAY-IN Slip"
  return "Upload PAY-IN Slip"
}
