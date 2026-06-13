import { computeSlipPreviewPosition } from "@/lib/operations-ui/slip-hover-preview-layout"

describe("computeSlipPreviewPosition", () => {
  it("places preview to the right of the receipt cell", () => {
    const position = computeSlipPreviewPosition({
      anchorRect: {
        top: 100,
        left: 40,
        right: 180,
        bottom: 130,
        width: 140,
        height: 30,
        x: 40,
        y: 100,
        toJSON: () => ({}),
      },
      paymentRect: {
        top: 100,
        left: 720,
        right: 860,
        bottom: 130,
        width: 140,
        height: 30,
        x: 720,
        y: 100,
        toJSON: () => ({}),
      },
      viewportWidth: 1200,
      viewportHeight: 800,
    })

    expect(position.left).toBe(188)
    expect(position.top).toBe(100)
    expect(position.maxWidth).toBeLessThanOrEqual(720 - 188 - 8)
  })

  it("keeps preview inside the viewport height", () => {
    const position = computeSlipPreviewPosition({
      anchorRect: {
        top: 700,
        left: 40,
        right: 180,
        bottom: 730,
        width: 140,
        height: 30,
        x: 40,
        y: 700,
        toJSON: () => ({}),
      },
      paymentRect: null,
      viewportWidth: 1200,
      viewportHeight: 800,
    })

    expect(position.top + position.maxHeight).toBeLessThanOrEqual(800)
  })
})
