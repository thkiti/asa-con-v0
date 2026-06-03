import {
  fetchMasterBranches,
  fetchMasterProductReference,
  fetchMasterStaff,
} from "@/lib/master-ui/fetchers"

describe("master fetchers URL params", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    }) as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("fetchMasterBranches encodes mode and q", async () => {
    await fetchMasterBranches({ mode: "trash", q: "sh" })
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/master/branches?mode=trash&q=sh"
    )
  })

  it("fetchMasterStaff encodes role and branchCode", async () => {
    await fetchMasterStaff({
      mode: "active",
      q: "001",
      role: "HO_ADMIN",
      branchCode: "HO999",
    })
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/master/staff?mode=active&q=001&role=HO_ADMIN&branchCode=HO999"
    )
  })

  it("fetchMasterProductReference encodes referenceStatus when not all", async () => {
    await fetchMasterProductReference({
      mode: "active",
      productCode: "",
      productName: "",
      hookGroup: "",
      hookNo: "",
      supplierCode: "",
      productGroup: "",
      referenceStatus: "has",
    })
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/master/product-reference?mode=active&referenceStatus=has"
    )
  })
})
