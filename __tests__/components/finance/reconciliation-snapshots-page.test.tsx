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
    expect(html).toContain("Branch filter")
    expect(html).toContain("Apply filter")
    expect(html).toContain("Open compare")
    expect(html).toContain("Select two snapshots to compare")
    expect(html).toContain("animate-pulse")
    expect(html).not.toContain("Fix")
    expect(html).not.toContain("Reconcile")
    expect(html).not.toContain("Post")
  })
})
