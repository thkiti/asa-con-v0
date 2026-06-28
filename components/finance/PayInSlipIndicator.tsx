"use client"

type PayInEvidenceUiStatus = "PENDING" | "UPLOADED" | "MISSING" | null

type PayInSlipIndicatorProps = {
  status: PayInEvidenceUiStatus
  missingWarning?: boolean
  onUpload?: () => void
  onPreview?: () => void
  testId?: string
}

export function PayInSlipIndicator({
  status,
  missingWarning = false,
  onUpload,
  onPreview,
  testId,
}: PayInSlipIndicatorProps) {
  const uploaded = status === "UPLOADED"
  const title = missingWarning
    ? "Missing PAY-IN slip"
    : uploaded
      ? "View PAY-IN Slip"
      : "Upload PAY-IN Slip"

  const handleClick = () => {
    if (uploaded && onPreview) {
      onPreview()
      return
    }
    if (!uploaded && onUpload) {
      onUpload()
    }
  }

  const canClick = (uploaded && onPreview) || (!uploaded && onUpload)

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      data-testid={testId}
      disabled={!canClick}
      onClick={handleClick}
      className={[
        "inline-flex h-6 w-6 items-center justify-center rounded-full border-0 bg-transparent p-0",
        canClick ? "cursor-pointer" : "cursor-default opacity-70",
      ].join(" ")}
    >
      <span
        className={[
          "block h-3 w-3 rounded-full border",
          missingWarning
            ? "border-amber-500 bg-amber-100"
            : uploaded
              ? "border-emerald-600 bg-emerald-500"
              : "border-zinc-300 bg-zinc-200",
        ].join(" ")}
        aria-hidden
      />
    </button>
  )
}

export type { PayInEvidenceUiStatus }
