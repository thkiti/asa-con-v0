/** Shared CSV serialization helpers � pure functions, no I/O. */

export function escapeCsvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function rowsToCsvTable(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[]
): string {
  const headerLine = headers.map(escapeCsvCell).join(",")
  if (rows.length === 0) {
    return headerLine
  }
  const body = rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n")
  return `${headerLine}\n${body}`
}

export function sortByStableKey<T>(
  items: readonly T[],
  keyFn: (item: T) => string
): T[] {
  return [...items].sort((left, right) =>
    keyFn(left).localeCompare(keyFn(right))
  )
}
