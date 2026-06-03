/** Hook column for compact counting sheet — number only, not K. prefix label. */
export function formatHookNumber(line: {
  hookNo?: number | null
}): string {
  if (line.hookNo != null) return String(line.hookNo)
  return "—"
}
