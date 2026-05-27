import { renderToStaticMarkup } from "react-dom/server"
import { ReconciliationSnapshotsPage } from "@/components/finance/ReconciliationSnapshotsPage"
import { fetchReconciliationSnapshots } from "@/lib/finance-ui/fetchers"

jest.mock("@/lib/finance-ui/fetchers", () => ({
  fetchReconciliationSnapshots: jest.fn(),
}))

const mockFetchSnapshots = fetchReconciliationSnapshots as jest.MockedFunction<
  typeof fetchReconciliationSnapshots
>

describe("ReconciliationSnapshotsPage", () => {
  beforeEach(() => {
    mockFetchSnapshots.mockReset()
    mockFetchSnapshots.mockResolvedValue({ snapshots: [] })
  })

  it("renders list shell without fix/reconcile actions", () => {
    const html = renderToStaticMarkup(<ReconciliationSnapshotsPage />)
    expect(html).toContain("Refresh")
    expect(html).toContain("Read-only frozen reconciliation captures")
    expect(html).not.toContain("Fix")
    expect(html).not.toContain("Reconcile")
    expect(html).not.toContain("Post")
  })
})
