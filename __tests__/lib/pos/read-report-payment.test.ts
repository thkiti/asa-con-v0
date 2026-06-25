import { PaymentMethod } from "@/generated/prisma/client"
import {
  READ_REPORT_PAYMENT_LABEL,
  READ_REPORT_PAYMENT_ORDER,
  readReportPaymentBucket,
} from "@/lib/pos/readReportPayment"

describe("readReportPaymentBucket", () => {
  it("maps cash and card to their display buckets", () => {
    expect(readReportPaymentBucket(PaymentMethod.CASH)).toBe("CASH")
    expect(readReportPaymentBucket(PaymentMethod.CARD)).toBe("CREDIT_CARD")
  })

  it("consolidates bank-style stored methods into BANK_TRANSFER display", () => {
    expect(readReportPaymentBucket(PaymentMethod.BANK_TRANSFER)).toBe("BANK_TRANSFER")
    expect(readReportPaymentBucket(PaymentMethod.TRANSFER)).toBe("BANK_TRANSFER")
    expect(readReportPaymentBucket(PaymentMethod.QR)).toBe("BANK_TRANSFER")
    expect(readReportPaymentBucket(PaymentMethod.OTHER)).toBe("BANK_TRANSFER")
  })

  it("defines READ X/Z payment summary labels only", () => {
    expect(READ_REPORT_PAYMENT_ORDER).toEqual([
      "CASH",
      "CREDIT_CARD",
      "BANK_TRANSFER",
    ])
    expect(READ_REPORT_PAYMENT_LABEL).toEqual({
      CASH: "CASH",
      CREDIT_CARD: "CREDIT CARD",
      BANK_TRANSFER: "BANK TRANSFER",
    })
    expect(Object.values(READ_REPORT_PAYMENT_LABEL)).not.toContain("PROMPT PAY")
    expect(Object.values(READ_REPORT_PAYMENT_LABEL)).not.toContain("QR CODE")
    expect(Object.values(READ_REPORT_PAYMENT_LABEL)).not.toContain("TRANSFER")
  })
})
