import { resolveTheme } from "./resolve-theme"
import type { ResolvedTheme, ThemeMode } from "./types"

export function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") {
    return false
  }
  if (typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function applyThemeToDocument(
  mode: ThemeMode,
  prefersDark: boolean = getSystemPrefersDark()
): ResolvedTheme {
  const resolved = resolveTheme(mode, prefersDark)
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme-mode", mode)
    document.documentElement.setAttribute("data-theme", resolved)
  }
  return resolved
}
