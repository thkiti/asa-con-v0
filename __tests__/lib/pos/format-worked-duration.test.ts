import { formatWorkedDuration } from "@/lib/pos/format-worked-duration"

describe("formatWorkedDuration", () => {
  it("formats zero seconds", () => {
    expect(formatWorkedDuration(0)).toBe("00:00:00")
  })

  it("formats 3661 seconds as 01:01:01", () => {
    expect(formatWorkedDuration(3661)).toBe("01:01:01")
  })

  it("formats 120 seconds as 00:02:00", () => {
    expect(formatWorkedDuration(120)).toBe("00:02:00")
  })

  it("formats 36000 seconds as 10:00:00", () => {
    expect(formatWorkedDuration(36000)).toBe("10:00:00")
  })

  it("supports multi-day accumulation without wrapping hours at 24", () => {
    const totalSeconds = 172 * 3600 + 34 * 60 + 18
    expect(formatWorkedDuration(totalSeconds)).toBe("172:34:18")
  })

  it("floors fractional seconds and treats non-finite as zero", () => {
    expect(formatWorkedDuration(3661.9)).toBe("01:01:01")
    expect(formatWorkedDuration(-5)).toBe("00:00:00")
    expect(formatWorkedDuration(Number.NaN)).toBe("00:00:00")
  })
})
