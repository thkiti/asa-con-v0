"use client"

type PosEvidencePendingBannerProps = {
  count: number
  onOpen: () => void
}

export function PosEvidencePendingBanner({
  count,
  onOpen,
}: PosEvidencePendingBannerProps) {
  if (count <= 0) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="pos-evidence-pending-blink w-full rounded-lg border-2 border-red-900 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md hover:brightness-105 active:translate-y-px"
      data-testid="pos-evidence-pending-banner"
    >
      SLIP PENDING — {count} bank transfer receipt
      {count === 1 ? "" : "s"} need upload
    </button>
  )
}
