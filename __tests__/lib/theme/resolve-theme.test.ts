import { parseThemeMode, resolveTheme } from "@/lib/theme/resolve-theme"

describe("resolveTheme", () => {
  it("returns light when mode is light", () => {
    expect(resolveTheme("light", true)).toBe("light")
    expect(resolveTheme("light", false)).toBe("light")
  })

  it("returns dark when mode is dark", () => {
    expect(resolveTheme("dark", false)).toBe("dark")
    expect(resolveTheme("dark", true)).toBe("dark")
  })

  it("follows system preference when mode is system", () => {
    expect(resolveTheme("system", true)).toBe("dark")
    expect(resolveTheme("system", false)).toBe("light")
  })
})

describe("parseThemeMode", () => {
  it("parses valid modes", () => {
    expect(parseThemeMode("light")).toBe("light")
    expect(parseThemeMode("dark")).toBe("dark")
    expect(parseThemeMode("system")).toBe("system")
  })

  it("defaults invalid or missing values to system", () => {
    expect(parseThemeMode(null)).toBe("system")
    expect(parseThemeMode(undefined)).toBe("system")
    expect(parseThemeMode("invalid")).toBe("system")
  })
})
