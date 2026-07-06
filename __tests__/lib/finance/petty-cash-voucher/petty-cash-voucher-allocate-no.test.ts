import {
  allocatePettyCashVoucherNo,
  buildPettyCashVoucherNo,
  PETTY_CASH_VOUCHER_DOCUMENT_CODE,
} from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-allocate-no"

describe("petty-cash-voucher-allocate-no", () => {
  const entryDate = new Date("2026-06-14T12:00:00.000Z")

  it("uses PCV document code", () => {
    expect(PETTY_CASH_VOUCHER_DOCUMENT_CODE).toBe("PCV")
    expect(buildPettyCashVoucherNo(entryDate, 1)).toBe("PCV-260001")
    expect(buildPettyCashVoucherNo(entryDate, 42)).toBe("PCV-260042")
  })

  it("allocates next sequence per legal entity and calendar year", async () => {
    const tx = {
      pettyCashVoucher: {
        findMany: jest.fn().mockResolvedValue([{ entryNo: "PCV-260001" }]),
      },
    }

    const no = await allocatePettyCashVoucherNo(tx as never, {
      legalEntityCode: "AS",
      entryDate,
    })

    expect(no).toBe("PCV-260002")
    expect(tx.pettyCashVoucher.findMany).toHaveBeenCalled()
  })
})
