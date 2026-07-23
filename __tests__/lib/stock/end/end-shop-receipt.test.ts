import { confirmShopReceipt } from "@/lib/stock/end/end-shop-receipt"
import { EndErrorCodes } from "@/lib/stock/end/end-errors"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

import { prisma } from "@/lib/shared/prisma"

describe("confirmShopReceipt", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("sets receivedQty on lines and shopReceivedAt on the document", async () => {
    const now = new Date("2026-01-20T10:00:00.000Z")
    jest.useFakeTimers()
    jest.setSystemTime(now)

    const lines = [
      { id: "line-1", productId: "p1", qty: 5, receivedQty: null },
      { id: "line-2", productId: "p2", qty: 3, receivedQty: null },
    ]

    const doc = {
      id: "dey-1",
      docType: "TRANSFER_OUT" as const,
      status: "SHIPPED" as const,
      toLocId: "shop-1",
      lines,
    }

    const lineUpdates: Array<{ id: string; receivedQty: number }> = []

    const tx = {
      stockDocument: {
        findUnique: jest.fn().mockResolvedValue(doc),
        update: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
          ...doc,
          ...data,
          lines: lines.map((l) => ({
            id: l.id,
            qty: l.qty,
            receivedQty:
              lineUpdates.find((u) => u.id === l.id)?.receivedQty ?? l.qty,
          })),
        })),
      },
      stockDocumentLine: {
        update: jest.fn().mockImplementation(
          async ({
            where,
            data,
          }: {
            where: { id: string }
            data: { receivedQty: number }
          }) => {
            lineUpdates.push({ id: where.id, receivedQty: data.receivedQty })
            return { id: where.id, ...data }
          }
        ),
      },
    }

    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    const result = await confirmShopReceipt({
      documentId: "dey-1",
      staffId: "staff-1",
    })

    expect(lineUpdates).toEqual([
      { id: "line-1", receivedQty: 5 },
      { id: "line-2", receivedQty: 3 },
    ])
    expect(tx.stockDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopReceivedAt: now,
          shopReceivedByStaffId: "staff-1",
        }),
      })
    )
    // TRANSFER_OUT SHIPPED → RECEIVE is not in workflow matrix; stamp still applies
    expect(result.statusChanged).toBe(false)
    expect(result.document.shopReceivedAt).toEqual(now)

    jest.useRealTimers()
  })

  it("rejects non-TRANSFER_OUT documents", async () => {
    const tx = {
      stockDocument: {
        findUnique: jest.fn().mockResolvedValue({
          id: "end-1",
          docType: "END",
          status: "DRAFT",
          toLocId: "shop-1",
          lines: [],
        }),
      },
    }
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )

    await expect(
      confirmShopReceipt({ documentId: "end-1", staffId: "staff-1" })
    ).rejects.toMatchObject({
      code: EndErrorCodes.INVALID_STATUS,
    })
  })
})
