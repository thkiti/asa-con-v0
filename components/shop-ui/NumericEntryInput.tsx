"use client"

import { forwardRef, type InputHTMLAttributes } from "react"
import {
  compactHeaderFieldClass,
  compactNumericInputClass,
  handleEnterFocusNext,
  selectAllOnFocus,
} from "@/lib/shop-ui/compact-form-helpers"

type NumericEntryInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> & {
  value: string
  onValueChange: (value: string) => void
  /** Borderless input inside CompactFieldBox. */
  embedded?: boolean
  align?: "left" | "center" | "right"
  onEnterFocusNext?: HTMLElement | null
}

const alignClass: Record<NonNullable<NumericEntryInputProps["align"]>, string> =
  {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }

export const NumericEntryInput = forwardRef<
  HTMLInputElement,
  NumericEntryInputProps
>(function NumericEntryInput(
  {
    value,
    onValueChange,
    embedded = false,
    align = "left",
    onEnterFocusNext,
    className = "",
    onFocus,
    onKeyDown,
    inputMode = "decimal",
    ...rest
  },
  ref
) {
  const embeddedClass =
    "h-full min-w-0 flex-1 border-0 bg-transparent py-0 pr-2 text-sm leading-none focus:outline-none focus:ring-0"
  const standaloneClass = `${compactHeaderFieldClass} ${alignClass[align]}`

  return (
    <input
      ref={ref}
      type="text"
      inputMode={inputMode}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onFocus={(e) => {
        selectAllOnFocus(e)
        onFocus?.(e)
      }}
      onKeyDown={(e) => {
        if (onEnterFocusNext) {
          handleEnterFocusNext(e, onEnterFocusNext)
        }
        onKeyDown?.(e)
      }}
      className={`${embedded ? embeddedClass : standaloneClass} ${alignClass[align]} tabular-nums ${className}`.trim()}
      {...rest}
    />
  )
})
