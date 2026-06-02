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
  })

  it("SUBMITTED shows confirm and cancel", () => {
    expect(visibleIds("SUBMITTED")).toEqual(expect.arrayContaining(["confirm", "cancel"]))
    expect(enabledIds("SUBMITTED")).toEqual(expect.arrayContaining(["confirm", "cancel"]))
    expect(visibleIds("SUBMITTED")).not.toContain("save")
  })

  it("CONFIRMED shows cancel only among workflow actions", () => {
    expect(visibleIds("CONFIRMED")).toContain("cancel")
    expect(visibleIds("CONFIRMED")).not.toContain("confirm")
    expect(visibleIds("CONFIRMED")).not.toContain("submit")
  })

  it("POSTED and CANCELLED show no workflow actions", () => {
    expect(visibleIds("POSTED")).toEqual([])
    expect(visibleIds("CANCELLED")).toEqual([])
  })

  it("excludes post, delete, and print from editor toolbar", () => {
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
    expect(editor.find((a) => a.id === "post")).toBeUndefined()
    expect(editor.find((a) => a.id === "deleteDraft")).toBeUndefined()
    expect(editor.find((a) => a.id === "print")).toBeUndefined()
  })

  it("disables submit when document id is missing", () => {
    const actions = getEditorWorkflowActions(
      { role: "SH_STAFF", docType: "PERFORMANCE", status: "DRAFT" },
      { hasDocumentId: false }
    )
    expect(actions.find((a) => a.id === "save")?.enabled).toBe(true)
    expect(actions.find((a) => a.id === "submit")?.enabled).toBe(false)
  })
})
