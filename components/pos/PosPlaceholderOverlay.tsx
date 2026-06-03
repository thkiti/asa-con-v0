"use client"

import {
  getPosPlaceholderPhaseHint,
  getPosPlaceholderTitle,
} from "@/lib/pos-ui/pos-actions"
import type { PosPlaceholderId } from "@/lib/pos-ui/types"

type PosPlaceholderOverlayProps = {
  placeholderId: PosPlaceholderId
  onClose: () => void
}

export function PosPlaceholderOverlay({
  placeholderId,
  onClose,
}: PosPlaceholderOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-orange-600/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-placeholder-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-lg font-bold leading-none shadow hover:bg-white/30"
      >
        ×
      </button>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <h2
          id="pos-placeholder-title"
          className="text-xl font-bold tracking-wide"
        >
          {getPosPlaceholderTitle(placeholderId)}
        </h2>
        <p className="max-w-sm text-sm text-white/90">
          {getPosPlaceholderPhaseHint(placeholderId)}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/60 bg-white/15 px-6 py-2 text-sm font-bold shadow hover:bg-white/25"
        >
          Close
        </button>
      </div>
    </div>
  )
}
