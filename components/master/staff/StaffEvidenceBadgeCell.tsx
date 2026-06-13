"use client"

import { StaffEvidenceBadgeHover } from "./StaffEvidenceBadgeHover"

type StaffEvidenceBadgeCellProps = {
  staffRowId: string
  staffCode: string
  photoUploaded: boolean
  idUploaded: boolean
}

export function StaffEvidenceBadgeCell({
  staffRowId,
  staffCode,
  photoUploaded,
  idUploaded,
}: StaffEvidenceBadgeCellProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      data-testid="staff-evidence-indicators"
      aria-label={`Evidence for ${staffCode}`}
    >
      <StaffEvidenceBadgeHover
        staffRowId={staffRowId}
        staffCode={staffCode}
        kind="ph"
        tooltip="Photo"
        exists={photoUploaded}
      />
      <StaffEvidenceBadgeHover
        staffRowId={staffRowId}
        staffCode={staffCode}
        kind="id"
        tooltip="ID Card"
        exists={idUploaded}
      />
    </span>
  )
}
