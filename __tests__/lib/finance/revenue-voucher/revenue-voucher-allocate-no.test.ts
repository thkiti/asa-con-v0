import {
  allocateRevenueVoucherNo,
  buildRevenueVoucherNo,
  REVENUE_VOUCHER_DOCUMENT_CODE,
} from "@/lib/finance/revenue-voucher/revenue-voucher-allocate-no"

describe("revenue-voucher-allocate-no", () => {
  const entryDate = new Date("2026-06-14T12:00:00.000Z")

  it("builds REV-YYnnnn document numbers", () => {
    expect(REVENUE_VOUCHER_DOCUMENT_CODE).toBe("REV")
    expect(buildRevenueVoucherNo(entryDate, 1)).toBe("REV-260001")
    expect(buildRevenueVoucherNo(entryDate, 42)).toBe("REV-260042")
  })

  it("allows the same entryNo across different legalEntityCode scopes", async () => {
    const tx = {
      revenueVoucher: {
        findMany: jest.fn(async ({ where }: { where: { legalEntityCode: string } }) => {
          if (where.legalEntityCode === "AD") {
            return [{ entryNo: "REV-260001" }]
          }
          return []
        }),
      },
    }

    const no = await allocateRevenueVoucherNo(tx as never, {
      legalEntityCode: "AS",
      entryDate,
    })

    expect(no).toBe("REV-260001")
  })
})
