import type { ResolvedTheme, ThemeMode } from "./types"
import { DEFAULT_THEME_MODE } from "./types"

export function resolveTheme(
  mode: ThemeMode,
  prefersDark: boolean
): ResolvedTheme {
  if (mode === "dark") return "dark"
  if (mode === "light") return "light"
  return prefersDark ? "dark" : "light"
}

export function parseThemeMode(value: string | null | undefined): ThemeMode {
  if (value === "light" || value === "dark" || value === "system") {
    return value
  }
  return DEFAULT_THEME_MODE
}
