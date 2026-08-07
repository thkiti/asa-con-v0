/**
 * @jest-environment jsdom
 */
import { act, useState, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ProductReferenceFormModal } from "@/components/master/product-reference/ProductReferenceFormModal"
import type { ProductReferenceListItem } from "@/lib/master/types"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const multiRefRow: ProductReferenceListItem = {
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

function afterRemoveK2(row: ProductReferenceListItem): ProductReferenceListItem {
  const references = row.references.filter((link) => link.id !== "ref-k2")
  const primary = references[0]!
  return {
    ...row,
    rowId: primary.id,
    hookGroup: primary.hookGroup,
    hookNo: primary.hookNo,
    supplierCode: primary.supplierCode,
    productGroup: primary.productGroup,
    referenceProductCode: primary.productCode,
    hasReference: true,
    references,
    referenceCount: references.length,
  }
}

function RefreshHarness({
  onTrashSpy,
}: {
  onTrashSpy: (refId: string) => void
}): ReactElement {
  const [row, setRow] = useState(multiRefRow)
  return (
    <ProductReferenceFormModal
      open
      row={row}
      onClose={() => {}}
      onSaveProduct={async () => {}}
      onSaveAll={async () => {}}
      onTrashReference={async (refId) => {
        onTrashSpy(refId)
        setRow((prev) => afterRemoveK2(prev))
      }}
    />
  )
}

function ErrorHarness(): ReactElement {
  const [error, setError] = useState<string | null>(null)
  return (
    <ProductReferenceFormModal
      open
      row={multiRefRow}
      error={error}
      onClose={() => {}}
      onSaveProduct={async () => {}}
      onSaveAll={async () => {}}
      onTrashReference={async () => {
        setError("HOOK_IN_USE")
        throw new Error("HOOK_IN_USE")
      }}
    />
  )
}

describe("ProductReferenceFormModal remove reference action", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ product: { code: "0104901", name: "Group" } }),
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    jest.restoreAllMocks()
  })

  it("wires per-row Remove to exact refId, uses type=button, and stacks confirm above edit modal", async () => {
    const onTrashReference = jest.fn().mockResolvedValue(undefined)

    await act(async () => {
      root.render(
        <ProductReferenceFormModal
          open
          row={multiRefRow}
          onClose={() => {}}
          onSaveProduct={async () => {}}
          onSaveAll={async () => {}}
          onTrashReference={onTrashReference}
        />
      )
    })

    const removeK2 = container.querySelector(
      '[data-testid="remove-reference-ref-k2"]'
    ) as HTMLButtonElement | null
    expect(removeK2).not.toBeNull()
    expect(removeK2?.type).toBe("button")

    await act(async () => {
      removeK2?.click()
    })

    const confirmOverlay = container.querySelector(
      '[data-testid="product-reference-confirm-dialog-overlay"]'
    )
    expect(
      container.querySelector('[data-testid="product-reference-confirm-dialog"]')
    ).not.toBeNull()
    expect(confirmOverlay?.className).toContain("z-[60]")
    expect(container.textContent).toContain("K.2")
    expect(onTrashReference).not.toHaveBeenCalled()

    const confirmBtn = container.querySelector(
      '[data-testid="product-reference-confirm-dialog-confirm"]'
    ) as HTMLButtonElement | null
    expect(confirmBtn?.type).toBe("button")

    await act(async () => {
      confirmBtn?.click()
    })

    expect(onTrashReference).toHaveBeenCalledTimes(1)
    expect(onTrashReference).toHaveBeenCalledWith("ref-k2")
  })

  it("keeps modal open and drops only the removed row after successful delete refresh", async () => {
    const spy = jest.fn()

    await act(async () => {
      root.render(<RefreshHarness onTrashSpy={spy} />)
    })

    await act(async () => {
      ;(
        container.querySelector(
          '[data-testid="remove-reference-ref-k2"]'
        ) as HTMLButtonElement
      ).click()
    })
    await act(async () => {
      ;(
        container.querySelector(
          '[data-testid="product-reference-confirm-dialog-confirm"]'
        ) as HTMLButtonElement
      ).click()
    })

    expect(spy).toHaveBeenCalledWith("ref-k2")
    expect(container.querySelector('[data-testid="product-reference-form-modal"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="remove-reference-ref-k2"]')).toBeNull()
    expect(container.querySelector('[data-testid="remove-reference-ref-k19"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="remove-reference-ref-k291"]')).not.toBeNull()
    expect(container.textContent).toContain("2 refs")
  })

  it("shows API error on confirm and keeps the remove dialog open", async () => {
    await act(async () => {
      root.render(<ErrorHarness />)
    })

    const removeBtn = container.querySelector(
      '[data-testid="remove-reference-ref-k2"]'
    ) as HTMLButtonElement | null
    expect(removeBtn).not.toBeNull()

    await act(async () => {
      removeBtn!.click()
    })

    const confirmBtn = container.querySelector(
      '[data-testid="product-reference-confirm-dialog-confirm"]'
    ) as HTMLButtonElement | null
    expect(confirmBtn).not.toBeNull()

    await act(async () => {
      confirmBtn!.click()
    })

    expect(container.textContent).toContain("HOOK_IN_USE")
    expect(
      container.querySelector('[data-testid="product-reference-confirm-dialog"]')
    ).not.toBeNull()
    expect(container.querySelector('[data-testid="product-reference-form-modal"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="remove-reference-ref-k2"]')).not.toBeNull()
  })
})
