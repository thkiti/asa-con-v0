import {
  staffEvidenceKeypadLabel,
  STAFF_EVIDENCE_KEYPAD_LABEL_COMPLETE,
  STAFF_EVIDENCE_KEYPAD_LABEL_PENDING,
} from "@/lib/pos-ui/staff-evidence-keypad"

describe("staffEvidenceKeypadLabel", () => {
  it("shows pending label before evidence is complete", () => {
    expect(staffEvidenceKeypadLabel(false)).toBe(STAFF_EVIDENCE_KEYPAD_LABEL_PENDING)
    expect(STAFF_EVIDENCE_KEYPAD_LABEL_PENDING).toContain("ทำประวัติ")
  })

  it("shows complete label when evidence exists", () => {
    expect(staffEvidenceKeypadLabel(true)).toBe(STAFF_EVIDENCE_KEYPAD_LABEL_COMPLETE)
    expect(STAFF_EVIDENCE_KEYPAD_LABEL_COMPLETE).toContain("ครบแล้ว")
  })
})
