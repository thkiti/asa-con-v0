import { posReceiptSlipPaymentLabel } from "@/lib/pos-ui/pos-payment-methods"

describe("posReceiptSlipPaymentLabel", () => {
  it.each([
    ["CASH", "CASH"],
    ["CARD", "CARD"],
    ["BANK_TRANSFER", "BANK TRANSFER"],
  ] as const)("maps checkout method %s to %s", (method, label) => {
    expect(posReceiptSlipPaymentLabel(method)).toBe(label)
  })

  it.each([
    ["OTHER", "PROMPT PAY"],
    ["QR", "QR CODE"],
    ["TRANSFER", "TRANSFER"],
  ] as const)("maps legacy method %s to %s", (method, label) => {
    expect(posReceiptSlipPaymentLabel(method)).toBe(label)
  })
})
