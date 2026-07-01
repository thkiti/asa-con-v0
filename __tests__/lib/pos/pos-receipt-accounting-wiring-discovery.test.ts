import { readFileSync } from "node:fs"
import path from "node:path"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { STOCK_REF_TYPES } from "@/lib/stock/transaction-types"

/**
 * REC-1 discovery — documents current POS receipt / sale → finance wiring.
 * Does not change business behavior or require FINANCE_POSTING_ENABLED.
 */
describe("POS receipt accounting wiring (REC-1 discovery)", () => {
  it("uses POS_SALE refType keyed by sale.id — no POS_RECEIPT / REC finance refTypes", () => {
    expect(FINANCE_REF_TYPES.POS_SALE).toBe("POS_SALE")
    const refValues = Object.values(FINANCE_REF_TYPES)
    expect(refValues).not.toContain("POS_RECEIPT_REVENUE")
    expect(refValues).not.toContain("POS_RECEIPT_COST")
    expect(refValues).not.toContain("POS_SALE_REVENUE")
    expect(refValues).not.toContain("POS_SALE_COST")
    expect(refValues).not.toContain("REC")
  })

  it("stock ledger uses POS_SALE refType aligned with sale.id", () => {
    expect(STOCK_REF_TYPES.POS_SALE).toBe("POS_SALE")
  })

  it("checkout orchestrator: sale → stock → payment → receipt → optional postSaleVoucher", () => {
    const checkoutSource = readFileSync(
      path.join(process.cwd(), "lib/pos/checkout.ts"),
      "utf8"
    )
    expect(checkoutSource).toMatch(/issueStock\(/)
    expect(checkoutSource).toMatch(/STOCK_REF_TYPES\.POS_SALE/)
    expect(checkoutSource).toMatch(/allocateReceiptNo/)
    expect(checkoutSource).toMatch(/createReceiptRow/)
    expect(checkoutSource).toMatch(/isFinancePostingEnabled\(\)/)
    expect(checkoutSource).toMatch(/postSaleVoucher\(/)
    expect(checkoutSource).toMatch(/buildPostSaleVoucherInput/)
  })

  it("postSaleVoucher binds voucher refId to sale.id (not receipt.id)", () => {
    const postingSource = readFileSync(
      path.join(process.cwd(), "lib/finance/posting.ts"),
      "utf8"
    )
    expect(postingSource).toMatch(/refType:\s*FINANCE_REF_TYPES\.POS_SALE/)
    expect(postingSource).toMatch(/refId:\s*input\.sale\.id/)
  })
})
