export const STAFF_EVIDENCE_KEYPAD_LABEL_PENDING = "ทำประวัติ\nพนักงาน"
export const STAFF_EVIDENCE_KEYPAD_LABEL_COMPLETE = "ประวัติ\nครบแล้ว"

export function staffEvidenceKeypadLabel(evidenceComplete: boolean): string {
  return evidenceComplete
    ? STAFF_EVIDENCE_KEYPAD_LABEL_COMPLETE
    : STAFF_EVIDENCE_KEYPAD_LABEL_PENDING
}
