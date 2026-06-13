/**
 * @jest-environment jsdom
 */
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { CatalogProductCodeHover } from "@/components/catalog-image/CatalogProductCodeHover"
import { MasterTable } from "@/components/master/shared/MasterTable"
import { MasterTableRow } from "@/components/master/shared/MasterTableRow"
import { StockDocumentCountingBlock } from "@/components/stock/StockDocumentCountingBlock"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

jest.mock("@/lib/catalog-image-ui/catalog-product-image-client", () => ({
  fetchCatalogProductImageUrl: jest.fn(),
}))

import { fetchCatalogProductImageUrl } from "@/lib/catalog-image-ui/catalog-product-image-client"

const fetchImageMock = fetchCatalogProductImageUrl as jest.Mock

const POS_IMAGE_URL = "https://abc.public.blob.vercel-storage.com/products/0101001.jpg"

function mount(ui: ReactElement) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(ui)
  })
  return { container, root }
}

function getTrigger(container: ParentNode) {
  const trigger = container.querySelector('[data-testid="catalog-product-code-hover-trigger"]')
  if (!trigger) throw new Error("catalog hover trigger not found")
  return trigger
}

const referenceStockLine: EditorLineRowVM = {
  key: "K-1",
  productId: "prod-1",
  productCode: "0101001",
  productName: "Home key",
  displayCode: "#K1",
  hookGroup: "K",
  hookNo: 1,
  hookLabel: "K.1",
  qty: "2",
  endingQty: "",
  reviewPostingDelta: "",
}

describe("CatalogProductCodeHover", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = ""
    fetchImageMock.mockResolvedValue(POS_IMAGE_URL)
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("renders a focusable product code trigger", () => {
    const html = renderToStaticMarkup(
      <CatalogProductCodeHover productCode="0101001" className="font-mono" />
    )
    expect(html).toContain('data-testid="catalog-product-code-hover-trigger"')
    expect(html).toContain('data-product-code="0101001"')
    expect(html).toContain("0101001")
    expect(html).toContain('tabindex="0"')
  })

  it("shows the same resolved image URL as full-pos on hover", async () => {
    const { container } = mount(<CatalogProductCodeHover productCode="0101001" />)

    await act(async () => {
      ;(getTrigger(container) as HTMLElement).focus()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchImageMock).toHaveBeenCalledWith("0101001")

    const img = document.body.querySelector(
      '[data-testid="catalog-product-image-hover-preview"] img'
    ) as HTMLImageElement | null
    expect(img?.getAttribute("src")).toBe(POS_IMAGE_URL)
    expect(
      document.body.querySelector('[data-testid="catalog-product-image-hover-no-image"]')
    ).toBeNull()
  })

  it("closes preview on blur", async () => {
    const { container } = mount(<CatalogProductCodeHover productCode="0101001" />)
    const trigger = getTrigger(container) as HTMLElement

    await act(async () => {
      trigger.focus()
      await Promise.resolve()
    })
    expect(
      document.body.querySelector('[data-testid="catalog-product-image-hover-preview"]')
    ).not.toBeNull()

    act(() => {
      trigger.blur()
    })
    expect(
      document.body.querySelector('[data-testid="catalog-product-image-hover-preview"]')
    ).toBeNull()
  })

  it("shows No image when resolver returns null", async () => {
    fetchImageMock.mockResolvedValue(null)
    const { container } = mount(<CatalogProductCodeHover productCode="0101001" />)

    await act(async () => {
      ;(getTrigger(container) as HTMLElement).focus()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(
      document.body.querySelector('[data-testid="catalog-product-image-hover-no-image"]')
    ).not.toBeNull()
    expect(
      document.body.querySelector('[data-testid="catalog-product-image-hover-preview"] img')
    ).toBeNull()
  })
})

describe("Product table catalog hover", () => {
  it("wraps product code cells in the master product table", () => {
    const html = renderToStaticMarkup(
      <MasterTable columns={[{ key: "code", label: "Product code", width: "110px" }]}>
        <MasterTableRow
          cells={[
            <CatalogProductCodeHover
              key="code"
              productCode="0101001"
              className="font-mono"
            />,
          ]}
        />
      </MasterTable>
    )

    expect(html).toContain('data-testid="catalog-product-code-hover-trigger"')
    expect(html).toContain('data-product-code="0101001"')
    expect(html).toContain("0101001")
  })
})

describe("Reference Stock table catalog hover", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetchImageMock.mockResolvedValue(POS_IMAGE_URL)
  })

  it("wraps reference stock code cells while matching image by product code", () => {
    const html = renderToStaticMarkup(
      <StockDocumentCountingBlock
        rows={[referenceStockLine]}
        showHook
        hookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    expect(html).toContain('data-testid="catalog-product-code-hover-trigger"')
    expect(html).toContain('data-product-code="0101001"')
    expect(html).toContain("#K1")
  })

  it("opens preview for reference stock rows when resolver returns image", async () => {
    const { container } = mount(
      <StockDocumentCountingBlock
        rows={[referenceStockLine]}
        showHook
        hookGroup="K"
        readOnly={false}
        onLineChange={() => {}}
      />
    )

    await act(async () => {
      ;(getTrigger(container) as HTMLElement).focus()
      await Promise.resolve()
      await Promise.resolve()
    })

    const img = document.body.querySelector(
      '[data-testid="catalog-product-image-hover-preview"] img'
    ) as HTMLImageElement | null
    expect(fetchImageMock).toHaveBeenCalledWith("0101001")
    expect(img?.getAttribute("src")).toBe(POS_IMAGE_URL)
  })
})
