/** Display-order sort for K/C/M/O counting blocks — does not affect save payload order. */

export type CountingRowWithHookNo = {
  hookNo?: number | null
}

function hookSortKey(hookNo: number | null | undefined): number {
  if (hookNo == null || !Number.isFinite(hookNo)) {
    return Number.POSITIVE_INFINITY
  }
  return Math.trunc(hookNo)
}

/**
 * Stable numeric ascending sort by hookNo; null/undefined hook numbers last.
 */
export function sortCountingRowsByHookNo<T extends CountingRowWithHookNo>(
  rows: T[]
): T[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const keyA = hookSortKey(a.row.hookNo)
      const keyB = hookSortKey(b.row.hookNo)
      if (keyA !== keyB) return keyA - keyB
      return a.index - b.index
    })
    .map(({ row }) => row)
}
