"use client"

type PayInEvidenceUiStatus = "PENDING" | "UPLOADED" | "MISSING" | null

type PayInSlipIndicatorProps = {
  status: PayInEvidenceUiStatus
  missingWarning?: boolean
  onUpload?: () => void
  onPreview?: () => void
  testId?: string
}

function payInSlipIndicatorTitle(input: {
  uploaded: boolean
  missingWarning?: boolean
}): string {
  if (input.missingWarning) return "Missing PAY-IN slip"
  if (input.uploaded) return "View PAY-IN Slip"
  return "Upload PAY-IN Slip"
}

export function PayInSlipIndicator({
  status,
  missingWarning = false,
  onUpload,
  onPreview,
  testId,
}: PayInSlipIndicatorProps) {
  const uploaded = status === "UPLOADED"
  const title = payInSlipIndicatorTitle({ uploaded, missingWarning })

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
        "inline-flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
        missingWarning
          ? "border-amber-500 bg-amber-50 text-amber-700"
          : uploaded
            ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            : "border-zinc-300 bg-zinc-50 text-zinc-400 hover:border-zinc-400 hover:bg-zinc-100",
        canClick ? "cursor-pointer" : "cursor-default opacity-70",
      ].join(" ")}
    >
      <span
        className={[
          "block rounded-full",
          uploaded ? "h-3 w-3 bg-white" : "h-4 w-4 border-2 border-current bg-transparent",
        ].join(" ")}
        aria-hidden
      />
    </button>
  )
}

export type { PayInEvidenceUiStatus }
