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

  it("SUBMITTED shows confirm, cancel, and post", () => {
    expect(visibleIds("SUBMITTED")).toEqual(
      expect.arrayContaining(["confirm", "cancel", "post"])
    )
    expect(enabledIds("SUBMITTED")).toEqual(
      expect.arrayContaining(["confirm", "cancel", "post"])
    )
    expect(visibleIds("SUBMITTED")).not.toContain("save")
  })

  it("CONFIRMED shows cancel and post", () => {
    expect(visibleIds("CONFIRMED")).toContain("cancel")
    expect(visibleIds("CONFIRMED")).toContain("post")
    expect(enabledIds("CONFIRMED")).toContain("post")
    expect(visibleIds("CONFIRMED")).not.toContain("confirm")
    expect(visibleIds("CONFIRMED")).not.toContain("submit")
  })

  it("POSTED and CANCELLED show no workflow actions", () => {
    expect(visibleIds("POSTED")).toEqual([])
    expect(visibleIds("CANCELLED")).toEqual([])
  })

  it("includes post in editor when permission allows, excludes delete and print", () => {
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
    expect(editor.find((a) => a.id === "deleteDraft")).toBeUndefined()
    expect(editor.find((a) => a.id === "print")).toBeUndefined()
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
})
