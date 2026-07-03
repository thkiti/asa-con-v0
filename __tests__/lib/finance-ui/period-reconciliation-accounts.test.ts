import { formatReconciliationAccountLabel } from "@/lib/finance/reconciliation-account-config"
import { fetchReconciliationAccounts } from "@/lib/finance-ui/period-reconciliation-accounts"

describe("period-reconciliation-accounts ui", () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it("formats account labels as code • name", () => {
    expect(
      formatReconciliationAccountLabel({
        code: "1021001",
        name: "Bangkok Bank",
      })
    ).toBe("1021001 • Bangkok Bank")
  })

  it("loads bank accounts from the period reconciliation API", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "bank-1", code: "1021001", name: "Bangkok Bank" }],
      }),
    } as Response)

    const result = await fetchReconciliationAccounts("BANK")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/finance/period-reconciliation/accounts?role=BANK",
      { cache: "no-store" }
    )
    expect(result.items).toEqual([
      { id: "bank-1", code: "1021001", name: "Bangkok Bank" },
    ])
  })

  it("loads cash accounts from the period reconciliation API", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "cash-1", code: "1001", name: "Cash drawer" }],
      }),
    } as Response)

    const result = await fetchReconciliationAccounts("CASH")

    expect(result.items).toEqual([{ id: "cash-1", code: "1001", name: "Cash drawer" }])
  })
})
