import {
  chunkCountingRows,
  DEFAULT_COUNTING_BLOCK_SIZE,
} from "@/lib/stock-ui/counting-sheet-layout"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"

function line(key: string): EditorLineRowVM {
  return {
    key,
    productId: `prod-${key}`,
    productCode: key,
    productName: key,
    qty: "",
    endingQty: "",
    reviewPostingDelta: "",
  }
}

describe("chunkCountingRows", () => {
  it("returns empty array for empty input", () => {
    expect(chunkCountingRows([])).toEqual([])
  })

  it("uses default block size of 22", () => {
    const rows = Array.from({ length: 45 }, (_, i) => line(String(i)))
    const blocks = chunkCountingRows(rows)

    expect(blocks).toHaveLength(3)
    expect(blocks[0]).toHaveLength(DEFAULT_COUNTING_BLOCK_SIZE)
    expect(blocks[1]).toHaveLength(DEFAULT_COUNTING_BLOCK_SIZE)
    expect(blocks[2]).toHaveLength(1)
  })

  it("preserves row order across blocks", () => {
    const rows = [line("a"), line("b"), line("c")]
    const blocks = chunkCountingRows(rows, 2)

    expect(blocks).toEqual([[line("a"), line("b")], [line("c")]])
  })

  it("throws when rowsPerBlock is less than 1", () => {
    expect(() => chunkCountingRows([line("a")], 0)).toThrow(
      "rowsPerBlock must be at least 1"
    )
  })
})
