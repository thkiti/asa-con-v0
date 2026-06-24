import {
  assertNoPostedNonOpbDocuments,
  executeFinanceFullReset,
  FINANCE_FULL_RESET_CONFIRM_TOKEN,
  FINANCE_FULL_RESET_REF_TYPES,
  parseDatabaseTarget,
  validateFinanceFullResetExecute,
} from "@/lib/uat/finance-full-reset"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

describe("finance-full-reset", () => {
  it("includes voucher ref types but not POS/stock", () => {
    expect(FINANCE_FULL_RESET_REF_TYPES).toContain(
      FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL
    )
    expect(FINANCE_FULL_RESET_REF_TYPES).toContain(
      FINANCE_REF_TYPES.PAYMENT_VOUCHER
    )
    expect(FINANCE_FULL_RESET_REF_TYPES).not.toContain(FINANCE_REF_TYPES.POS_SALE)
    expect(FINANCE_FULL_RESET_REF_TYPES).not.toContain(
      FINANCE_REF_TYPES.STOCK_DOC_POST
    )
  })

  it("parses database host for guardrail output", () => {
    const parsed = parseDatabaseTarget(
      "postgresql://user:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
    )
    expect(parsed.host).toBe("aws-1-ap-southeast-1.pooler.supabase.com")
    expect(parsed.database).toBe("postgres")
    expect(parsed.maskedUrl).toContain(":***@")
    expect(parsed.isLocalhost).toBe(false)
  })

  it("rejects unexpected POSTED non-OPB documents", () => {
    expect(() =>
      assertNoPostedNonOpbDocuments({
        postedOpb: [],
        postedNonOpbMje: 1,
        postedPaymentVoucher: 0,
        postedRevenueVoucher: 0,
        postedPettyCashVoucher: 0,
      })
    ).toThrow(/unexpected POSTED finance documents/)
  })

  it("requires confirm token on execute", () => {
    expect(() =>
      validateFinanceFullResetExecute(
        { execute: true, confirm: "WRONG", includePostedOpb: false },
        {
          postedOpb: [],
          postedNonOpbMje: 0,
          postedPaymentVoucher: 0,
          postedRevenueVoucher: 0,
          postedPettyCashVoucher: 0,
        }
      )
    ).toThrow(FINANCE_FULL_RESET_CONFIRM_TOKEN)
  })

  it("requires include-posted-opb when POSTED OPB exists on execute", () => {
    expect(() =>
      validateFinanceFullResetExecute(
        {
          execute: true,
          confirm: FINANCE_FULL_RESET_CONFIRM_TOKEN,
          includePostedOpb: false,
        },
        {
          postedOpb: [
            {
              id: "opb-1",
              entryNo: "OPB-260001",
              postedVoucherId: "v-1",
              pdfPath: "manual-journal/opb-1.pdf",
            },
          ],
          postedNonOpbMje: 0,
          postedPaymentVoucher: 0,
          postedRevenueVoucher: 0,
          postedPettyCashVoucher: 0,
        }
      )
    ).toThrow(/--include-posted-opb/)
  })

  it("skips revenueVoucher update/delete when physical table is absent", async () => {
    const revenueUpdateMany = jest.fn()
    const revenueDeleteMany = jest.fn()
    const paymentUpdateMany = jest.fn()
    const paymentDeleteMany = jest.fn()

    const tx = {
      manualJournalEntry: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      paymentVoucher: {
        updateMany: paymentUpdateMany.mockResolvedValue({ count: 0 }),
        deleteMany: paymentDeleteMany.mockResolvedValue({ count: 0 }),
      },
      revenueVoucher: {
        updateMany: revenueUpdateMany,
        deleteMany: revenueDeleteMany,
      },
      pettyCashVoucher: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      voucher: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: "voucher-opb-1" }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      journalEntry: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    }

    await executeFinanceFullReset(tx as never, FINANCE_FULL_RESET_REF_TYPES, {
      includePostedOpb: true,
      postedOpbIds: [],
      postedOpbVoucherIds: [],
      tablePresence: {
        paymentVoucher: true,
        revenueVoucher: false,
        pettyCashVoucher: true,
      },
    })

    expect(revenueUpdateMany).not.toHaveBeenCalled()
    expect(revenueDeleteMany).not.toHaveBeenCalled()
    expect(paymentUpdateMany).toHaveBeenCalled()
    expect(paymentDeleteMany).toHaveBeenCalled()
  })
})
