/** Shared layout tokens for catalog product-code hover preview (UI only). */
export const CATALOG_HOVER_PREVIEW_MAX_WIDTH = "min(320px, 28vw)"
export const CATALOG_HOVER_PREVIEW_MAX_HEIGHT = "min(420px, 70vh)"
export const CATALOG_HOVER_PREVIEW_GAP_PX = 8

export function catalogHoverPreviewBounds(
  viewportWidth: number,
  viewportHeight: number
): { maxWidth: number; maxHeight: number } {
  return {
    maxWidth: Math.min(320, Math.floor(viewportWidth * 0.28)),
    maxHeight: Math.min(420, Math.floor(viewportHeight * 0.7)),
  }
}
