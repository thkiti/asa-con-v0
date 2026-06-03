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
  productCode: "5101001",
  productName: "Product One",
  productType: "TRACKED" as const,
  hookGroup: "K",
  hookNo: 12,
  supplierCode: "K.144",
  productGroup: "5101900",
  referenceProductCode: "5101001",
  hasReference: true,
  deleted: false,
}

describe("ProductReferenceFormModal", () => {
  it("renders add link mode without reference fields requirement in title", () => {
    const html = renderToStaticMarkup(
      <ProductReferenceFormModal
        open
        mode="create"
        row={{
          ...rowWithRef,
          hasReference: false,
          hookGroup: "",
          hookNo: null,
          supplierCode: "",
          referenceProductCode: "",
        }}
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    )
    expect(html).toContain("Add reference link")
    expect(html).toContain("5101001")
  })

  it("shows product type change warning constant", () => {
    expect(PRODUCT_TYPE_CHANGE_WARNING).toContain("future operational behavior")
  })
})
