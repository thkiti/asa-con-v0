/** READ Z ticket display — drop last 3 digits from group code (display only). */
export function formatReadZGroupCodeForDisplay(code: string): string {
  if (!code) return ""
  return code.length > 3 ? code.slice(0, -3) : code
}

/** READ Z ticket display — short code + name from `displayLeft` (`code-name`). */
export function formatReadZGroupDisplayLeft(displayLeft: string): string {
  const dash = displayLeft.indexOf("-")
  if (dash <= 0) {
    return formatReadZGroupCodeForDisplay(displayLeft)
  }
  const code = displayLeft.slice(0, dash)
  const name = displayLeft.slice(dash + 1)
  return `${formatReadZGroupCodeForDisplay(code)}-${name}`
}

export const READ_Z_GROUP_TABLE_HEADER_LABEL = "Group Code • Name"
