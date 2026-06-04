"use client"

import { useState } from "react"
import {
  ROUNDING_MODE_LABELS,
  defaultRoundingModeForClass,
  type RoundingModeCode,
} from "@/lib/pricing/rounding-defaults"
import { createPricingPolicy } from "@/lib/pricing-ui/fetchers"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"

type Props = {
  onClose: () => void
  onSuccess: () => void
}

const ROUNDING_OPTIONS = Object.entries(ROUNDING_MODE_LABELS) as [
  string,
  string,
][]

export function PricingPolicyCreateModal({ onClose, onSuccess }: Props) {
  const [marketType, setMarketType] = useState("SERVICES")
  const [pricingClass, setPricingClass] = useState("MATERIAL")
  const [markupPercent, setMarkupPercent] = useState("")
  const [roundingMode, setRoundingMode] = useState<RoundingModeCode>(
    defaultRoundingModeForClass("MATERIAL")
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onPricingClassChange(value: string) {
    setPricingClass(value)
    setRoundingMode(defaultRoundingModeForClass(value) as RoundingModeCode)
  }

  async function handleSubmit() {
    if (!markupPercent.trim()) {
      setError("Enter markup %")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createPricingPolicy({
        marketType,
        pricingClass,
        markupPercent: Number(markupPercent),
        roundingMode,
        threshold: null,
      })
      onSuccess()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 className="text-lg font-semibold">New pricing policy</h2>

        <label className="block text-sm">
          <span className="font-medium">Market type</span>
          <select
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
            value={marketType}
            onChange={(e) => setMarketType(e.target.value)}
          >
            <option value="SERVICES">SERVICES (HO → shop)</option>
            <option value="OUTSIDERS">OUTSIDERS</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium">Pricing class</span>
          <select
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
            value={pricingClass}
            onChange={(e) => onPricingClassChange(e.target.value)}
          >
            <option value="MATERIAL">MATERIAL (default CENT_05)</option>
            <option value="MACHINERY">MACHINERY (default BAHT_10)</option>
            <option value="CONSUMABLE">CONSUMABLE (default CENT_01)</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium">Markup %</span>
          <input
            type="number"
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
            value={markupPercent}
            onChange={(e) => setMarkupPercent(e.target.value)}
            placeholder="e.g. 5"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Rounding (after markup)</span>
          <select
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
            value={roundingMode}
            onChange={(e) =>
              setRoundingMode(e.target.value as RoundingModeCode)
            }
          >
            {ROUNDING_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {value} — {label}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-border px-3 py-1.5 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={themeBtnPrimary}
            disabled={loading}
            onClick={() => void handleSubmit()}
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
