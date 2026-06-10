/**
 * Phase 23F-3d — compact counting sheet regression bundle.
 * Covers save contract, active-tab summary scope, read-only, orphan hint, and block order.
 */
import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentCountingBlock } from "@/components/stock/StockDocumentCountingBlock"
import { StockDocumentCountingBlocks } from "@/components/stock/StockDocumentCountingBlocks"
import { StockDocumentCountingSheet } from "@/components/stock/StockDocumentCountingSheet"
import { StockDocumentGroupSummary } from "@/components/stock/StockDocumentGroupSummary"
import { editorStateToSavePayload } from "@/lib/stock-ui/editor-draft-state"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"
import { DEFAULT_COUNTING_BLOCK_SIZE } from "@/lib/stock-ui/counting-sheet-layout"
import {
  countingQtyInputClass,
  countingSummaryPanelClass,
} from "@/components/stock/counting-sheet-styles"

function kLine(
  n: number,
  overrides?: Partial<EditorLineRowVM>
): EditorLineRowVM {
  return {
    key: `K-${n}`,
    productId: `prod-${n}`,
    productCode: `010${String(n).padStart(4, "0")}`,
    productName: `Item ${n}`,
    displayCode: `CODE-${String(n).padStart(2, "0")}`,
    hookGroup: "K",
    hookNo: n,
    hookLabel: `K.${n}`,
    productGroup: "0101900",
    qty: "",
    endingQty: "",
    reviewPostingDelta: "",
    ...overrides,
  }
}

