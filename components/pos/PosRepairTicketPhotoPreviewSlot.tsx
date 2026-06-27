"use client"

export type SelectedRepairPhoto = {
  fileName: string
  url: string
  ticketNo: string
}

type PosRepairTicketPhotoPreviewSlotProps = {
  selected: SelectedRepairPhoto | null
  previewImageError: boolean
  onClose: () => void
  onImageError: (url: string) => void
}

/** Fixed keypad-side preview while Repair Ticket list mode is active. */
export function PosRepairTicketPhotoPreviewSlot({
  selected,
  previewImageError,
  onClose,
  onImageError,
}: PosRepairTicketPhotoPreviewSlotProps) {
  return (
    <div
      className="pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-zinc-500/50 bg-zinc-200/90 shadow-inner"
      data-testid="repair-ticket-photo-preview"
    >
      {selected ? (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-400/60 bg-zinc-300/80 px-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] font-semibold text-zinc-800">
                {selected.fileName}
              </p>
              <p className="truncate font-mono text-[9px] text-zinc-600">{selected.ticketNo}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded border border-zinc-500/60 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-800 hover:bg-white"
              aria-label="ปิดภาพ"
            >
              ปิด
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-zinc-900/90 p-1">
            {previewImageError ? (
              <div className="px-3 py-4 text-center text-xs text-zinc-200">
                <p className="font-semibold text-amber-300">โหลดรูปไม่ได้</p>
                {process.env.NODE_ENV === "development" ? (
                  <p className="mt-1 break-all font-mono text-[9px] text-zinc-400">
                    {selected.url}
                  </p>
                ) : null}
              </div>
            ) : (
              <img
                src={selected.url}
                alt={selected.fileName}
                className="max-h-full max-w-full min-h-0 flex-1 object-contain"
                loading="eager"
                onError={() => onImageError(selected.url)}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-0 items-center justify-center px-4 text-center text-sm font-medium leading-snug text-zinc-600">
          เลือกรูปจากรายการ Repair Ticket เพื่อดูภาพ
        </div>
      )}
    </div>
  )
}
