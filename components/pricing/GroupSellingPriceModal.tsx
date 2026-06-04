"use client"

import { useEffect, useState } from "react"
import type { SellingPriceGroupPreview } from "@/lib/pricing/reference-product-group"
import {
  fetchSellingPriceGroupPreview,
  setSellingPriceGroup,
} from "@/lib/pricing-ui/fetchers"
import { formatMoney } from "@/lib/pricing-ui/format-money"
import { themeBtnPrimary } from "@/lib/theme/theme-classes"

type Props = {
  productId: string
  onClose: () => void
  onSaved: () => void
}

export function GroupSellingPriceModal({ productId, onClose, onSaved }: Props) {
  const [preview, setPreview] = useState<SellingPriceGroupPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [newPriceRaw, setNewPriceRaw] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError("")
    void (async () => {
      try {
        const data = await fetchSellingPriceGroupPreview(productId)
        if (!cancelled) {
          setPreview(data)
          setNewPriceRaw(
            data.anchor.price != null ? String(data.anchor.price) : ""
          )
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Load failed")
          setPreview(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [productId])

  async function handleSave() {
    if (!preview) return
    setSaveError("")
    const raw = newPriceRaw.replace(/,/g, "").trim()
    if (!raw || Number.isNaN(Number(raw))) {
      setSaveError("Enter a valid price")
      return
    }
    const newPrice = Number(Number(raw).toFixed(2))
    if (newPrice <= 0) {
      setSaveError("Price must be greater than 0")
      return
    }

    setSaving(true)
    try {
      await setSellingPriceGroup({
        anchorProductId: preview.anchor.productId,
        newPrice,
        expectedOldPrice: preview.anchor.price,
      })
      onSaved()
      onClose()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">Set price by group</h2>
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {loadError ? <p className="text-sm text-red-700">{loadError}</p> : null}

        {preview ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">{preview.anchor.code}</span> —{" "}
              {preview.anchor.name}
            </p>
            <p>
              Group: <span className="font-mono">{preview.groupLabel}</span> (
              {preview.mode})
              {preview.groupAmbiguous ? " — ambiguous productGroup" : ""}
            </p>
            <p className="tabular-nums">
              Current anchor price:{" "}
              {preview.anchor.price != null
                ? formatMoney(preview.anchor.price)
                : "—"}
            </p>
            <p>
              Members: {preview.memberCount} · Eligible for bulk:{" "}
              {preview.bulkEligibleCount} · Skipped: {preview.bulkSkippedCount}
            </p>

            <label className="block">
              <span className="font-medium">New price</span>
              <input
                type="text"
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-right tabular-nums"
                value={newPriceRaw}
                onChange={(e) => setNewPriceRaw(e.target.value)}
              />
            </label>

            {preview.bulkSkipped.length > 0 ? (
              <div className="max-h-32 overflow-y-auto rounded border border-border p-2 text-xs">
                <p className="font-medium">Skipped (price ≠ anchor)</p>
                <ul className="mt-1 space-y-1">
                  {preview.bulkSkipped.map((m) => (
                    <li key={m.productId}>
                      {m.code} — {formatMoney(m.price)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {saveError ? <p className="text-red-700">{saveError}</p> : null}

            <button
              type="button"
              className={themeBtnPrimary}
              disabled={saving || preview.bulkEligibleCount === 0}
              onClick={() => void handleSave()}
            >
              {saving
                ? "Saving…"
                : `Apply to ${preview.bulkEligibleCount} item(s)`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
