import { useMemo, type ReactNode } from "react"
import type { CountingHookGroup } from "@/lib/stock-ui/counting-hook-groups"
import {
  buildStockDocumentGroupSummary,
  sumStockDocumentGroupSummaryRows,
} from "@/lib/stock-ui/build-counting-group-summary"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"
import { StockDocumentCountingBlocks } from "./StockDocumentCountingBlocks"
import { StockDocumentGroupSummary } from "./StockDocumentGroupSummary"
import { COUNTING_SHEET_ROOT_ATTR } from "./counting-qty-input"
import { StockDocumentHookTabs } from "./StockDocumentHookTabs"

export type StockDocumentCountingSheetProps = {
  lines: EditorLineRowVM[]
  activeHookGroup: CountingHookGroup
  readOnly: boolean
  onHookGroupChange: (hookGroup: CountingHookGroup) => void
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
  toolbarActions?: ReactNode
}

export function StockDocumentCountingSheet({
  lines,
  activeHookGroup,
  readOnly,
  onHookGroupChange,
  onLineChange,
  toolbarActions,
}: StockDocumentCountingSheetProps) {
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

  const countedSummary = useMemo(() => {
    const summaryRows = buildStockDocumentGroupSummary(visibleRows)
    return sumStockDocumentGroupSummaryRows(summaryRows)
  }, [visibleRows])

  const statusLine = useMemo(() => {
    const base = `${visibleRows.length} รายการ กลุ่ม ${activeHookGroup}`
    if (countedSummary.items > 0 || countedSummary.totalQty !== 0) {
      return `${base} | Items: ${countedSummary.items} | Qty: ${countedSummary.totalQty}`
    }
    return base
  }, [activeHookGroup, countedSummary.items, countedSummary.totalQty, visibleRows.length])

  return (
    <section
      className="space-y-4 rounded border border-zinc-200"
      {...{ [COUNTING_SHEET_ROOT_ATTR]: "true" }}
    >
      <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            ตรวจนับสต็อก — รายชิ้น
          </h2>
          <span className="text-xs font-medium text-zinc-800">{statusLine}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <StockDocumentHookTabs
            activeHookGroup={activeHookGroup}
            countedByGroup={countedByGroup}
            onChange={onHookGroupChange}
          />
          {toolbarActions}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-3 pb-3 lg:grid-cols-4">
        <div className="space-y-2 lg:col-span-3">
          <p className="text-xs text-zinc-700 lg:hidden">
            เลื่อนแนวนอนเพื่อดูรายการทั้งหมด
          </p>
          <StockDocumentCountingBlocks
            lines={lines}
            activeHookGroup={activeHookGroup}
            readOnly={readOnly}
            onLineChange={onLineChange}
          />
        </div>
        <div className="lg:col-span-1">
          <StockDocumentGroupSummary visibleRows={visibleRows} />
        </div>
      </div>
    </section>
  )
}
