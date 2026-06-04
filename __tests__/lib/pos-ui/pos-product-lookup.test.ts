import { fetchPosProductLookup } from "@/lib/pos-ui/pos-product-lookup"

describe("fetchPosProductLookup", () => {
  it("returns product on success", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        product: {
          productId: "p1",
          code: "0101001",
          name: "A",
          unitPrice: "10.00",
          priceSource: "SELLING",
        },
      }),
    })

    const result = await fetchPosProductLookup("1010015", fetchFn)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.product.unitPrice).toBe("10.00")
    }
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/pos/products/lookup?code=1010015",
      expect.objectContaining({ credentials: "include" })
    )
  })

  it("returns error payload on failure", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: "No active selling price",
        code: "NO_ACTIVE_PRICE",
      }),
    })

    const result = await fetchPosProductLookup("1010015", fetchFn)
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "No active selling price",
      code: "NO_ACTIVE_PRICE",
    })
  })
})
