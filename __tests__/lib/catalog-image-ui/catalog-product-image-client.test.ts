import {
  clearCatalogProductImageUrlCache,
  fetchCatalogProductImageUrl,
} from "@/lib/catalog-image-ui/catalog-product-image-client"

describe("fetchCatalogProductImageUrl", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    clearCatalogProductImageUrlCache()
    global.fetch = fetchMock as typeof fetch
  })

  it("requests the shared catalog-image API with exact product code", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        productCode: "0101001",
        imageUrl: "https://abc.public.blob.vercel-storage.com/products/0101001.jpg",
      }),
    } as Response)

    const url = await fetchCatalogProductImageUrl("0101001")
    expect(url).toBe("https://abc.public.blob.vercel-storage.com/products/0101001.jpg")
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog-image/product-url?code=0101001",
      { cache: "no-store" }
    )
  })

  it("caches resolved URLs per product code", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        productCode: "0101001",
        imageUrl: "https://blob.example/products/0101001.png",
      }),
    } as Response)

    await fetchCatalogProductImageUrl("0101001")
    await fetchCatalogProductImageUrl("0101001")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("returns null for blank codes without fetching", async () => {
    await expect(fetchCatalogProductImageUrl("")).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