describe("23F-3d counting sheet regression", () => {
  describe("save payload contract", () => {
    it("editorStateToSavePayload omits zero-qty counting lines and sets reviewPostingDelta = qty", () => {
      const payload = editorStateToSavePayload(
        {
          documentId: "doc-1",
          refNo: "ADJ-1",
          docType: "ADJUSTMENT",
          status: "DRAFT",
          date: "2026-06-02",
          branchId: "branch-shop",
          fromLocId: "branch-shop",
          toLocId: "",
          readOnly: false,
          lines: [
            kLine(1, { productId: "prod-1", qty: "3" }),
            kLine(2, { productId: "prod-2", qty: "0" }),
            kLine(3, { productId: "prod-3", qty: "" }),
          ],
        },
        "staff-1"
      )

      expect(payload.lines).toEqual([
        { productId: "prod-1", qty: 3, reviewPostingDelta: 3 },
      ])
      expect(payload.lines.every((line) => !("endingQty" in line))).toBe(true)
    })
  })

  describe("readability / contrast", () => {
    it("editable rows use high-contrast text without row opacity", () => {
      const html = renderToStaticMarkup(
        <StockDocumentCountingBlock
          rows={[kLine(1, { qty: "1" })]}
          showHook
          hookGroup="K"
          readOnly={false}
          onLineChange={() => {}}
        />
      )

      expect(html).toContain("text-zinc-950")
      expect(html).toContain(countingQtyInputClass)
      expect(html).toContain("disabled:opacity-100")
      expect(html).not.toMatch(/<tr[^>]*opacity/)
    })

    it("read-only disables qty but keeps hook and code cells high-contrast", () => {
      const html = renderToStaticMarkup(
        <StockDocumentCountingBlock
          rows={[kLine(3, { displayCode: "CODE-03", qty: "2" })]}
          showHook
          hookGroup="K"
          readOnly
          onLineChange={() => {}}
        />
      )

      expect(html).toContain('disabled=""')
      expect(html).toContain("text-zinc-950")
      expect(html).toContain("CODE-03")
      expect(html).not.toMatch(/<td[^>]*opacity/)
    })

    it("group summary panel uses solid white background and dark body text", () => {
      const html = renderToStaticMarkup(
        <StockDocumentGroupSummary
          visibleRows={[kLine(1, { productGroup: "0101900", qty: "1" })]}
        />
      )

      expect(html).toContain(countingSummaryPanelClass)
      expect(html).not.toContain("bg-zinc-50/50")
      expect(html).toContain("text-zinc-950")
      expect(html).toContain("text-zinc-800")
    })
  })

  describe("compact sheet display", () => {
    it("read-only disables qty inputs on sheet", () => {
      const html = renderToStaticMarkup(
        <StockDocumentCountingSheet
          lines={[kLine(1, { qty: "1" })]}
          activeHookGroup="K"
          readOnly
          onHookGroupChange={() => {}}
          onLineChange={() => {}}
        />
      )

      expect(html).toContain('disabled=""')
    })

    it("orphan rows keep amber highlight and Thai title hint", () => {
      const html = renderToStaticMarkup(
        <StockDocumentCountingBlock
          rows={[kLine(9, { isOrphan: true, productName: "Orphan item" })]}
          showHook
          hookGroup="K"
          readOnly={false}
          onLineChange={() => {}}
        />
      )

      expect(html).toContain("bg-amber-50")
      expect(html).toContain("รายการนอกรายการอ้างอิงปัจจุบัน")
      expect(html).not.toContain(">Orphan item<")
    })

    it("hook cell shows bare number, not K.N label", () => {
      const html = renderToStaticMarkup(
        <StockDocumentCountingSheet
          lines={[kLine(10, { hookLabel: "K.10", hookNo: 10 })]}
          activeHookGroup="K"
          readOnly={false}
          onHookGroupChange={() => {}}
          onLineChange={() => {}}
        />
      )

      expect(html).toContain(">10<")
      expect(html).not.toContain("K.10")
    })

    it("renders multiple horizontal blocks for 40+ K rows sorted by hook", () => {
      const many = Array.from({ length: 45 }, (_, i) =>
        kLine(45 - i, { displayCode: `CODE-${String(45 - i).padStart(2, "0")}` })
      )
      const html = renderToStaticMarkup(
        <StockDocumentCountingBlocks
          lines={many}
          activeHookGroup="K"
          readOnly={false}
          onLineChange={() => {}}
        />
      )

      const blockCount = (html.match(/min-w-\[9rem\]/g) ?? []).length
      expect(blockCount).toBe(Math.ceil(45 / DEFAULT_COUNTING_BLOCK_SIZE))
      expect(html.indexOf("CODE-01")).toBeLessThan(html.indexOf("CODE-45"))
    })

    it("sorts hook 2 before hook 10 numerically", () => {
      const html = renderToStaticMarkup(
        <StockDocumentCountingBlocks
          lines={[
            kLine(10, { displayCode: "TEN" }),
            kLine(2, { displayCode: "TWO" }),
          ]}
          activeHookGroup="K"
          readOnly={false}
          onLineChange={() => {}}
        />
      )

      expect(html.indexOf("TWO")).toBeLessThan(html.indexOf("TEN"))
    })

    it("tab badges reflect counted rows with qty > 0", () => {
      const html = renderToStaticMarkup(
        <StockDocumentCountingSheet
          lines={[
            kLine(1, { qty: "1" }),
            {
              ...kLine(1, { key: "C-1", hookGroup: "C", hookLabel: "C.1", qty: "2" }),
              displayCode: "#C1",
            },
          ]}
          activeHookGroup="K"
          readOnly={false}
          onHookGroupChange={() => {}}
          onLineChange={() => {}}
        />
      )

      const kTabBadge = html.match(/>\s*K\s*<[\s\S]*?>\s*1\s*<\/span>/)
      expect(kTabBadge).not.toBeNull()
    })
  })

  describe("group summary scope", () => {
    it("summary aggregates visibleRows only, not other hook groups", () => {
      const visibleK: EditorLineRowVM[] = [
        kLine(1, { productGroup: "0101900", qty: "2" }),
        kLine(2, { productGroup: "0101900", qty: "1" }),
      ]

      const html = renderToStaticMarkup(
        <StockDocumentGroupSummary visibleRows={visibleK} />
      )

      expect(html).toContain("0101900")
      expect(html).not.toContain("0201900")

      const allLines = [
        ...visibleK,
        {
          ...kLine(1, { key: "C-1", hookGroup: "C", productGroup: "0201900", qty: "9" }),
          displayCode: "#C1",
        },
      ]
      const sheetHtml = renderToStaticMarkup(
        <StockDocumentCountingSheet
          lines={allLines}
          activeHookGroup="K"
          readOnly={false}
          onHookGroupChange={() => {}}
          onLineChange={() => {}}
        />
      )
      expect(sheetHtml).toContain("0101900")
      expect(sheetHtml).not.toContain("0201900")
      expect(html).toContain(">items<")
    })

    it("summary items counts only lines with non-zero qty", () => {
      const html = renderToStaticMarkup(
        <StockDocumentGroupSummary
          visibleRows={[
            kLine(1, { productGroup: "G1", productName: "A", qty: "2" }),
            kLine(2, { productGroup: "G1", productName: "B", qty: "" }),
            kLine(3, { productGroup: "G1", productName: "C", qty: "0" }),
          ]}
        />
      )

      expect(html).toContain(">1<")
      expect(html).toContain(">2<")
    })

    it("group summary has no editable inputs", () => {
      const html = renderToStaticMarkup(
        <StockDocumentGroupSummary visibleRows={[kLine(1, { qty: "1" })]} />
      )
      expect(html).not.toContain('type="number"')
      expect(html).not.toContain("<input")
    })
  })
})
