import { formatHookNumber } from "@/lib/stock-ui/counting-sheet-display"
import type { CountingHookGroup } from "@/lib/stock-ui/counting-hook-groups"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"
import {
  COUNTING_QTY_INPUT_ATTR,
  handleCountingQtyKeyDown,
} from "./counting-qty-input"
import {
  countingBlockHeadCellClass,
  countingBlockHeadClass,
  countingBlockTableClass,
  countingCellCodeClass,
  countingCellHookClass,
  countingCellNameClass,
  countingQtyInputClass,
} from "./counting-sheet-styles"

export type StockDocumentCountingBlockProps = {
  rows: EditorLineRowVM[]
  /** K/C/M/O: Hook + Code + Qty; S: Code + Name + Qty. */
  showHook: boolean
  showProductName?: boolean
  hookGroup?: CountingHookGroup
  readOnly: boolean
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
}

function codeDisplay(line: EditorLineRowVM, showHook: boolean, hookGroup?: CountingHookGroup): string {
  if (!showHook) {
    return line.productCode || line.displayCode || "—"
  }
  if (hookGroup === "S") {
    return line.productCode || line.displayCode || "—"
  }
  return line.displayCode || line.productCode || "—"
}

function qtyAriaLabel(line: EditorLineRowVM, code: string): string {
  const name = line.productName?.trim()
  if (name) return `จำนวน ${name} รหัส ${code}`
  return `จำนวน รหัส ${code}`
}

/** Wired to qty input — exported for unit tests without a DOM environment. */
export function applyCountingQtyChange(
  lineKey: string,
  value: string,
  onLineChange: StockDocumentCountingBlockProps["onLineChange"]
): void {
  onLineChange(lineKey, { qty: value })
}

export function StockDocumentCountingBlock({
  rows,
  showHook,
  showProductName = false,
  hookGroup,
  readOnly,
  onLineChange,
}: StockDocumentCountingBlockProps) {
  if (rows.length === 0) return null

  return (
    <table className={countingBlockTableClass}>
      <thead className={countingBlockHeadClass}>
        <tr>
          {showHook ? (
            <th className={countingBlockHeadCellClass}>Hook</th>
          ) : null}
          <th className={countingBlockHeadCellClass}>รหัส</th>
          {showProductName ? (
            <th className={countingBlockHeadCellClass}>Name</th>
          ) : null}
          <th className={`${countingBlockHeadCellClass} text-right`}>จำนวน</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((line) => {
          const code = codeDisplay(line, showHook, hookGroup)
          return (
            <tr
              key={line.key}
              className={`border-b border-zinc-200 ${
                line.isOrphan ? "bg-amber-50" : "bg-white"
              }`}
              title={line.isOrphan ? "รายการนอกรายการอ้างอิงปัจจุบัน" : undefined}
            >
              {showHook ? (
                <td className={countingCellHookClass}>
                  {formatHookNumber(line)}
                </td>
              ) : null}
              <td className={countingCellCodeClass}>{code}</td>
              {showProductName ? (
                <td
                  className={countingCellNameClass}
                  title={line.productName || undefined}
                >
                  {line.productName?.trim() || "—"}
                </td>
              ) : null}
              <td className="px-1 py-0.5 text-right">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={countingQtyInputClass}
                  value={line.qty}
                  disabled={readOnly}
                  aria-label={qtyAriaLabel(line, code)}
                  {...{ [COUNTING_QTY_INPUT_ATTR]: "true" }}
                  onChange={(e) =>
                    applyCountingQtyChange(line.key, e.target.value, onLineChange)
                  }
                  onKeyDown={handleCountingQtyKeyDown}
                />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
