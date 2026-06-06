import {
  parseShopJsonResponse,
  requireBranchesArray,
} from "@/lib/shop-ui/shop-fetch-json"

function jsonResponse(
  body: unknown,
  init?: { status?: number; contentType?: string }
): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": init?.contentType ?? "application/json",
    },
  })
}

describe("parseShopJsonResponse", () => {
  it("rejects non-JSON content type", async () => {
    const res = new Response("<html></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    })
    const parsed = await parseShopJsonResponse(res)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.error).toContain("non-JSON")
    }
  })

  it("rejects invalid JSON body", async () => {
    const res = new Response("{not json", {
      status: 200,
      headers: { "content-type": "application/json" },
    })
    const parsed = await parseShopJsonResponse(res)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.error).toContain("Invalid JSON")
    }
  })

  it("returns payload for valid JSON", async () => {
    const parsed = await parseShopJsonResponse(
      jsonResponse({ branches: [{ id: "b1", code: "SH001", name: "Shop" }] })
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.payload).toEqual({
        branches: [{ id: "b1", code: "SH001", name: "Shop" }],
      })
    }
  })
})

describe("requireBranchesArray", () => {
  it("returns null when branches is missing", () => {
    expect(requireBranchesArray({})).toBeNull()
  })

  it("returns null when branches is not an array", () => {
    expect(requireBranchesArray({ branches: "x" })).toBeNull()
  })

  it("returns branches array when valid", () => {
    const branches = [{ id: "b1", code: "SH001", name: "Shop" }]
    expect(requireBranchesArray({ branches })).toEqual(branches)
  })

  it("accepts empty branches array", () => {
    expect(requireBranchesArray({ branches: [] })).toEqual([])
  })
})

describe("fetchSalesTargetBranches integration", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("returns error when branches array is missing", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ items: [] })
    ) as typeof fetch

    const { fetchSalesTargetBranches } = await import(
      "@/lib/shop-ui/sales-targets-client"
    )
    const result = await fetchSalesTargetBranches()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("Invalid branches")
    }
  })

  it("returns branches when response is valid", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        branches: [{ id: "b1", code: "SH001", name: "Shop One" }],
      })
    ) as typeof fetch

    const { fetchSalesTargetBranches } = await import(
      "@/lib/shop-ui/sales-targets-client"
    )
    const result = await fetchSalesTargetBranches()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.branches).toHaveLength(1)
      expect(result.branches[0]?.code).toBe("SH001")
    }
  })
})
