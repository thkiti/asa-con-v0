import { THERMAL_COLUMNS, wrapThermalTextLines } from "./format"

/** Append wrapped photo list lines for plain-text thermal serialization. */
export function appendRepairTicketPhotoLines(
  lines: string[],
  fileNames: readonly string[],
  width: number = THERMAL_COLUMNS
): void {
  if (fileNames.length === 0) return
  lines.push(`Photos (${fileNames.length})`.slice(0, width))
  for (let i = 0; i < fileNames.length; i++) {
    const prefix = `${i + 1}. `
    const indent = " ".repeat(prefix.length)
    const nameLines = wrapThermalTextLines(fileNames[i], Math.max(1, width - prefix.length))
    nameLines.forEach((segment, lineIndex) => {
      lines.push(lineIndex === 0 ? `${prefix}${segment}` : `${indent}${segment}`)
    })
  }
}
