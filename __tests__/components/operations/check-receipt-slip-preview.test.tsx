/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { SlipImageHoverPreview } from "@/components/operations/check-receipt/SlipImageHoverPreview"

describe("SlipImageHoverPreview", () => {
  it("renders an anchored preview panel", () => {
    const html = renderToStaticMarkup(
      <SlipImageHoverPreview
        imageUrl="https://blob.example/slip.jpg"
        receiptNo="REC-002"
        top={120}
        left={200}
        maxWidth={420}
        maxHeight={560}
      />
    )

    expect(html).toContain('data-testid="check-receipt-slip-preview"')
    expect(html).toContain('style="top:120px;left:200px"')
    expect(html).toContain("object-contain")
    expect(html).toContain("pointer-events-none")
    expect(html).toContain("REC-002")
  })
})
