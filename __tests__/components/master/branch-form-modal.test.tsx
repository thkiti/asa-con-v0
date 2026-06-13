/**
 * @jest-environment jsdom
 */
import { act, type ComponentProps } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { BranchFormModal } from "@/components/master/branch/BranchFormModal"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const baseBranch = {
  id: "b1",
  code: "SH001",
  name: "Shop One",
  type: "SH" as const,
  address: "123 Main St",
  phone: "02-111-2222",
  taxId: "MACH-001",
  isActive: true,
  deleted: false,
}

async function renderModal(
  props: ComponentProps<typeof BranchFormModal>
): Promise<{ root: Root; container: HTMLDivElement }> {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(<BranchFormModal {...props} />)
  })
  await act(async () => {})
  return { root, container }
}

function textInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(
    container.querySelectorAll('form input:not([type="checkbox"])')
  ) as HTMLInputElement[]
}

describe("BranchFormModal", () => {
  it("renders create fields when open", () => {
    const html = renderToStaticMarkup(
      <BranchFormModal
        open
        mode="create"
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    )
    expect(html).toContain("Add branch")
    expect(html).toContain(">HO<")
    expect(html).toContain(">SH<")
    expect(html).not.toContain("HO — Head Office")
    expect(html).not.toContain("SH — Shop")
    expect(html).toContain("Address")
    expect(html).toContain("Phone")
    expect(html).toContain("Machine / POS Approval ID")
    expect(html).not.toContain("cannot be changed")
  })

  it("renders edit with contact values and Company Tax ID for HO999", async () => {
    const { root, container } = await renderModal({
      open: true,
      mode: "edit",
      branch: {
        ...baseBranch,
        code: "HO999",
        name: "Head Office",
        type: "HO",
        taxId: "0123456789012",
      },
      onClose: () => {},
      onSubmit: async () => {},
    })

    expect(container.textContent).toContain("Edit branch")
    expect(container.textContent).toContain("Company Tax ID")
    const inputs = textInputs(container)
    expect(inputs[2]?.value).toBe("123 Main St")

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it("renders edit with machine tax label for shop branch", async () => {
    const { root, container } = await renderModal({
      open: true,
      mode: "edit",
      branch: baseBranch,
      onClose: () => {},
      onSubmit: async () => {},
    })

    expect(container.textContent).toContain("Machine / POS Approval ID")
    expect(textInputs(container)[2]?.value).toBe("123 Main St")

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      <BranchFormModal
        open={false}
        mode="create"
        onClose={() => {}}
        onSubmit={async () => {}}
      />
    )
    expect(html).toBe("")
  })
})
