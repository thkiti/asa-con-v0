/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import {
  PRODUCT_TYPE_CHANGE_WARNING,
  ProductReferenceFormModal,
} from "@/components/master/product-reference/ProductReferenceFormModal"

const rowWithRef = {
  rowId: "ref-1",
  productId: "p1",
  productCode: "0101035",
  productName: "Product One",
  productType: "TRACKED" as const,
  hookGroup: "K",
  hookNo: 12,
  supplierCode: "K.144",
  productGroup: "0101900",
  referenceProductCode: "0101035",
  hasReference: true,
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
    expect(html).not.toContain("Trash Reference Link")
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
  })

  it("renders Edit Product Reference when has reference", () => {
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
    expect(html).toContain("Trash Reference Link")
  })

  it("shows product type change warning constant", () => {
    expect(PRODUCT_TYPE_CHANGE_WARNING).toContain("future operational behavior")
  })
})
