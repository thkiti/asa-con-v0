import {
  THERMAL_CLONE_PRINT_STYLES,
  THERMAL_PRINT_SLIP_SELECTOR,
} from "@/lib/thermal/print-css"
import {
  THERMAL_PAPER_SIDE_INSET_CSS,
  THERMAL_PAPER_WIDTH_CSS,
  THERMAL_PRINTABLE_WIDTH_CSS,
  THERMAL_PRINT_SCALE,
  THERMAL_PRINT_SCALED_PAPER_WIDTH_CSS,
} from "@/lib/thermal/thermal-paper"

describe("THERMAL_CLONE_PRINT_STYLES", () => {
  it("uses full paper width on @page with zero margin (matches preview scale)", () => {
    expect(THERMAL_CLONE_PRINT_STYLES).toContain(`size: ${THERMAL_PAPER_WIDTH_CSS} auto`)
    expect(THERMAL_CLONE_PRINT_STYLES).toContain("margin: 0")
  })

  it("sizes print clone like receipt-setup-preview-slip", () => {
    expect(THERMAL_CLONE_PRINT_STYLES).toContain(
      `width: ${THERMAL_PAPER_WIDTH_CSS} !important`
    )
    expect(THERMAL_CLONE_PRINT_STYLES).toContain(
      `padding: ${THERMAL_PAPER_SIDE_INSET_CSS} !important`
    )
    expect(THERMAL_CLONE_PRINT_STYLES).toContain(
      `max-width: ${THERMAL_PRINTABLE_WIDTH_CSS} !important`
    )
  })

  it("targets structured slip nodes inside print sources", () => {
    expect(THERMAL_PRINT_SLIP_SELECTOR).toContain("receipt-setup-preview-slip")
    expect(THERMAL_PRINT_SLIP_SELECTOR).toContain("thermal-ticket-slip")
  })

  it("applies driver scale compensation on print clone only", () => {
    expect(THERMAL_CLONE_PRINT_STYLES).toContain(`transform: scale(${THERMAL_PRINT_SCALE})`)
    expect(THERMAL_CLONE_PRINT_STYLES).toContain("transform-origin: top left")
    expect(THERMAL_CLONE_PRINT_STYLES).toContain(
      `width: ${THERMAL_PRINT_SCALED_PAPER_WIDTH_CSS} !important`
    )
  })
})
