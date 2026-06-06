import {
  getRefundReasonLabel,
  isValidRefundReasonCode,
  REFUND_REASONS,
  resolveRefundReason,
} from "@/lib/pos/refund-reasons"

describe("refund-reasons", () => {
  it("lists all four KPI reason codes", () => {
    expect(REFUND_REASONS).toHaveLength(4)
    expect(REFUND_REASONS.map((row) => row.code)).toEqual([
      "KEY_BLANK_MISTAKE",
      "INSERTS_BUT_DOES_NOT_TURN",
      "CUSTOMER_REJECTED_FINISH",
      "FAILED_AFTER_MULTIPLE_REWORKS",
    ])
  })

  it("maps reason codes to Thai display labels", () => {
    expect(getRefundReasonLabel("KEY_BLANK_MISTAKE")).toBe(
      "ผิดแบบ (Key Blank mistake) ใส่ไม่เข้า"
    )
    expect(getRefundReasonLabel("INSERTS_BUT_DOES_NOT_TURN")).toBe("เข้าได้ ไขไม่ได้")
  })

  it("validates allowed reason codes", () => {
    expect(isValidRefundReasonCode("KEY_BLANK_MISTAKE")).toBe(true)
    expect(isValidRefundReasonCode("GOODWILL")).toBe(false)
    expect(isValidRefundReasonCode("")).toBe(false)
  })

  it("resolves reasonCode and label together", () => {
    expect(resolveRefundReason("CUSTOMER_REJECTED_FINISH")).toEqual({
      reasonCode: "CUSTOMER_REJECTED_FINISH",
      reason: "ลูกค้าไม่รับ ทำให้ไม่เรียบร้อย",
    })
    expect(resolveRefundReason("INVALID")).toBeNull()
  })
})
