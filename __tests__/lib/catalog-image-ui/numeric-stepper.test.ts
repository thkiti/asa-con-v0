import {
  adjustNumericStepperValue,
  formatNumericStepperValue,
  normalizeNumericStepperValue,
} from "@/lib/catalog-image-ui/numeric-stepper"

describe("numeric-stepper helpers", () => {
  it("formats integer and decimal display values", () => {
    expect(formatNumericStepperValue(180, "integer")).toBe("180")
    expect(formatNumericStepperValue(1000, "decimal")).toBe("1000.0")
  })

  it("increments decimal values by 0.1", () => {
    expect(adjustNumericStepperValue(1000, 0.1, "up", "decimal")).toBe(1000.1)
    expect(adjustNumericStepperValue(1000.1, 0.1, "down", "decimal")).toBe(1000.0)
  })

  it("changes degree by 0.1 as decimal", () => {
    expect(adjustNumericStepperValue(180, 0.1, "up", "decimal")).toBe(180.1)
    expect(adjustNumericStepperValue(180.1, 0.1, "down", "decimal")).toBe(180)
  })

  it("enforces minimum and maximum values", () => {
    expect(normalizeNumericStepperValue(0, "integer", 1)).toBe(1)
    expect(normalizeNumericStepperValue(0, "decimal", 0.1)).toBe(0.1)
    expect(normalizeNumericStepperValue(2000, "decimal", undefined, 1500)).toBe(1500)
  })
})
