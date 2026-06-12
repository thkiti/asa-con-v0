"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ProductWithActiveSellingPrice } from "@/lib/pricing"
import {
  fetchSellingPriceProducts,
  setSellingPriceItem,
} from "@/lib/pricing-ui/fetchers"
import { formatMoney } from "@/lib/pricing-ui/format-money"
import { themeBtnPrimary, themeMuted } from "@/lib/theme/theme-classes"
import { GroupSellingPriceModal } from "./GroupSellingPriceModal"
import { PricingPageShell } from "./PricingPageShell"
import type { DocumentEntityCode } from "@/lib/legal-entity"

function digitsOnly(code: unknown): string {
  return String(code ?? "").replace(/\D/g, "")
}

export function SellingPricePage({
  documentEntityCode,
}: {
  documentEntityCode: DocumentEntityCode
}) {
  const [products, setProducts] = useState<ProductWithActiveSellingPrice[]>([])
  const [codePrefix, setCodePrefix] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupProductId, setGroupProductId] = useState<string | null>(null)
  const inputRefs = useRef<HTMLInputElement[]>([])
  const buttonRefs = useRef<HTMLButtonElement[]>([])

  const filtered = useMemo(() => {
    const q = codePrefix.trim()
    if (!q) return products
    return products.filter((p) => digitsOnly(p.code).startsWith(q))
  }, [products, codePrefix])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProducts(await fetchSellingPriceProducts())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function saveRow(index: number) {
    const input = inputRefs.current[index]
    const product = filtered[index]
    if (!input || !product) return

    const raw = input.value.replace(/,/g, "")
    if (!raw || Number.isNaN(Number(raw))) {
      alert("Enter a price first")
      return
    }

    try {
      await setSellingPriceItem({
        productId: product.id,
        price: Number(Number(raw).toFixed(2)),
      })
      input.value = formatMoney(raw)
      await reload()
      const next = inputRefs.current[index + 1]
      if (next) {
        next.focus()
        next.select()
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed")
    }
  }

  return (
    <PricingPageShell
      title="Selling Price"
      documentEntityCode={documentEntityCode}
      description="Global retail price for all shops. Set by item or by reference group. Each save creates a new effective-dated row."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          inputMode="numeric"
          value={codePrefix}
          onChange={(e) =>
            setCodePrefix(e.target.value.replace(/\D/g, "").slice(0, 7))
          }
          placeholder="Filter code…"
          className="w-28 rounded border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
          aria-label="Filter by product code prefix"
        />
        <span className={`text-xs tabular-nums ${themeMuted}`}>
          {filtered.length} of {products.length} products
        </span>
      </div>

      {loading ? <p className={themeMuted}>Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[88px_minmax(0,1fr)_140px_64px_72px] gap-2 border-b border-border bg-muted/50 p-2 text-xs font-semibold">
          <div>Code</div>
          <div>Name</div>
          <div className="text-right">Price</div>
          <div className="text-center">Group</div>
          <div />
        </div>
        <div className="max-h-[min(70vh,640px)] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className={`p-6 text-center text-sm ${themeMuted}`}>No products</p>
          ) : (
            filtered.map((p, index) => (
              <div
                key={p.id}
                className="grid grid-cols-[88px_minmax(0,1fr)_140px_64px_72px] items-center gap-2 border-t border-border p-2 text-sm first:border-t-0"
              >
                <div className="tabular-nums text-muted-foreground">{p.code}</div>
                <div className="truncate font-medium" title={p.name}>
                  {p.name}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    ref={(el) => {
                      if (el) inputRefs.current[index] = el
                    }}
                    type="text"
                    className="w-full rounded border border-border bg-background px-2 py-1 text-right text-sm tabular-nums"
                    defaultValue={
                      p.activePrice ? formatMoney(p.activePrice) : ""
                    }
                    onFocus={(e) => {
                      e.target.value = e.target.value.replace(/,/g, "")
                      e.target.select()
                    }}
                    onBlur={(e) => {
                      const raw = e.target.value.replace(/,/g, "")
                      if (raw && !Number.isNaN(Number(raw))) {
                        e.target.value = formatMoney(raw)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        buttonRefs.current[index]?.focus()
                      }
                    }}
                  />
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                    onClick={() => setGroupProductId(p.id)}
                  >
                    Group
                  </button>
                </div>
                <div>
                  <button
                    ref={(el) => {
                      if (el) buttonRefs.current[index] = el
                    }}
                    type="button"
                    className={`${themeBtnPrimary} w-full px-2 py-1 text-xs`}
                    onClick={() => void saveRow(index)}
                  >
                    Save
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {groupProductId ? (
        <GroupSellingPriceModal
          productId={groupProductId}
          onClose={() => setGroupProductId(null)}
          onSaved={() => void reload()}
        />
      ) : null}
    </PricingPageShell>
  )
}
