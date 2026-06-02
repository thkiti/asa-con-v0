import { getStockDocumentActions } from "@/lib/stock-ui/document-permissions"

describe("getStockDocumentActions", () => {
  it("shows save and submit for DRAFT", () => {
    const actions = getStockDocumentActions({
      role: "SH_STAFF",
      docType: "PERFORMANCE",
      status: "DRAFT",
    })
    expect(actions.find((a) => a.id === "save")?.enabled).toBe(true)
    expect(actions.find((a) => a.id === "submit")?.enabled).toBe(true)
    expect(actions.find((a) => a.id === "post")?.visible).toBe(false)
  })

  it("allows shop post for PERFORMANCE when SUBMITTED", () => {
    const actions = getStockDocumentActions({
      role: "SH_STAFF",
      docType: "PERFORMANCE",
      status: "SUBMITTED",
    })
    expect(actions.find((a) => a.id === "post")?.enabled).toBe(true)
  })

  it("hides shop post for TRANSFER_OUT", () => {
    const actions = getStockDocumentActions({
      role: "SH_STAFF",
      docType: "TRANSFER_OUT",
      status: "CONFIRMED",
    })
    expect(actions.find((a) => a.id === "post")?.visible).toBe(false)
  })

  it("allows HO post for TRANSFER_OUT when postable", () => {
    const actions = getStockDocumentActions({
      role: "HO_OPERATIONS",
      docType: "TRANSFER_OUT",
      status: "CONFIRMED",
    })
    expect(actions.find((a) => a.id === "post")?.enabled).toBe(true)
  })

  it("hides cancel for POSTED and CANCELLED", () => {
    const posted = getStockDocumentActions({
      role: "SH_STAFF",
      docType: "PERFORMANCE",
      status: "POSTED",
    })
    expect(posted.find((a) => a.id === "cancel")?.visible).toBe(false)

    const cancelled = getStockDocumentActions({
      role: "SH_STAFF",
      docType: "PERFORMANCE",
      status: "CANCELLED",
    })
    expect(cancelled.find((a) => a.id === "cancel")?.visible).toBe(false)
  })

  it("shows confirm only from SUBMITTED", () => {
    const actions = getStockDocumentActions({
      role: "SH_STAFF",
      docType: "ADJUSTMENT",
      status: "SUBMITTED",
    })
    expect(actions.find((a) => a.id === "confirm")?.enabled).toBe(true)

    const confirmed = getStockDocumentActions({
      role: "SH_STAFF",
      docType: "ADJUSTMENT",
      status: "CONFIRMED",
    })
    expect(confirmed.find((a) => a.id === "confirm")?.visible).toBe(false)
  })

  it("hides print for DRAFT", () => {
    const actions = getStockDocumentActions({
      role: "SH_STAFF",
      docType: "PERFORMANCE",
      status: "DRAFT",
    })
    expect(actions.find((a) => a.id === "print")?.visible).toBe(false)
    expect(actions.find((a) => a.id === "print")?.enabled).toBe(false)
  })

  it("allows print for SUBMITTED, CONFIRMED, POSTED, and CANCELLED", () => {
    for (const status of ["SUBMITTED", "CONFIRMED", "POSTED", "CANCELLED"] as const) {
      const actions = getStockDocumentActions({
        role: "SH_STAFF",
        docType: "PERFORMANCE",
        status,
      })
      expect(actions.find((a) => a.id === "print")?.visible).toBe(true)
      expect(actions.find((a) => a.id === "print")?.enabled).toBe(true)
    }
  })
})
