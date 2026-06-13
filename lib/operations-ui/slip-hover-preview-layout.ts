export const SLIP_HOVER_PREVIEW_GAP_PX = 8

export function slipHoverPreviewBounds(
  viewportWidth: number,
  viewportHeight: number
): { maxWidth: number; maxHeight: number } {
  return {
    maxWidth: Math.min(480, Math.floor(viewportWidth * 0.4)),
    maxHeight: Math.min(560, Math.floor(viewportHeight * 0.7)),
  }
}

export function computeSlipPreviewPosition(input: {
  anchorRect: DOMRect
  paymentRect: DOMRect | null
  viewportWidth: number
  viewportHeight: number
}): { top: number; left: number; maxWidth: number; maxHeight: number } {
  const gap = SLIP_HOVER_PREVIEW_GAP_PX
  const { maxWidth: defaultMaxWidth, maxHeight: defaultMaxHeight } =
    slipHoverPreviewBounds(input.viewportWidth, input.viewportHeight)

  let left = input.anchorRect.right + gap
  let maxWidth = defaultMaxWidth

  if (input.paymentRect && input.paymentRect.left > left + gap) {
    maxWidth = Math.min(maxWidth, input.paymentRect.left - left - gap)
  }

  maxWidth = Math.min(maxWidth, input.viewportWidth - left - gap)

  if (maxWidth < 120) {
    left = Math.max(gap, input.anchorRect.left - defaultMaxWidth - gap)
    maxWidth = Math.min(
      defaultMaxWidth,
      input.anchorRect.left - gap * 2,
      input.viewportWidth - left - gap
    )
  }

  maxWidth = Math.max(120, maxWidth)

  let top = input.anchorRect.top
  const maxHeight = Math.min(defaultMaxHeight, input.viewportHeight - gap * 2)
  if (top + maxHeight > input.viewportHeight - gap) {
    top = Math.max(gap, input.viewportHeight - maxHeight - gap)
  }

  return { top, left, maxWidth, maxHeight }
}
