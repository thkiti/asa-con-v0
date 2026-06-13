"use client"

import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"
import {
  STAFF_ID_CARD_PREVIEW_IMAGE_CLASS,
  STAFF_PHOTO_PREVIEW_IMAGE_CLASS,
} from "@/lib/pos-ui/staff-evidence-image"

type StaffEvidenceImageHoverPreviewProps = {
  kind: StaffEvidenceFileKind
  staffId: string
  top: number
  left: number
  loading: boolean
  imageUrl: string | null
  imageFailed: boolean
  onImageError: () => void
}

export function StaffEvidenceImageHoverPreview({
  kind,
  staffId,
  top,
  left,
  loading,
  imageUrl,
  imageFailed,
  onImageError,
}: StaffEvidenceImageHoverPreviewProps) {
  const showImage = Boolean(imageUrl) && !imageFailed && !loading
  const isPortrait = kind === "ph"
  const label = kind === "ph" ? "Staff photo" : "ID card"
  const imageClass = isPortrait
    ? STAFF_PHOTO_PREVIEW_IMAGE_CLASS
    : STAFF_ID_CARD_PREVIEW_IMAGE_CLASS

  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{ top, left }}
      data-testid={`staff-evidence-hover-preview-${kind}`}
      role="tooltip"
    >
      <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white p-1 shadow-md">
        {loading ? (
          <div className="flex min-h-24 w-40 items-center justify-center px-3 py-4">
            <span className="text-xs text-zinc-500">Loading…</span>
          </div>
        ) : showImage ? (
          <img
            src={imageUrl!}
            alt={`${label} for ${staffId}`}
            className={imageClass}
            loading="lazy"
            onError={onImageError}
          />
        ) : (
          <div className="flex min-h-24 w-40 items-center justify-center px-3 py-4">
            <span className="text-xs text-zinc-500">No image</span>
          </div>
        )}
      </div>
    </div>
  )
}
