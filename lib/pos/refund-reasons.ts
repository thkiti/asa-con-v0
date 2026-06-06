export const REFUND_REASON_CODES = [
  "KEY_BLANK_MISTAKE",
  "INSERTS_BUT_DOES_NOT_TURN",
  "CUSTOMER_REJECTED_FINISH",
  "FAILED_AFTER_MULTIPLE_REWORKS",
] as const

export type RefundReasonCode = (typeof REFUND_REASON_CODES)[number]

export type RefundReasonDefinition = {
  code: RefundReasonCode
  label: string
}

export const REFUND_REASONS: readonly RefundReasonDefinition[] = [
  {
    code: "KEY_BLANK_MISTAKE",
    label: "ผิดแบบ (Key Blank mistake) ใส่ไม่เข้า",
  },
  {
    code: "INSERTS_BUT_DOES_NOT_TURN",
    label: "เข้าได้ ไขไม่ได้",
  },
  {
    code: "CUSTOMER_REJECTED_FINISH",
    label: "ลูกค้าไม่รับ ทำให้ไม่เรียบร้อย",
  },
  {
    code: "FAILED_AFTER_MULTIPLE_REWORKS",
    label: "แก้แล้วหลายครั้ง ใช้ไม่ได้",
  },
] as const

const REASON_BY_CODE = new Map<RefundReasonCode, RefundReasonDefinition>(
  REFUND_REASONS.map((row) => [row.code, row])
)

export function isValidRefundReasonCode(
  value: unknown
): value is RefundReasonCode {
  return (
    typeof value === "string" &&
    (REFUND_REASON_CODES as readonly string[]).includes(value)
  )
}

export function getRefundReasonLabel(code: RefundReasonCode): string {
  return REASON_BY_CODE.get(code)?.label ?? code
}

export function resolveRefundReason(
  reasonCode: unknown
): { reasonCode: RefundReasonCode; reason: string } | null {
  if (!isValidRefundReasonCode(reasonCode)) return null
  return {
    reasonCode,
    reason: getRefundReasonLabel(reasonCode),
  }
}
