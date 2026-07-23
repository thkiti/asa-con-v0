"use client"

import { useMemo, useState } from "react"
import { formatMoney } from "@/lib/pricing-ui/format-money"
import type { EndLineVM } from "@/lib/stock-ui/end-fetchers"
import { themeInput, themeMuted } from "@/lib/theme/theme-classes"

type EndLinesGridProps = {
  lines: EndLineVM[]
  readOnly?: boolean
}

function formatQty(value: number | null | undefined): string {
  if (value == null) return "—"
  return String(value)
}

function formatAmount(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—"
  const formatted = formatMoney(value)
  return formatted || "—"
}

export function EndLinesGrid({ lines, readOnly = false }: EndLinesGridProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return lines
    return lines.filter((line) => {
      const code = line.product?.code?.toLowerCase() ?? ""
      const name = line.product?.name?.toLowerCase() ?? ""
      return code.includes(q) || name.includes(q)
    })
  }, [lines, search])

  return (
    <div className="space-y-2" data-testid="end-lines-grid">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label className="block text-sm">
          <span className={themeMuted}>Search code / name</span>
          <input
            type="search"
            className={`${themeInput} max-w-xs`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter products…"
            disabled={false}
          />
        </label>
        <p className={`text-sm tabular-nums ${themeMuted}`}>
          {filtered.length} / {lines.length} lines
          {readOnly ? " · read-only" : ""}
        </p>
      </div>

      <div className="overflow-auto rounded border border-border">
        <table className="min-w-[1100px] w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--btn-secondary-hover)]">
            <tr className="border-b border-border text-left">
              <th className="px-2 py-2 font-medium">Code</th>
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 text-right font-medium">BEGIN</th>
              <th className="px-2 py-2 text-right font-medium">IN</th>
              <th className="px-2 py-2 text-right font-medium">USAGE</th>
              <th className="px-2 py-2 text-right font-medium">ACTUAL</th>
              <th className="px-2 py-2 text-right font-medium">COUNT</th>
              <th className="px-2 py-2 text-right font-medium">ENDING</th>
              <th className="px-2 py-2 text-right font-medium">ADJ Qty</th>
              <th className="px-2 py-2 text-right font-medium">Selling Price</th>
              <th className="px-2 py-2 text-right font-medium">ADJ Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className={`px-2 py-6 text-center ${themeMuted}`}
                >
                  No product lines.
                </td>
              </tr>
            ) : (
              filtered.map((line) => (
                <tr
                  key={line.id}
                  className="border-b border-border/70 odd:bg-card even:bg-[var(--btn-secondary-bg)]"
                >
                  <td className="px-2 py-1.5 font-mono text-xs">
                    {line.product?.code ?? line.productId}
                  </td>
                  <td className="max-w-[220px] truncate px-2 py-1.5">
                    {line.product?.name ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatQty(line.beginQty)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatQty(line.inQty)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatQty(line.usageQty)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatQty(line.actualQty)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatQty(line.countQty)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatQty(line.endingQty)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatQty(line.adjQty)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatAmount(line.sellingPriceSnapshot)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatAmount(line.adjAmount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
