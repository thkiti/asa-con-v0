import type { ReactNode } from "react"
import {
  compactHeaderFieldClass,
  compactNumericInputClass,
} from "@/lib/shop-ui/compact-form-helpers"
import { themeInput } from "@/lib/theme/theme-classes"
import { themeMuted } from "@/lib/theme/theme-classes"

type CompactFieldBoxProps = {
  label?: string
  children: ReactNode
  className?: string
  labelClassName?: string
  testId?: string
}

export function CompactFieldBox({
  label,
  children,
  className = "",
  labelClassName = "text-xs",
  testId,
}: CompactFieldBoxProps) {
  return (
    <div
      className={`${compactHeaderFieldClass} flex min-w-0 items-center gap-1 p-0 ${className}`.trim()}
      data-testid={testId}
    >
      {label ? (
        <span
          className={`shrink-0 pl-2 font-medium leading-none ${labelClassName} ${themeMuted}`}
          aria-hidden
        >
          {label}
        </span>
      ) : null}
      {children}
    </div>
  )
}

const compactInlineFieldShellClass = `${themeInput} mt-0 flex items-center gap-1 overflow-hidden p-0 ${compactNumericInputClass}`

/** Inline-prefix field for week pattern row (Sun 1.5 style). */
export function CompactInlineFieldBox({
  label,
  children,
  className = "",
  testId,
}: CompactFieldBoxProps) {
  return (
    <div
      className={`${compactInlineFieldShellClass} ${className}`.trim()}
      data-testid={testId}
    >
      {label ? (
        <span
          className={`shrink-0 pl-2 text-[10px] font-semibold ${themeMuted}`}
          aria-hidden
        >
          {label}
        </span>
      ) : null}
      {children}
    </div>
  )
}
