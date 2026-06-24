import {
  THERMAL_ACK_PHONE_WRITING_LINES,
  THERMAL_ACK_SIGN_WRITING_LINES,
  appendThermalCustomerAcknowledgement,
  buildThermalCustomerAcknowledgementText,
} from "@/lib/thermal/thermal-customer-ack"
import { THERMAL_COLUMNS } from "@/lib/thermal/format"

describe("thermal-customer-ack", () => {
  it("renders Phone No with two dotted writing lines and Sign with three", () => {
    const text = buildThermalCustomerAcknowledgementText()
    const lines = text.split("\n")

    expect(text).toContain("Phone No")
    expect(text).toContain("Sign")

    const phoneIdx = lines.indexOf("Phone No")
    const signIdx = lines.indexOf("Sign")
    expect(phoneIdx).toBeGreaterThan(-1)
    expect(signIdx).toBeGreaterThan(phoneIdx)

    const phoneDots = lines
      .slice(phoneIdx + 1, signIdx)
      .filter((line) => line === ".".repeat(THERMAL_COLUMNS))
    const signDots = lines
      .slice(signIdx + 1)
      .filter((line) => line === ".".repeat(THERMAL_COLUMNS))

    expect(phoneDots).toHaveLength(THERMAL_ACK_PHONE_WRITING_LINES)
    expect(signDots).toHaveLength(THERMAL_ACK_SIGN_WRITING_LINES)
  })

  it("appends acknowledgement after existing slip lines", () => {
    const lines = ["BODY"]
    appendThermalCustomerAcknowledgement(lines)
    expect(lines[0]).toBe("BODY")
    expect(lines.join("\n")).toContain("Phone No")
  })
})
