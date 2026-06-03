/**
 * @jest-environment jsdom
 */
import { readThemeMode, writeThemeMode } from "@/lib/theme/storage"
import { THEME_STORAGE_KEY } from "@/lib/theme/types"

describe("theme storage", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("returns system when storage is empty", () => {
    expect(readThemeMode()).toBe("system")
  })

  it("round-trips theme mode", () => {
    writeThemeMode("dark")
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
    expect(readThemeMode()).toBe("dark")

    writeThemeMode("light")
    expect(readThemeMode()).toBe("light")
  })

  it("falls back to system for invalid stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "not-a-mode")
    expect(readThemeMode()).toBe("system")
  })
})
