import {
  RECEIPT_MACHINE_NO_LABEL,
  formatReceiptMachineLine,
  formatReceiptMachineLineForThermal,
  truncateReceiptMachineLineDisplay,
} from "@/lib/thermal/receipt-machine-line"
import { THERMAL_COLUMNS } from "@/lib/thermal/format"

describe("receipt-machine-line", () => {
  it("uses M/C No. label", () => {
    expect(formatReceiptMachineLine("01F 02 071")).toBe("M/C No. 01F 02 071")
  })

  it("fits thermal line on one row with ellipsis when too long", () => {
    const longId = "01F 02 071 12345678901234567890"
    const line = formatReceiptMachineLineForThermal(longId, THERMAL_COLUMNS)
    expect(line).not.toContain("\n")
    expect(line.trim()).toContain("M/C No.")
    expect(line.trim()).toContain("...")
  })

  it("keeps short machine id on one centered thermal row", () => {
    const line = formatReceiptMachineLineForThermal("MACH-001", THERMAL_COLUMNS)
    expect(line).not.toContain("\n")
    expect(line).toContain(RECEIPT_MACHINE_NO_LABEL)
    expect(line).toContain("MACH-001")
  })

  it("truncateReceiptMachineLineDisplay adds ellipsis", () => {
    expect(truncateReceiptMachineLineDisplay("M/C No. 0123456789", 12)).toBe("M/C No. 0...")
  })
})
