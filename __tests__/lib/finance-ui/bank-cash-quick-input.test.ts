import {
  applyEnterToAddLine,
  insertBlankQuickLineAfter,
  updateQuickLineAmount,
} from "@/lib/finance-ui/bank-cash-quick-input"
import type { QuickStatementLine } from "@/lib/finance-ui/bank-cash-workspace"

function line(key: string, overrides: Partial<QuickStatementLine> = {}): QuickStatementLine {
  return {
    key,
    depositAmount: "",
    withdrawalAmount: "",
    transactionDate: "",
    description: "",
    chequeNumber: "",
    showDetails: false,
    ...overrides,
  }
}

describe("applyEnterToAddLine", () => {
  it("pressing Enter in deposit creates a new blank deposit row below", () => {
    const lines = [line("row-1", { depositAmount: "250.00" })]
    const result = applyEnterToAddLine(lines, "row-1", "deposit", "250.00")

    expect(result).not.toBeNull()
    expect(result?.lines).toHaveLength(2)
    expect(result?.lines[0]?.depositAmount).toBe("250.00")
    expect(result?.lines[1]?.depositAmount).toBe("")
    expect(result?.lines[1]?.withdrawalAmount).toBe("")
    expect(result?.focusField).toBe("deposit")
    expect(result?.focusLineKey).toBe(result?.lines[1]?.key)
  })

  it("pressing Enter in withdrawal creates a new blank withdrawal row below", () => {
    const lines = [line("row-1", { withdrawalAmount: "75.50" })]
    const result = applyEnterToAddLine(lines, "row-1", "withdrawal", "75.50")

    expect(result).not.toBeNull()
    expect(result?.lines).toHaveLength(2)
    expect(result?.lines[0]?.withdrawalAmount).toBe("75.50")
    expect(result?.lines[1]?.withdrawalAmount).toBe("")
    expect(result?.focusField).toBe("withdrawal")
    expect(result?.focusLineKey).toBe(result?.lines[1]?.key)
  })

  it("does not add a row when Enter is pressed on an empty amount", () => {
    const lines = [line("row-1")]
    expect(applyEnterToAddLine(lines, "row-1", "deposit", "")).toBeNull()
  })
})

describe("updateQuickLineAmount", () => {
  it("clears withdrawal when deposit is entered", () => {
    const next = updateQuickLineAmount(line("row-1", { withdrawalAmount: "10.00" }), "deposit", "5.00")
    expect(next.depositAmount).toBe("5.00")
    expect(next.withdrawalAmount).toBe("")
  })
})

describe("insertBlankQuickLineAfter", () => {
  it("inserts after the current row", () => {
    const lines = [line("a"), line("b")]
    const { lines: next, newLineKey } = insertBlankQuickLineAfter(lines, "a")
    expect(next.map((entry) => entry.key)).toEqual(["a", newLineKey, "b"])
  })
})
