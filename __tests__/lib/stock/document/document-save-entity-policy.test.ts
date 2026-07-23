import {
  isStockDocumentTypeAllowedForEntity,
} from "@/lib/stock/document-read/stock-document-entity-policy"
import { DocumentError } from "@/lib/stock/document/document-errors"
import { saveDocument } from "@/lib/stock/document/document-save"
import { createDocumentMockTx } from "./mock-document-tx"

describe("saveDocument entity policy gate", () => {
  it("rejects ASAD + shop branch owner", async () => {
    const { tx } = createDocumentMockTx(undefined, [
      { id: "branch-shop", code: "SH001", type: "SH", isActive: true, deleted: false },
    ])

    await expect(
      saveDocument({
        docType: "ADJUSTMENT",
        date: "2026-02-01",
        branchId: "branch-shop",
        fromLocId: "branch-shop",
        legalEntityCode: "AD",
        lines: [{ productId: "p1", qty: 1, endingQty: 1 }],
        tx,
      })
    ).rejects.toBeInstanceOf(DocumentError)
  })

  it("rejects ASAS + HO999", async () => {
    const { tx } = createDocumentMockTx(undefined, [
      { id: "branch-ho", code: "HO999", type: "HO", isActive: true, deleted: false },
    ])

    await expect(
      saveDocument({
        docType: "ADJUSTMENT",
        date: "2026-02-01",
        branchId: "branch-ho",
        fromLocId: "branch-ho",
        legalEntityCode: "AS",
        lines: [{ productId: "p1", qty: 1, endingQty: 1 }],
        tx,
      })
    ).rejects.toBeInstanceOf(DocumentError)
  })

  it("rejects ASAD + PERFORMANCE", async () => {
    expect(isStockDocumentTypeAllowedForEntity("AD", "PERFORMANCE")).toBe(false)
    const { tx } = createDocumentMockTx(undefined, [
      { id: "branch-ho", code: "HO999", type: "HO", isActive: true, deleted: false },
    ])

    await expect(
      saveDocument({
        docType: "PERFORMANCE",
        date: "2026-02-01",
        branchId: "branch-ho",
        fromLocId: "branch-ho",
        legalEntityCode: "AD",
        lines: [{ productId: "p1", qty: 1 }],
        tx,
      })
    ).rejects.toBeInstanceOf(DocumentError)
  })

  it("allows ASAD CNT at HO999", async () => {
    const { tx } = createDocumentMockTx(undefined, [
      { id: "branch-ho", code: "HO999", type: "HO", isActive: true, deleted: false },
    ])

    const saved = await saveDocument({
      docType: "ADJUSTMENT",
      date: "2026-01-15",
      branchId: "branch-ho",
      fromLocId: "branch-ho",
      legalEntityCode: "AD",
      lines: [{ productId: "p1", qty: 5, endingQty: 5 }],
      tx,
    })
    expect(saved.docType).toBe("ADJUSTMENT")
    expect(saved.branchId).toBe("branch-ho")
  })

  it("allows ASAD DEY from HO999 with destination shop separate", async () => {
    const { tx } = createDocumentMockTx(undefined, [
      { id: "branch-ho", code: "HO999", type: "HO", isActive: true, deleted: false },
      { id: "branch-shop", code: "SH001", type: "SH", isActive: true, deleted: false },
    ])

    const saved = await saveDocument({
      docType: "TRANSFER_OUT",
      date: "2026-01-15",
      branchId: "branch-ho",
      fromLocId: "branch-ho",
      toLocId: "branch-shop",
      legalEntityCode: "AD",
      lines: [{ productId: "p1", qty: 2 }],
      tx,
    })
    expect(saved.fromLocId).toBe("branch-ho")
    expect(saved.toLocId).toBe("branch-shop")
  })

  it("rejects ASAS + TRANSFER_OUT from HO (ASAD-only DEY ownership)", async () => {
    const { tx } = createDocumentMockTx(undefined, [
      { id: "branch-ho", code: "HO999", type: "HO", isActive: true, deleted: false },
      { id: "branch-shop", code: "SH001", type: "SH", isActive: true, deleted: false },
    ])

    await expect(
      saveDocument({
        docType: "TRANSFER_OUT",
        date: "2026-01-15",
        branchId: "branch-ho",
        fromLocId: "branch-ho",
        toLocId: "branch-shop",
        legalEntityCode: "AS",
        lines: [{ productId: "p1", qty: 1 }],
        tx,
      })
    ).rejects.toBeInstanceOf(DocumentError)
  })
})
