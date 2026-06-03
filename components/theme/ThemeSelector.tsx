"use client"

import { useTheme } from "@/components/theme/ThemeProvider"
import { themeMuted, themeSelect } from "@/lib/theme/theme-classes"
import { THEME_MODES, type ThemeMode } from "@/lib/theme/types"

const MODE_LABELS: Record<ThemeMode, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
}

export function ThemeSelector() {
  const { mode, setMode } = useTheme()

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor="theme-mode-select" className={themeMuted}>
        Theme:
      </label>
      <select
        id="theme-mode-select"
        value={mode}
        onChange={(event) => setMode(event.target.value as ThemeMode)}
        className={themeSelect}
        aria-label="Theme"
      >
        {THEME_MODES.map((option) => (
          <option key={option} value={option}>
            {MODE_LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  )
}
