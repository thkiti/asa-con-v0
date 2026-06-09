import {
  addProductToCart,
  cartTotal,
  clearCart,
  decrementLineQty,
  incrementLineQty,
  lineAmount,
  removeCartLine,
  setLineQty,
  type PosCartLine,
  type PosCartProduct,
} from "@/lib/pos/cart"

const productA: PosCartProduct = {
  productId: "p1",
  code: "0101001",
  name: "Widget A",
  unitPrice: "99.50",
  priceSource: "SELLING",
}

const productB: PosCartProduct = {
  productId: "p2",
  code: "0101002",
  name: "Widget B",
  unitPrice: "10.00",
  priceSource: "SELLING",
}

describe("pos cart", () => {
  it("adds a new line with qty 1", () => {
    const lines = addProductToCart([], productA)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ productId: "p1", qty: 1, unitPrice: "99.50" })
  })

  it("stores catalog image URL on new cart lines", () => {
    const lines = addProductToCart([], {
      ...productA,
      catalogImageUrl: "https://blob.example/products/0101001.png",
    })
    expect(lines[0]?.catalogImageUrl).toBe("https://blob.example/products/0101001.png")
  })

  it("merges duplicate productId by incrementing qty", () => {
    let lines = addProductToCart([], productA)
    lines = addProductToCart(lines, productA)
    expect(lines).toHaveLength(1)
    expect(lines[0].qty).toBe(2)
  })

  it("keeps separate lines for different products", () => {
    let lines = addProductToCart([], productA)
    lines = addProductToCart(lines, productB)
    expect(lines).toHaveLength(2)
  })

  it("setLineQty enforces minimum qty of 1 for explicit sets", () => {
    const base: PosCartLine[] = [{ ...productA, qty: 2 }]
    expect(setLineQty(base, "p1", 0)[0].qty).toBe(1)
  })

  it("decrementLineQty removes the line when qty would reach 0", () => {
    const base: PosCartLine[] = [{ ...productA, qty: 1 }]
    const lines = decrementLineQty(base, "p1")
    expect(lines).toHaveLength(0)
    expect(cartTotal(lines)).toBe("0.00")
  })

  it("decrementLineQty decreases qty normally above 1", () => {
    const base: PosCartLine[] = [{ ...productA, qty: 3 }]
    const lines = decrementLineQty(base, "p1")
    expect(lines).toHaveLength(1)
    expect(lines[0]?.qty).toBe(2)
    expect(cartTotal(lines)).toBe("199.00")
  })

  it("increments and removes lines", () => {
    let lines = addProductToCart([], productA)
    lines = incrementLineQty(lines, "p1")
    expect(lines[0].qty).toBe(2)
    lines = removeCartLine(lines, "p1")
    expect(lines).toHaveLength(0)
    expect(clearCart()).toEqual([])
  })

  it("calculates line and cart totals from server unit price", () => {
    let lines = addProductToCart([], productA)
    lines = addProductToCart(lines, productA)
    lines = addProductToCart(lines, productB)
    expect(lineAmount(lines[0])).toBe("199.00")
    expect(cartTotal(lines)).toBe("209.00")
  })
})
