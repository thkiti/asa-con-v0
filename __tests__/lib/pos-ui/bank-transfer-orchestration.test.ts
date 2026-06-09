import { uploadPaymentEvidenceSlipInBackground } from "@/lib/pos-ui/payment-evidence-upload-client"
import { openPosReceiptPrint } from "@/lib/pos-ui/pos-receipt-print"
import { fetchPosCheckout } from "@/lib/pos-ui/pos-checkout-client"
import { cartTotal } from "@/lib/pos/cart"

jest.mock("@/lib/pos-ui/payment-evidence-upload-client", () => ({
  uploadPaymentEvidenceSlipInBackground: jest.fn(),
}))

jest.mock("@/lib/pos-ui/pos-receipt-print", () => ({
  openPosReceiptPrint: jest.fn(),
}))

jest.mock("@/lib/pos-ui/pos-checkout-client", () => ({
  fetchPosCheckout: jest.fn(),
}))

const mockedCheckout = fetchPosCheckout as jest.MockedFunction<typeof fetchPosCheckout>
const mockedPrint = openPosReceiptPrint as jest.MockedFunction<typeof openPosReceiptPrint>
const mockedBackgroundUpload = uploadPaymentEvidenceSlipInBackground as jest.MockedFunction<
  typeof uploadPaymentEvidenceSlipInBackground
>

/** Mirrors PosTerminalPage bank-transfer orchestration order. */
async function runBankTransferFlow(input: {
  lines: { productId: string; qty: number; unitPrice: string }[]
  blob: Blob
  reset: () => void
}) {
  let receiptNoForUpload: string | null = null
  const result = await fetchPosCheckout(
    input.lines.map((line) => ({ productId: line.productId, qty: line.qty })),
    {
      paymentMethod: "BANK_TRANSFER",
      paidAmount: cartTotal(input.lines as never),
    }
  )
  if (!result.ok) return { ok: false as const }

  receiptNoForUpload = result.result.receipt.receiptNo
  openPosReceiptPrint(result.result.sale.id)
  input.reset()

  if (receiptNoForUpload) {
    uploadPaymentEvidenceSlipInBackground({
      file: input.blob,
      receiptNo: receiptNoForUpload,
    })
  }
  return { ok: true as const, receiptNo: receiptNoForUpload }
}

describe("bank transfer orchestration order", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedCheckout.mockResolvedValue({
      ok: true,
      result: {
        sale: { id: "sale-1", total: "100.00" },
        receipt: { receiptNo: "REC-SH001-202606-0001" },
      },
    } as never)
  })

  it("runs checkout then print then reset then background upload", async () => {
    const order: string[] = []
    mockedPrint.mockImplementation(() => {
      order.push("print")
    })
    mockedBackgroundUpload.mockImplementation(() => {
      order.push("upload")
    })

    const lines = [
      {
        productId: "p1",
        qty: 1,
        unitPrice: "100.00",
        code: "0101001",
        name: "Widget",
        priceSource: "SELLING_PRICE" as const,
      },
    ]

    await runBankTransferFlow({
      lines,
      blob: new Blob(["x"], { type: "image/jpeg" }),
      reset: () => order.push("reset"),
    })

    expect(order).toEqual(["print", "reset", "upload"])
    expect(mockedCheckout).toHaveBeenCalledTimes(1)
    expect(mockedPrint).toHaveBeenCalledTimes(1)
    expect(mockedBackgroundUpload).toHaveBeenCalledTimes(1)
  })
})
