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

  it("keeps blank writing line height without dotted guides when disabled", () => {
    const text = buildThermalCustomerAcknowledgementText(THERMAL_COLUMNS, {
      writingGuides: false,
    })
    const lines = text.split("\n")
    const phoneIdx = lines.indexOf("Phone No")
    const signIdx = lines.indexOf("Sign")

    expect(text).not.toContain(".".repeat(THERMAL_COLUMNS))

    const betweenPhoneAndSign = lines.slice(phoneIdx + 1, signIdx)
    expect(betweenPhoneAndSign.slice(1, 1 + THERMAL_ACK_PHONE_WRITING_LINES)).toEqual(
      Array.from({ length: THERMAL_ACK_PHONE_WRITING_LINES }, () => "")
    )

    const afterSign = lines.slice(signIdx + 1)
    expect(afterSign.slice(1, 1 + THERMAL_ACK_SIGN_WRITING_LINES)).toEqual(
      Array.from({ length: THERMAL_ACK_SIGN_WRITING_LINES }, () => "")
    )
  })

  it("omits acknowledgement leading divider when disabled", () => {
    const lines: string[] = ["BODY"]
    appendThermalCustomerAcknowledgement(lines, THERMAL_COLUMNS, {
      writingGuides: false,
      leadingDivider: false,
      phoneLabel: "Phone No.",
    })
    expect(lines[0]).toBe("BODY")
    expect(lines[1]).toBe("Phone No.")
    expect(lines.join("\n")).not.toMatch(/^-{10,}/m)
  })

  it("renders inline dotted guide on the label row for refund-style ack", () => {
    const lines: string[] = []
    appendThermalCustomerAcknowledgement(lines, THERMAL_COLUMNS, {
      inlineGuides: true,
      leadingDivider: false,
      phoneLabel: "Phone No.",
      signLabel: "Sign",
    })
    expect(lines[0]).toMatch(/^Phone No\.\s+\.+/)
    expect(lines.some((line) => /^Sign\s+\.+/.test(line))).toBe(true)
  })

  it("renders stacked dotted guides and cut separator for refund ticket ack", () => {
    const text = buildThermalCustomerAcknowledgementText(THERMAL_COLUMNS, {
      stackedGuides: true,
      cutSeparator: true,
      leadingDivider: false,
      phoneLabel: "Phone No.",
      signLabel: "Sign",
    })
    const lines = text.split("\n")
    const phoneIdx = lines.indexOf("Phone No.")
    const signIdx = lines.indexOf("Sign")

    expect(phoneIdx).toBeGreaterThan(-1)
    expect(signIdx).toBeGreaterThan(phoneIdx)
    expect(lines[phoneIdx + 1]).toBe(".".repeat(THERMAL_COLUMNS))
    expect(lines[signIdx + 1]).toBe(".".repeat(THERMAL_COLUMNS))
    expect(lines.at(-1)).toBe("-".repeat(THERMAL_COLUMNS))
  })

  it("renders inline guides with leading blank and cut separator", () => {
    const text = buildThermalCustomerAcknowledgementText(THERMAL_COLUMNS, {
      inlineGuides: true,
      cutSeparator: true,
      leadingBlank: true,
      leadingDivider: false,
      phoneLabel: "Phone No.",
      signLabel: "Sign",
    })
    const lines = text.split("\n")
    expect(lines[0]).toBe("")
    expect(lines[1]).toMatch(/^Phone No\.\s+\.+/)
    expect(lines.some((line) => /^Sign\s+\.+/.test(line))).toBe(true)
    expect(lines.at(-1)).toBe("-".repeat(THERMAL_COLUMNS))
  })
})
