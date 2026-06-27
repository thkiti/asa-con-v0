"use client"

import { RECEIPT_SLIP_MONO_CLASS } from "@/lib/thermal/receipt-slip-fonts"

type RepairTicketPhotoListProps = {
  fileNames: readonly string[]
  testId?: string
}

const monoLineClass = `${RECEIPT_SLIP_MONO_CLASS} receipt-slip-mono-line leading-tight text-zinc-900`

/** Repair ticket photo filenames — grid rows that wrap (preview + thermal print clone). */
export function RepairTicketPhotoList({
  fileNames,
  testId = "repair-ticket-photo-list",
}: RepairTicketPhotoListProps) {
  if (fileNames.length === 0) return null

  return (
    <div
      className="repair-ticket-photo-list receipt-setup-mono-body space-y-0.5 pt-0.5"
      data-testid={testId}
    >
      <div className={`${monoLineClass} receipt-setup-mono-text-line`}>
        Photos ({fileNames.length})
      </div>
      {fileNames.map((fileName, index) => (
        <div key={`${index}-${fileName}`} className="repairTicketPhotoRow">
          <span className="repairTicketPhotoIndex">{index + 1}.</span>
          <span className="repairTicketPhotoFileName">{fileName}</span>
        </div>
      ))}
    </div>
  )
}
