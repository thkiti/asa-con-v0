import { scanForbiddenPatterns } from "../../../scripts/audit/lib/scan"
import { FINANCE_KERNEL_NO_STOCK, FINANCE_KERNEL_NO_SALE } from "../../../scripts/audit/lib/rules"

describe("scanForbiddenPatterns", () => {
  it("returns no violations for clean source", () => {
    const source = `
      import { postSaleVoucher } from "./posting"
      export function summarize() {
        return { total: 0 }
      }
    `
    const hits = scanForbiddenPatterns(
      source,
      FINANCE_KERNEL_NO_STOCK.pattern,
      FINANCE_KERNEL_NO_STOCK.id
    )
    expect(hits).toHaveLength(0)
  })

  it("detects forbidden stock mutation with line number", () => {
    const source = `const x = 1
await issueStock({ items: [] })
const y = 2`
    const hits = scanForbiddenPatterns(
      source,
      FINANCE_KERNEL_NO_STOCK.pattern,
      FINANCE_KERNEL_NO_STOCK.id,
      "example.ts"
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({
      ruleId: "FINANCE_KERNEL_NO_STOCK",
      file: "example.ts",
      line: 2,
      match: "issueStock(",
    })
  })

  it("detects sale writes", () => {
    const source = "await tx.sale.create({ data: {} })"
    const hits = scanForbiddenPatterns(
      source,
      FINANCE_KERNEL_NO_SALE.pattern,
      FINANCE_KERNEL_NO_SALE.id
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]?.match).toBe("sale.create")
  })

  it("finds multiple matches in one file", () => {
    const source = "issueStock(); receiveStock();"
    const hits = scanForbiddenPatterns(
      source,
      FINANCE_KERNEL_NO_STOCK.pattern,
      FINANCE_KERNEL_NO_STOCK.id
    )
    expect(hits).toHaveLength(2)
  })
})
