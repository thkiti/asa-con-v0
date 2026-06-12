"use client"

import { useCallback, useEffect, useState } from "react"
import type { PricingPolicyRow } from "@/lib/pricing"
import {
  fetchPolicyLookup,
  fetchPricingPolicies,
} from "@/lib/pricing-ui/fetchers"
import { themeBtnPrimary, themeMuted } from "@/lib/theme/theme-classes"
import { PricingPageShell } from "./PricingPageShell"
import type { DocumentEntityCode } from "@/lib/legal-entity"
import { PricingPolicyCreateModal } from "./PricingPolicyCreateModal"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function markupDisplay(decimal: string): string {
  const n = Number(decimal)
  if (!Number.isFinite(n)) return decimal
  return `${(n * 100).toFixed(2)}%`
}

export function PricingPolicyPage({
  documentEntityCode,
}: {
  documentEntityCode: DocumentEntityCode
}) {
  const [items, setItems] = useState<PricingPolicyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [lookupMarket, setLookupMarket] = useState("SERVICES")
  const [lookupClass, setLookupClass] = useState("MATERIAL")
  const [lookupResult, setLookupResult] = useState<PricingPolicyRow | null | undefined>(
    undefined
  )

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchPricingPolicies())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function runLookup() {
    try {
      setLookupResult(await fetchPolicyLookup(lookupMarket, lookupClass))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed")
    }
  }

  return (
    <PricingPageShell
      title="Pricing Policy"
      documentEntityCode={documentEntityCode}
      description="HO → SHOP transfer pricing: markup % then rounding. Active row has no end date."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={themeBtnPrimary}
          onClick={() => setModalOpen(true)}
        >
          + New policy
        </button>
      </div>

      <section className="mb-8 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Policy lookup (get-policy)</h2>
        <p className={`mt-1 text-xs ${themeMuted}`}>
          Returns the active policy for market + pricing class.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <select
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
            value={lookupMarket}
            onChange={(e) => setLookupMarket(e.target.value)}
          >
            <option value="SERVICES">SERVICES</option>
            <option value="OUTSIDERS">OUTSIDERS</option>
          </select>
          <select
            className="rounded border border-border bg-background px-2 py-1.5 text-sm"
            value={lookupClass}
            onChange={(e) => setLookupClass(e.target.value)}
          >
            <option value="MATERIAL">MATERIAL</option>
            <option value="MACHINERY">MACHINERY</option>
            <option value="CONSUMABLE">CONSUMABLE</option>
          </select>
          <button
            type="button"
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted"
            onClick={() => void runLookup()}
          >
            Lookup
          </button>
        </div>
        {lookupResult !== undefined ? (
          <pre className="mt-3 overflow-x-auto rounded bg-muted p-2 text-xs">
            {lookupResult
              ? JSON.stringify(lookupResult, null, 2)
              : "No active policy"}
          </pre>
        ) : null}
      </section>

      {loading ? <p className={themeMuted}>Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="p-2">Market</th>
              <th className="p-2">Class</th>
              <th className="p-2">Markup</th>
              <th className="p-2">Rounding</th>
              <th className="p-2">Threshold</th>
              <th className="p-2">From</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="p-2">{row.marketType}</td>
                <td className="p-2">{row.pricingClass}</td>
                <td className="p-2 tabular-nums">{markupDisplay(row.markupPercent)}</td>
                <td className="p-2">{row.roundingMode}</td>
                <td className="p-2 tabular-nums">{row.threshold ?? "—"}</td>
                <td className="p-2">{formatDate(row.effectiveFrom)}</td>
                <td className="p-2">
                  {row.effectiveTo ? (
                    <span className="text-muted-foreground">Closed</span>
                  ) : (
                    <span className="font-medium text-green-700">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <PricingPolicyCreateModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => void reload()}
        />
      ) : null}
    </PricingPageShell>
  )
}
