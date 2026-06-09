import { PaymentEvidenceStatus, PaymentMethod } from "@/generated/prisma/client"
import {
  createPendingPaymentEvidenceRow,
  requiresPaymentEvidence,
  resolveReceiptEvidenceStatus,
} from "@/lib/pos/payment-evidence"

describe("payment-evidence", () => {
  describe("requiresPaymentEvidence", () => {
    it("requires evidence only for BANK_TRANSFER", () => {
      expect(requiresPaymentEvidence(PaymentMethod.BANK_TRANSFER)).toBe(true)
      expect(requiresPaymentEvidence(PaymentMethod.CASH)).toBe(false)
      expect(requiresPaymentEvidence(PaymentMethod.CARD)).toBe(false)
    })
  })

  describe("resolveReceiptEvidenceStatus", () => {
    it("returns null for non-bank-transfer payments", () => {
      expect(
        resolveReceiptEvidenceStatus({
          paymentMethod: PaymentMethod.CASH,
          evidenceStatus: PaymentEvidenceStatus.PENDING,
        })
      ).toBeNull()
    })

    it("returns stored status for BANK_TRANSFER", () => {
      expect(
        resolveReceiptEvidenceStatus({
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          evidenceStatus: PaymentEvidenceStatus.UPLOADED,
        })
      ).toBe(PaymentEvidenceStatus.UPLOADED)
    })

    it("defaults BANK_TRANSFER without evidence row to PENDING", () => {
      expect(
        resolveReceiptEvidenceStatus({
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          evidenceStatus: undefined,
        })
      ).toBe(PaymentEvidenceStatus.PENDING)
    })
  })

  describe("createPendingPaymentEvidenceRow", () => {
    it("creates a PENDING evidence row", async () => {
      const create = jest.fn().mockResolvedValue({ id: "ev-1" })
      const tx = { paymentEvidence: { create } } as never

      await createPendingPaymentEvidenceRow(tx, {
        branchId: "branch-1",
        receiptNo: "REC-SH001-202606-0001",
        receiptId: "rcpt-1",
        saleId: "sale-1",
        paymentId: "pay-1",
      })

      expect(create).toHaveBeenCalledWith({
        data: {
          branchId: "branch-1",
          receiptNo: "REC-SH001-202606-0001",
          receiptId: "rcpt-1",
          saleId: "sale-1",
          paymentId: "pay-1",
          status: PaymentEvidenceStatus.PENDING,
        },
      })
    })
  })
})
