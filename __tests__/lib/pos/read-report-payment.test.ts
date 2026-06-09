import { PaymentMethod } from "@/generated/prisma/client"
import { readReportPaymentBucket } from "@/lib/pos/readReportPayment"

describe("readReportPaymentBucket", () => {
  it("maps each PaymentMethod to the READ report bucket", () => {
    expect(readReportPaymentBucket(PaymentMethod.CASH)).toBe("CASH")
    expect(readReportPaymentBucket(PaymentMethod.CARD)).toBe("CREDIT_CARD")
    expect(readReportPaymentBucket(PaymentMethod.BANK_TRANSFER)).toBe("TRANSFER")
    expect(readReportPaymentBucket(PaymentMethod.OTHER)).toBe("PROMPT_PAY")
    expect(readReportPaymentBucket(PaymentMethod.QR)).toBe("QR_CODE")
    expect(readReportPaymentBucket(PaymentMethod.TRANSFER)).toBe("TRANSFER")
  })
})
