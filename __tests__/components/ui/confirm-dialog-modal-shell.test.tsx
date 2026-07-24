/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { ModalShell } from "@/components/ui/ModalShell"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("ModalShell", () => {
  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      <ModalShell open={false} onClose={() => {}} title="Hidden">
        Body
      </ModalShell>
    )
    expect(html).toBe("")
  })

  it("renders title, body, and footer when open", () => {
    const html = renderToStaticMarkup(
      <ModalShell
        open
        onClose={() => {}}
        title="Edit item"
        titleId="modal-title"
        footer={<button type="button">OK</button>}
        data-testid="demo-modal"
      >
        <p>Content</p>
      </ModalShell>
    )
    expect(html).toContain('data-testid="demo-modal"')
    expect(html).toContain('id="modal-title"')
    expect(html).toContain("Edit item")
    expect(html).toContain("Content")
    expect(html).toContain("OK")
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
  })
})

describe("ConfirmDialog", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("renders title, message, and action labels", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete branch"
        message="Are you sure?"
        confirmLabel="Delete"
        onClose={() => {}}
        onConfirm={() => {}}
      />
    )
    expect(html).toContain("Delete branch")
    expect(html).toContain("Are you sure?")
    expect(html).toContain("Cancel")
    expect(html).toContain("Delete")
  })

  it("shows pending label and disables actions while pending", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Save"
        message="Confirm"
        confirmLabel="Save"
        pending
        pendingLabel="Saving…"
        onClose={() => {}}
        onConfirm={() => {}}
      />
    )
    expect(html).toContain("Saving…")
    expect(html).toContain("disabled")
  })

  it("closes on Escape when not pending", () => {
    const onClose = jest.fn()
    act(() => {
      root.render(
        <ConfirmDialog
          open
          title="Confirm"
          message="Go?"
          confirmLabel="OK"
          onClose={onClose}
          onConfirm={() => {}}
        />
      )
    })

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })

    expect(onClose).toHaveBeenCalled()
  })

  it("does not close on Escape while pending", () => {
    const onClose = jest.fn()
    act(() => {
      root.render(
        <ConfirmDialog
          open
          title="Confirm"
          message="Go?"
          confirmLabel="OK"
          pending
          onClose={onClose}
          onConfirm={() => {}}
        />
      )
    })

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })

    expect(onClose).not.toHaveBeenCalled()
  })
})
