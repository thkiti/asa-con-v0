import type { DocType } from "@/lib/stock-ui/types"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"

type StockDocumentLinesTableProps = {
  docType: DocType
  lines: EditorLineRowVM[]
  readOnly: boolean
  onAddLine: () => void
  onRemoveLine: (key: string) => void
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
}

export function StockDocumentLinesTable({
  docType,
  lines,
  readOnly,
  onAddLine,
  onRemoveLine,
  onLineChange,
}: StockDocumentLinesTableProps) {
  const showAdjFields = docType === "ADJUSTMENT"

  return (
    <section className="rounded border border-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-2">
        <h2 className="text-sm font-semibold text-zinc-900">Lines</h2>
        {!readOnly ? (
          <button
            type="button"
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm hover:bg-zinc-100"
            onClick={onAddLine}
          >
            Add line
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
            <tr>
              <th className="px-3 py-2 font-medium">Product ID</th>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium text-right">Qty</th>
              {showAdjFields ? (
                <>
                  <th className="px-3 py-2 font-medium text-right">Ending qty</th>
                  <th className="px-3 py-2 font-medium text-right">ADJ delta</th>
                </>
              ) : null}
              {!readOnly ? (
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.key} className="border-b border-zinc-100">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    className="w-full min-w-[8rem] rounded border border-zinc-300 px-2 py-1 disabled:bg-zinc-100"
                    value={line.productId}
                    disabled={readOnly}
                    placeholder="Product uuid"
                    onChange={(e) =>
                      onLineChange(line.key, { productId: e.target.value })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    className="w-full min-w-[6rem] rounded border border-zinc-300 px-2 py-1 disabled:bg-zinc-100"
                    value={line.productCode}
                    disabled={readOnly}
                    placeholder="Display"
                    onChange={(e) =>
                      onLineChange(line.key, { productCode: e.target.value })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    className="w-full min-w-[8rem] rounded border border-zinc-300 px-2 py-1 disabled:bg-zinc-100"
                    value={line.productName}
                    disabled={readOnly}
                    placeholder="Display"
                    onChange={(e) =>
                      onLineChange(line.key, { productName: e.target.value })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="w-24 rounded border border-zinc-300 px-2 py-1 text-right disabled:bg-zinc-100"
                    value={line.qty}
                    disabled={readOnly}
                    onChange={(e) => onLineChange(line.key, { qty: e.target.value })}
                  />
                </td>
                {showAdjFields ? (
                  <>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-24 rounded border border-zinc-300 px-2 py-1 text-right disabled:bg-zinc-100"
                        value={line.endingQty}
                        disabled={readOnly}
                        onChange={(e) =>
                          onLineChange(line.key, { endingQty: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-24 rounded border border-zinc-300 px-2 py-1 text-right disabled:bg-zinc-100"
                        value={line.reviewPostingDelta}
                        disabled={readOnly}
                        onChange={(e) =>
                          onLineChange(line.key, {
                            reviewPostingDelta: e.target.value,
                          })
                        }
                      />
                    </td>
                  </>
                ) : null}
                {!readOnly ? (
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-sm text-red-700 hover:underline"
                      onClick={() => onRemoveLine(line.key)}
                    >
                      Remove
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
