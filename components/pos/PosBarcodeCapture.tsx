"use client"

import { useEffect, useRef } from "react"
import {
  posTerminalBarcodeInput,
  posTerminalBarcodePlaceholder,
  posTerminalBarcodeWrap,
} from "@/lib/pos-ui/pos-terminal-classes"

type PosBarcodeCaptureProps = {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  disabled?: boolean
  /** Increment to request focus (e.g. after checkout completes). */
  focusRequestId?: number
}

export function PosBarcodeCapture({
  value,
  onChange,
  onSubmit,
  disabled = false,
  focusRequestId = 0,
}: PosBarcodeCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (disabled || focusRequestId === 0) return
    inputRef.current?.focus()
  }, [disabled, focusRequestId])

  useEffect(() => {
    if (disabled) return
    const id = window.setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus()
      }
    }, 400)
    return () => window.clearInterval(id)
  }, [disabled])

  return (
    <div className={`${posTerminalBarcodeWrap} relative min-h-[56px] min-w-0 flex-1`}>
      {!value && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end px-3">
          <span className={posTerminalBarcodePlaceholder}>Scan barcode ....</span>
        </div>
      )}
      <input
        ref={inputRef}
        autoFocus
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            e.preventDefault()
            onSubmit?.(value.trim())
          }
        }}
        placeholder=""
        aria-label="Barcode scan input"
        className={`${posTerminalBarcodeInput} h-full min-h-[56px] w-full rounded border px-3 text-right text-[30px] font-bold leading-none sm:text-[34px] ${
          disabled ? "pos-terminal-barcode-input--disabled" : ""
        }`}
      />
    </div>
  )
}
