import {
  getEditorWorkflowActions,
  getStockDocumentActions,
} from "@/lib/stock-ui/document-permissions"

function visibleIds(
  status: "DRAFT" | "SUBMITTED" | "CONFIRMED" | "POSTED" | "CANCELLED"
) {
  return getEditorWorkflowActions(
    { role: "SH_STAFF", docType: "PERFORMANCE", status },
    { hasDocumentId: true }
  )
    .filter((a) => a.visible)
    .map((a) => a.id)
}

function enabledIds(
  status: "DRAFT" | "SUBMITTED" | "CONFIRMED" | "POSTED" | "CANCELLED"
) {
  return getEditorWorkflowActions(
    { role: "SH_STAFF", docType: "PERFORMANCE", status },
    { hasDocumentId: true }
  )
    .filter((a) => a.enabled)
    .map((a) => a.id)
}

describe("getEditorWorkflowActions", () => {
  it("DRAFT shows save and submit", () => {
    expect(visibleIds("DRAFT")).toEqual(expect.arrayContaining(["save", "submit"]))
    expect(enabledIds("DRAFT")).toEqual(expect.arrayContaining(["save", "submit"]))
    expect(visibleIds("DRAFT")).not.toContain("confirm")
    expect(visibleIds("DRAFT")).not.toContain("post")
  })

  it("SUBMITTED shows confirm, cancel, post, and print", () => {
    expect(visibleIds("SUBMITTED")).toEqual(
      expect.arrayContaining(["confirm", "cancel", "post", "print"])
    )
    expect(enabledIds("SUBMITTED")).toEqual(
      expect.arrayContaining(["confirm", "cancel", "post", "print"])
    )
    expect(visibleIds("SUBMITTED")).not.toContain("save")
  })

  it("CONFIRMED shows cancel, post, and print", () => {
    expect(visibleIds("CONFIRMED")).toContain("cancel")
    expect(visibleIds("CONFIRMED")).toContain("post")
    expect(visibleIds("CONFIRMED")).toContain("print")
    expect(enabledIds("CONFIRMED")).toContain("post")
    expect(enabledIds("CONFIRMED")).toContain("print")
    expect(visibleIds("CONFIRMED")).not.toContain("confirm")
    expect(visibleIds("CONFIRMED")).not.toContain("submit")
  })

  it("POSTED and CANCELLED show print only", () => {
    expect(visibleIds("POSTED")).toEqual(["print"])
    expect(visibleIds("CANCELLED")).toEqual(["print"])
  })

  it("includes print in editor when printable, excludes delete", () => {
    const all = getStockDocumentActions({
      role: "SH_STAFF",
      docType: "PERFORMANCE",
      status: "SUBMITTED",
    })
    const editor = getEditorWorkflowActions(
      { role: "SH_STAFF", docType: "PERFORMANCE", status: "SUBMITTED" },
      { hasDocumentId: true }
    )

    expect(all.find((a) => a.id === "post")?.visible).toBe(true)
    expect(editor.find((a) => a.id === "post")?.visible).toBe(true)
    expect(editor.find((a) => a.id === "print")?.visible).toBe(true)
    expect(editor.find((a) => a.id === "deleteDraft")).toBeUndefined()
  })

  it("excludes print from DRAFT editor toolbar", () => {
    expect(visibleIds("DRAFT")).not.toContain("print")
  })

  it("hides post for SH_STAFF TRANSFER_OUT when canShopPost forbids it", () => {
    const editor = getEditorWorkflowActions(
      { role: "SH_STAFF", docType: "TRANSFER_OUT", status: "CONFIRMED" },
      { hasDocumentId: true }
    )
    expect(editor.find((a) => a.id === "post")?.visible).toBe(false)
  })

  it("disables submit when document id is missing", () => {
    const actions = getEditorWorkflowActions(
      { role: "SH_STAFF", docType: "PERFORMANCE", status: "DRAFT" },
      { hasDocumentId: false }
    )
    expect(actions.find((a) => a.id === "save")?.enabled).toBe(true)
    expect(actions.find((a) => a.id === "submit")?.enabled).toBe(false)
  })

  it("disables post when document id is missing", () => {
    const actions = getEditorWorkflowActions(
      { role: "SH_STAFF", docType: "PERFORMANCE", status: "CONFIRMED" },
      { hasDocumentId: false }
    )
    expect(actions.find((a) => a.id === "post")?.enabled).toBe(false)
  })

  it("disables print when document id is missing", () => {
    const actions = getEditorWorkflowActions(
      { role: "SH_STAFF", docType: "PERFORMANCE", status: "SUBMITTED" },
      { hasDocumentId: false }
    )
    expect(actions.find((a) => a.id === "print")?.enabled).toBe(false)
  })
})
