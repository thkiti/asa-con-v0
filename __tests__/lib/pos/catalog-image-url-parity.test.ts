import { lookupPosProductByCode } from "@/lib/pos/product-search"
import { resolveCatalogProductImageUrl } from "@/lib/catalog-image/resolve-product-image-url"

jest.mock("@/lib/catalog-image/resolve-product-image-url", () => ({
  resolveCatalogProductImageUrl: jest.fn(),
}))

jest.mock("@/lib/pricing/resolve-pos-retail-price", () => ({
  resolvePosRetailPrice: jest.fn(async () => ({ price: 25, source: "SELLING" })),
}))

import { resolveCatalogProductImageUrl as resolveMock } from "@/lib/catalog-image/resolve-product-image-url"

const resolveCatalogProductImageUrlMock = resolveMock as jest.Mock

describe("catalog image URL parity (full-pos vs hover API)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resolveCatalogProductImageUrlMock.mockResolvedValue(
      "https://abc.public.blob.vercel-storage.com/products/0101001.jpg"
    )
  })

  it("full-pos uses resolveCatalogProductImageUrl with exact DB product code", async () => {
    const db = {
      product: {
        findUnique: jest.fn(async ({ where }: { where: { code: string } }) => ({
          id: "prod-1",
          code: where.code,
          name: "Widget",
          productType: "TRACKED",
          deleted: false,
        })),
      },
      sellingPrice: {},
    }

    const product = await lookupPosProductByCode(db as never, "0101001")
    expect(resolveCatalogProductImageUrlMock).toHaveBeenCalledWith("0101001")
    expect(product.catalogImageUrl).toBe(
      "https://abc.public.blob.vercel-storage.com/products/0101001.jpg"
    )
  })

  it("hover API resolver preserves leading zeros in product code", async () => {
    const url = await resolveCatalogProductImageUrl("0101001")
    expect(resolveCatalogProductImageUrlMock).toHaveBeenCalledWith("0101001")
    expect(url).toBe("https://abc.public.blob.vercel-storage.com/products/0101001.jpg")
  })
})
