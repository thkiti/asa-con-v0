import { useMemo } from "react"
import {
  SHOE_PREFIX_SECTIONS,
  type CountingHookGroup,
} from "@/lib/stock-ui/counting-hook-groups"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"
import { StockDocumentHookTabs } from "./StockDocumentHookTabs"

type StockDocumentCountingGridProps = {
  lines: EditorLineRowVM[]
  activeHookGroup: CountingHookGroup
  readOnly: boolean
  onHookGroupChange: (hookGroup: CountingHookGroup) => void
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
}

function hookDisplay(line: EditorLineRowVM): string {
  if (line.hookLabel?.trim()) return line.hookLabel
  if (line.hookNo != null) return String(line.hookNo)
  return "—"
}

function codeDisplay(line: EditorLineRowVM, hookGroup: CountingHookGroup): string {
  if (hookGroup === "S") {
    return line.productCode || line.displayCode || "—"
  }
  return line.displayCode || line.productCode || "—"
}

function QtyCell({
  line,
  readOnly,
  onLineChange,
}: {
  line: EditorLineRowVM
  readOnly: boolean
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
}) {
  return (
    <td className="px-3 py-2 text-right">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        className="w-20 rounded border border-zinc-300 px-2 py-1 text-right disabled:bg-zinc-100"
        value={line.qty}
        disabled={readOnly}
        aria-label={`Qty for ${line.productName || line.productCode}`}
        onChange={(e) => onLineChange(line.key, { qty: e.target.value })}
      />
    </td>
  )
}

function KeyGroupTable({
  rows,
  readOnly,
  hookGroup,
  onLineChange,
}: {
  rows: EditorLineRowVM[]
  readOnly: boolean
  hookGroup: CountingHookGroup
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No items in this hook group.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
          <tr>
            <th className="px-3 py-2 font-medium">Hook</th>
            <th className="px-3 py-2 font-medium">Code</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((line) => (
            <tr
              key={line.key}
              className={`border-b border-zinc-100 ${
                line.isOrphan ? "bg-amber-50" : ""
              }`}
            >
              <td className="px-3 py-2 whitespace-nowrap">{hookDisplay(line)}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {codeDisplay(line, hookGroup)}
              </td>
              <td className="max-w-xs truncate px-3 py-2" title={line.productName}>
                {line.productName || "—"}
              </td>
              <QtyCell line={line} readOnly={readOnly} onLineChange={onLineChange} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ShoeGroupTable({
  rows,
  readOnly,
  onLineChange,
}: {
  rows: EditorLineRowVM[]
  readOnly: boolean
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
}) {
  const sections = useMemo(() => {
    const byPrefix = new Map<string, EditorLineRowVM[]>()
    const orphans: EditorLineRowVM[] = []

    for (const line of rows) {
      const section = SHOE_PREFIX_SECTIONS.find((item) =>
        line.productCode.startsWith(item.prefix)
      )
      if (section) {
        const bucket = byPrefix.get(section.prefix) ?? []
        bucket.push(line)
        byPrefix.set(section.prefix, bucket)
      } else {
        orphans.push(line)
      }
    }

    const blocks: Array<{ key: string; title: string; rows: EditorLineRowVM[] }> =
      SHOE_PREFIX_SECTIONS.map((section) => ({
        key: section.prefix,
        title: section.title,
        rows: (byPrefix.get(section.prefix) ?? []).sort((a, b) =>
          a.productCode.localeCompare(b.productCode)
        ),
      })).filter((block) => block.rows.length > 0)

    if (orphans.length > 0) {
      blocks.push({
        key: "other",
        title: "Other shoe materials",
        rows: orphans.sort((a, b) => a.productCode.localeCompare(b.productCode)),
      })
    }

    return blocks
  }, [rows])

  if (sections.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No shoe materials in this hook group.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.key}>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">
            {section.title}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((line) => (
                  <tr key={line.key} className="border-b border-zinc-100">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {line.productCode || "—"}
                    </td>
                    <td
                      className="max-w-xs truncate px-3 py-2"
                      title={line.productName}
                    >
                      {line.productName || "—"}
                    </td>
                    <QtyCell
                      line={line}
                      readOnly={readOnly}
                      onLineChange={onLineChange}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

export function StockDocumentCountingGrid({
  lines,
  activeHookGroup,
  readOnly,
  onHookGroupChange,
  onLineChange,
}: StockDocumentCountingGridProps) {
  const countedByGroup = useMemo(() => {
    const counts: Partial<Record<CountingHookGroup, number>> = {}
    for (const line of lines) {
      const group = line.hookGroup
      if (!group) continue
      if (Number(line.qty.trim() || 0) <= 0) continue
      if (group === "K" || group === "C" || group === "M" || group === "O" || group === "S") {
        counts[group] = (counts[group] ?? 0) + 1
      }
    }
    return counts
  }, [lines])

  const visibleRows = useMemo(
    () => lines.filter((line) => line.hookGroup === activeHookGroup),
    [activeHookGroup, lines]
  )

  return (
    <section className="space-y-4 rounded border border-zinc-200">
      <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">Stock count</h2>
          <span className="text-xs text-zinc-600">
            {visibleRows.length} items in {activeHookGroup}
          </span>
        </div>
        <StockDocumentHookTabs
          activeHookGroup={activeHookGroup}
          countedByGroup={countedByGroup}
          onChange={onHookGroupChange}
        />
      </div>

      <div className="px-3 pb-3">
        {activeHookGroup === "S" ? (
          <ShoeGroupTable
            rows={visibleRows}
            readOnly={readOnly}
            onLineChange={onLineChange}
          />
        ) : (
          <KeyGroupTable
            rows={visibleRows}
            readOnly={readOnly}
            hookGroup={activeHookGroup}
            onLineChange={onLineChange}
          />
        )}
      </div>
    </section>
  )
}
