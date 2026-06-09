/**
 * Reconstruct upload token from App Router params.
 * Catch-all is required because signed tokens contain "." which Next may split.
 */
export function parseMobileUploadRouteToken(
  segments: string | string[] | undefined
): string {
  if (segments == null) return ""

  const parts = Array.isArray(segments) ? segments : [segments]
  if (parts.length === 0) return ""

  return parts
    .map((part) => decodeURIComponent(String(part ?? "").trim()))
    .filter(Boolean)
    .join(".")
}
