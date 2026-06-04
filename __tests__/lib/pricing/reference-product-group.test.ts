import {
  membersMatchingOldPrice,
  membersSkippedDifferentFromAnchor,
  pickCanonicalProductGroup,
  samePriceAmongPricedMembers,
} from "@/lib/pricing/reference-product-group"

describe("pickCanonicalProductGroup", () => {
  it("returns null when empty", () => {
    const r = pickCanonicalProductGroup([])
    expect(r.canonical).toBeNull()
    expect(r.ambiguous).toBe(false)
  })

  it("returns single distinct group", () => {
    const r = pickCanonicalProductGroup(["GA", "GA"])
    expect(r.canonical).toBe("GA")
    expect(r.ambiguous).toBe(false)
  })

  it("picks mode when ambiguous", () => {
    const r = pickCanonicalProductGroup(["A", "A", "B"])
    expect(r.canonical).toBe("A")
    expect(r.ambiguous).toBe(true)
  })
})

describe("bulk eligibility by anchor price", () => {
  const members = [
    { productId: "1", code: "a", name: "", price: 100 },
    { productId: "2", code: "b", name: "", price: 100 },
    { productId: "3", code: "c", name: "", price: 150 },
    { productId: "4", code: "d", name: "", price: null },
  ]

  it("matches anchor 100 for two rows", () => {
    const eligible = membersMatchingOldPrice(members, 100)
    expect(eligible).toHaveLength(2)
  })

  it("skips different prices", () => {
    const skipped = membersSkippedDifferentFromAnchor(members, 100)
    expect(skipped.map((m) => m.code).sort()).toEqual(["c", "d"])
  })

  it("samePriceAmongPricedMembers false when mixed", () => {
    const m = [
      { productId: "1", code: "", name: "", price: 10 },
      { productId: "2", code: "", name: "", price: 20 },
    ]
    expect(samePriceAmongPricedMembers(m)).toBe(false)
  })
})
