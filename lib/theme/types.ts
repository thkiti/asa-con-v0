export type ThemeMode = "light" | "dark" | "system"

export type ResolvedTheme = "light" | "dark"

export const THEME_MODES: readonly ThemeMode[] = ["dark", "light", "system"]

export const DEFAULT_THEME_MODE: ThemeMode = "system"

export const THEME_STORAGE_KEY = "asa-con-v0-theme-mode"
