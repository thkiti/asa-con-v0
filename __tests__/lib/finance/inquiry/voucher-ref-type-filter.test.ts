import {
  applyVoucherInquiryRefTypeFilter,
  resolveVoucherInquiryRefTypeFilter,
  VOUCHER_INQUIRY_DOC_TYPE,
  VOUCHER_INQUIRY_DOC_TYPE_MJV,
  VOUCHER_INQUIRY_REF_TYPE_OPTIONS,
} from "@/lib/finance/inquiry/voucher-ref-type-filter"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

describe("voucher ref type filter", () => {
  it("exposes inquiry dropdown options with All first and business codes", () => {
    expect(VOUCHER_INQUIRY_REF_TYPE_OPTIONS[0]).toEqual({ value: "", label: "All" })
    expect(VOUCHER_INQUIRY_REF_TYPE_OPTIONS).toContainEqual({
      value: "COL",
      label: "COL • Collector Pickup",
    })
    expect(VOUCHER_INQUIRY_REF_TYPE_OPTIONS).toContainEqual({
      value: "PAY",
      label: "PAY • Bank Deposit",
    })
    expect(VOUCHER_INQUIRY_REF_TYPE_OPTIONS).toContainEqual({
      value: "PAV",
      label: "PAV • Payment Voucher",
    })
    expect(VOUCHER_INQUIRY_REF_TYPE_OPTIONS.some((o) => o.label.includes("PAY-IN"))).toBe(
      false
    )
  })

  it("expands MJV shorthand to manual journal ref types", () => {
    expect(resolveVoucherInquiryRefTypeFilter(VOUCHER_INQUIRY_DOC_TYPE_MJV)).toEqual({
      refTypeIn: expect.arrayContaining([
        FINANCE_REF_TYPES.MANUAL_JOURNAL,
        FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
      ]),
    })
  })

  it("maps PAY document code to bank deposit refType", () => {
    expect(resolveVoucherInquiryRefTypeFilter(VOUCHER_INQUIRY_DOC_TYPE.PAY)).toEqual({
      refType: FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
    })
  })

  it("maps COL document code to collector pickup refType", () => {
    expect(resolveVoucherInquiryRefTypeFilter(VOUCHER_INQUIRY_DOC_TYPE.COL)).toEqual({
      refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
    })
  })

  it("accepts legacy raw refType values in URLs", () => {
    expect(
      resolveVoucherInquiryRefTypeFilter(FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP)
    ).toEqual({
      refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
    })
  })

  it("applyVoucherInquiryRefTypeFilter replaces refType with refTypeIn for MJV", () => {
    expect(
      applyVoucherInquiryRefTypeFilter({
        legalEntityCode: "AS",
        refType: VOUCHER_INQUIRY_DOC_TYPE_MJV,
      })
    ).toEqual({
      legalEntityCode: "AS",
      refTypeIn: expect.arrayContaining([FINANCE_REF_TYPES.MANUAL_JOURNAL]),
    })
  })
})
