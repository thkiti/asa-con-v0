/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import {
  PRODUCT_TYPE_CHANGE_WARNING,
  ProductReferenceFormModal,
} from "@/components/master/product-reference/ProductReferenceFormModal"
import type { ProductReferenceListItem } from "@/lib/master/types"

const rowWithRef: ProductReferenceListItem = {
  rowId: "ref-1",
  productId: "p1",
  productCode: "0101035",
  productName: "Product One",
  productType: "TRACKED",
  hookGroup: "K",
  hookNo: 12,
  supplierCode: "K.144",
  productGroup: "0101900",
  referenceProductCode: "0101035",
  hasReference: true,
  references: [
    {
      id: "ref-1",
      hookGroup: "K",
      hookNo: 12,
      supplierCode: "K.144",
      productGroup: "0101900",
      productCode: "0101035",
    },
  ],
  referenceCount: 1,
  deleted: false,
}

const rowWithThreeRefs: ProductReferenceListItem = {
  rowId: "ref-k2",
  productId: "p-0104004",
  productCode: "0104004",
  productName: "Multi ref product",
  productType: "TRACKED",
  hookGroup: "K",
  hookNo: 2,
  supplierCode: "KS1",
  productGroup: "0104901",
  referenceProductCode: "0104004",
  hasReference: true,
  references: [
    {
      id: "ref-k2",
      hookGroup: "K",
      hookNo: 2,
      supplierCode: "KS1",
      productGroup: "0104901",
      productCode: "0104004",
    },
    {
      id: "ref-k19",
      hookGroup: "K",
      hookNo: 19,
      supplierCode: "ULO50",
      productGroup: "0104901",
      productCode: "0104004",
    },
    {
      id: "ref-k291",
      hookGroup: "K",
      hookNo: 291,
      supplierCode: "K.161",
      productGroup: "0104901",
      productCode: "0104004",
    },
  ],
  referenceCount: 3,
  deleted: false,
}

describe("ProductReferenceFormModal", () => {
  it("renders create mode with empty editable product code", () => {
    const html = renderToStaticMarkup(
      <ProductReferenceFormModal
        open
        mode="create"
        onClose={() => {}}
        onSaveProduct={async () => {}}
        onSaveAll={async () => {}}
        onCreate={async () => {}}
      />
    )
    expect(html).toContain("Add Product Reference")
    expect(html).toContain("Reference Stock")
    expect(html).toContain("Product")
    expect(html).not.toContain("Remove Reference")
    expect(html).not.toContain("Current Reference Links")
  })

  it("renders Add Product Reference title when no reference", () => {
    const html = renderToStaticMarkup(
      <ProductReferenceFormModal
        open
        row={{
          ...rowWithRef,
          hasReference: false,
          hookGroup: "",
          hookNo: null,
          supplierCode: "",
          referenceProductCode: "",
          productGroup: null,
          references: [],
          referenceCount: 0,
          rowId: "product-p1",
        }}
        onClose={() => {}}
        onSaveProduct={async () => {}}
        onSaveAll={async () => {}}
      />
    )
    expect(html).toContain("Add Product Reference")
    expect(html).toContain("0101035")
    expect(html).toContain("Reference Stock")
    expect(html).toContain("Product")
    expect(html).not.toContain("Current Reference Links")
  })

  it("renders Edit Product Reference with single Remove Reference action", () => {
    const html = renderToStaticMarkup(
      <ProductReferenceFormModal
        open
        row={rowWithRef}
        onClose={() => {}}
        onSaveProduct={async () => {}}
        onSaveAll={async () => {}}
        onTrashReference={async () => {}}
      />
    )
    expect(html).toContain("Edit Product Reference")
    expect(html).toContain("Current Reference Links")
    expect(html).toContain("Remove Reference")
    expect(html).toContain("K.12")
    expect(html).not.toContain("Trash Reference Link")
  })

  it("renders all three reference links for a multi-ref product", () => {
    const html = renderToStaticMarkup(
      <ProductReferenceFormModal
        open
        row={rowWithThreeRefs}
        onClose={() => {}}
        onSaveProduct={async () => {}}
        onSaveAll={async () => {}}
        onTrashReference={async () => {}}
      />
    )
    expect(html).toContain("3 refs")
    expect(html).toContain("K.2")
    expect(html).toContain("K.19")
    expect(html).toContain("K.291")
    expect(html).toContain("KS1")
    expect(html).toContain("ULO50")
    expect(html).toContain("K.161")
    expect(html).toContain('data-testid="product-reference-link-ref-k2"')
    expect(html).toContain('data-testid="product-reference-link-ref-k19"')
    expect(html).toContain('data-testid="product-reference-link-ref-k291"')
    expect((html.match(/Remove Reference/g) ?? []).length).toBe(3)
  })

  it("shows product type change warning constant", () => {
    expect(PRODUCT_TYPE_CHANGE_WARNING).toContain("future operational behavior")
  })
})
