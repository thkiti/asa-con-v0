"use client"

import { useEffect, useRef } from "react"

type PosBarcodeCaptureProps = {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  disabled?: boolean
}

export function PosBarcodeCapture({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: PosBarcodeCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)

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
    <div className="relative min-h-[56px] min-w-0 flex-1">
      {!value && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end px-3">
          <span className="text-[28px] font-bold leading-none text-zinc-400 sm:text-[30px]">
            Scan barcode ....
          </span>
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
        className={`h-full min-h-[56px] w-full rounded border px-3 text-right text-[30px] font-bold leading-none sm:text-[34px] ${
          disabled
            ? "cursor-not-allowed border-zinc-400 bg-zinc-300/80 text-zinc-500"
            : "border-zinc-500 bg-white text-zinc-900"
        }`}
      />
    </div>
  )
}
