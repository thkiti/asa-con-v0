/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { SlipImageHoverPreview } from "@/components/operations/check-receipt/SlipImageHoverPreview"

describe("SlipImageHoverPreview", () => {
  it("renders a large right-side preview panel", () => {
    const html = renderToStaticMarkup(
      <SlipImageHoverPreview
        imageUrl="https://blob.example/slip.jpg"
        receiptNo="REC-002"
      />
    )

    expect(html).toContain('data-testid="check-receipt-slip-preview"')
    expect(html).toContain("max-h-[85vh]")
    expect(html).toContain("max-w-[55vw]")
    expect(html).toContain("object-contain")
    expect(html).toContain("pointer-events-none")
    expect(html).toContain("REC-002")
  })
})
