"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { applyThemeToDocument, getSystemPrefersDark } from "@/lib/theme/apply-theme-dom"
import { readThemeMode, writeThemeMode } from "@/lib/theme/storage"
import type { ResolvedTheme, ThemeMode } from "@/lib/theme/types"

type ThemeContextValue = {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => readThemeMode())
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    applyThemeToDocument(readThemeMode())
  )

  const setMode = useCallback((next: ThemeMode) => {
    writeThemeMode(next)
    setModeState(next)
    setResolved(applyThemeToDocument(next))
  }, [])

  useEffect(() => {
    const initial = readThemeMode()
    setModeState(initial)
    setResolved(applyThemeToDocument(initial))
  }, [])

  useEffect(() => {
    if (mode !== "system") {
      return
    }

    if (typeof window.matchMedia !== "function") {
      setResolved(applyThemeToDocument("system", false))
      return
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const onChange = () => {
      setResolved(applyThemeToDocument("system", media.matches))
    }

    onChange()
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [mode])

  const value = useMemo(
    () => ({ mode, resolved, setMode }),
    [mode, resolved, setMode]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}
