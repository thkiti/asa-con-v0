jest.mock("@/lib/pos/payment-slip-blob-upload", () => ({
  uploadPaymentSlipToBlob: jest.fn(),
}))

import { PaymentEvidenceStatus, PaymentMethod } from "@/generated/prisma/client"
import { uploadPaymentSlipToBlob } from "@/lib/pos/payment-slip-blob-upload"
import { uploadPaymentEvidenceForReceipt } from "@/lib/pos/payment-evidence-upload"
import { markPaymentEvidenceUploaded } from "@/lib/pos/payment-evidence"

jest.mock("@/lib/pos/payment-evidence", () => {
  const actual = jest.requireActual("@/lib/pos/payment-evidence")
  return {
    ...actual,
    markPaymentEvidenceUploaded: jest.fn(),
  }
})

const mockedUpload = uploadPaymentSlipToBlob as jest.MockedFunction<
  typeof uploadPaymentSlipToBlob
>
const mockedMark = markPaymentEvidenceUploaded as jest.MockedFunction<
  typeof markPaymentEvidenceUploaded
>

describe("uploadPaymentEvidenceForReceipt", () => {
  const branchId = "branch-1"
  const branchCode = "SH001"
  const receiptNo = "REC-SH001-202606-0001"

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUpload.mockResolvedValue({
      blobPathname: "payment-slips/SH001/REC-SH001-202606-0001.jpg",
      blobUrl: "https://blob.example/payment-slips/SH001/REC-SH001-202606-0001.jpg",
    })
    mockedMark.mockResolvedValue({
      id: "evidence-1",
      receiptNo,
      status: PaymentEvidenceStatus.UPLOADED,
      blobPathname: "payment-slips/SH001/REC-SH001-202606-0001.jpg",
      blobUrl: "https://blob.example/payment-slips/SH001/REC-SH001-202606-0001.jpg",
    } as never)
  })

  it("uploads slip and marks evidence UPLOADED", async () => {
    const db = {
      receipt: {
        findFirst: jest.fn().mockResolvedValue({
          paymentEvidence: { id: "evidence-1", status: PaymentEvidenceStatus.PENDING },
          sale: { payment: { method: PaymentMethod.BANK_TRANSFER } },
        }),
      },
      paymentEvidence: {},
    }

    const result = await uploadPaymentEvidenceForReceipt(db as never, {
      branchId,
      branchCode,
      receiptNo,
      fileBuffer: Buffer.from("jpeg-bytes"),
    })

    expect(mockedUpload).toHaveBeenCalledWith({
      branchCode,
      receiptNo,
      fileBuffer: expect.any(Buffer),
      contentType: undefined,
    })
    expect(mockedMark).toHaveBeenCalled()
    expect(result.status).toBe(PaymentEvidenceStatus.UPLOADED)
  })

  it("rejects non-bank-transfer sales", async () => {
    const db = {
      receipt: {
        findFirst: jest.fn().mockResolvedValue({
          paymentEvidence: { id: "evidence-1", status: PaymentEvidenceStatus.PENDING },
          sale: { payment: { method: PaymentMethod.CASH } },
        }),
      },
      paymentEvidence: {},
    }

    await expect(
      uploadPaymentEvidenceForReceipt(db as never, {
        branchId,
        branchCode,
        receiptNo,
        fileBuffer: Buffer.from("x"),
      })
    ).rejects.toMatchObject({ code: "NOT_BANK_TRANSFER" })
  })
})
