import { parseThemeMode } from "./resolve-theme"
import type { ThemeMode } from "./types"
import { DEFAULT_THEME_MODE, THEME_STORAGE_KEY } from "./types"

export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_MODE
  }
  try {
    return parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME_MODE
  }
}

export function writeThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // ignore quota / private mode
  }
}

export { THEME_STORAGE_KEY }
