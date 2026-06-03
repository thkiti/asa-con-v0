import type { EditorLineRowVM } from "./editor-types"

export const DEFAULT_COUNTING_BLOCK_SIZE = 22

/** Split rows into vertical blocks for horizontal sheet layout (preserves input order). */
export function chunkCountingRows<T extends EditorLineRowVM>(
  rows: T[],
  rowsPerBlock: number = DEFAULT_COUNTING_BLOCK_SIZE
): T[][] {
  if (rowsPerBlock < 1) {
    throw new Error("chunkCountingRows: rowsPerBlock must be at least 1")
  }
  if (rows.length === 0) return []

  const blocks: T[][] = []
  for (let i = 0; i < rows.length; i += rowsPerBlock) {
    blocks.push(rows.slice(i, i + rowsPerBlock))
  }
  return blocks
}
