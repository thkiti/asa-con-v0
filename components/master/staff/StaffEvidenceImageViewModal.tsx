"use client"

import { useEffect, useState, type ReactNode } from "react"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"

/** Viewport-fit preview — aligned with POS catalog image modal sizing. */
const STAFF_EVIDENCE_PREVIEW_IMAGE_CLASS =
  "block h-auto max-h-[90vh] w-auto max-w-[90vw] object-contain"

type StaffEvidenceImageViewModalProps = {
  open: boolean
  title: string
  staffCode: string
  kind: StaffEvidenceFileKind
  /** Fetching signed/public URL from API */
  urlLoading?: boolean
  /** Set when the evidence API request fails */
  fetchError?: string | null
  imageUrl: string | null
  onClose: () => void
}

function normalizeImageUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null
  const trimmed = url.trim()
  return trimmed.length > 0 ? trimmed : null
}

function PreviewCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/75 text-lg leading-none text-white shadow-lg transition hover:bg-black/90"
      onClick={onClose}
      aria-label="Close preview"
      data-testid="staff-evidence-view-close"
    >
      ×
    </button>
  )
}

export function StaffEvidenceImageViewModal({
  open,
  title,
  staffCode,
  kind,
  urlLoading = false,
  fetchError = null,
  imageUrl,
  onClose,
}: StaffEvidenceImageViewModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)

  const validUrl = normalizeImageUrl(imageUrl)

  useEffect(() => {
    if (!open) {
      setImageLoaded(false)
      setImageLoadError(false)
      return
    }
    setImageLoaded(false)
    setImageLoadError(false)
  }, [open, validUrl, kind])

  if (!open) return null

  const waitingForImage =
    Boolean(validUrl) && !urlLoading && !fetchError && !imageLoaded && !imageLoadError

  let body: ReactNode
  if (urlLoading) {
    body = (
      <p className="px-6 py-10 text-sm text-white/80" data-testid="staff-evidence-view-loading">
        Loading…
      </p>
    )
  } else if (fetchError) {
    body = (
      <p
        className="px-6 py-10 text-sm text-red-300"
        role="alert"
        data-testid="staff-evidence-view-fetch-error"
      >
        {fetchError}
      </p>
    )
  } else if (!validUrl) {
    body = (
      <p
        className="px-6 py-10 text-sm text-white/80"
        data-testid="staff-evidence-view-not-found"
      >
        Image not found
      </p>
    )
  } else if (imageLoadError) {
    body = (
      <p
        className="px-6 py-10 text-sm text-red-300"
        role="alert"
        data-testid="staff-evidence-view-load-error"
      >
        Failed to load image
      </p>
    )
  } else {
    body = (
      <>
        {waitingForImage ? (
          <p
            className="absolute inset-0 flex items-center justify-center text-sm text-white/80"
            data-testid="staff-evidence-view-loading"
          >
            Loading…
          </p>
        ) : null}
        <img
          src={validUrl}
          alt={`${title} for ${staffCode}`}
          className={`${STAFF_EVIDENCE_PREVIEW_IMAGE_CLASS}${waitingForImage ? " invisible" : ""}`}
          data-testid={`staff-evidence-view-image-${kind}`}
          onLoad={() => {
            setImageLoaded(true)
          }}
          onError={(event) => {
            console.error("[StaffEvidenceImageViewModal] image load failed", {
              kind,
              staffCode,
              title,
              url: validUrl,
              eventType: event.type,
            })
            setImageLoadError(true)
          }}
        />
      </>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      data-testid={`staff-evidence-view-modal-${kind}`}
      onClick={onClose}
    >
      <div
        className="relative inline-flex max-w-[90vw] items-center justify-center"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} preview`}
      >
        <PreviewCloseButton onClose={onClose} />
        {body}
      </div>
    </div>
  )
}
