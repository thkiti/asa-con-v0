/**
 * @jest-environment jsdom
 */
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { DocumentArchiveVaultActions } from "@/components/document-archive/DocumentArchiveVaultActions"
import {
  fetchDocumentArchivePdfStatus,
  uploadDocumentArchivePdf,
} from "@/lib/document-archive-ui/client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

jest.mock("@/lib/document-archive-ui/client", () => ({
  fetchDocumentArchivePdfStatus: jest.fn(),
  uploadDocumentArchivePdf: jest.fn(),
}))

const mockFetchStatus = fetchDocumentArchivePdfStatus as jest.Mock
const mockUpload = uploadDocumentArchivePdf as jest.Mock

function mount(ui: ReactElement) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(ui)
  })
  return { container, root }
}

describe("DocumentArchiveVaultActions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchStatus.mockResolvedValue(false)
  })

  it("shows upload when pdfAvailable is false", async () => {
    const { container } = mount(
      <DocumentArchiveVaultActions
        documentKind="PAV"
        documentId="pav-1"
        documentNo="PAV-260001"
        legalEntityCode="AS"
        branchId="branch-1"
        workflowStatus="POSTED"
        initialPdfAvailable={false}
      />
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="action-upload-pdf"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="action-download-pdf"]')).toBeNull()
  })

  it("shows download link only when pdfAvailable is true", async () => {
    mockFetchStatus.mockResolvedValue(true)
    const { container } = mount(
      <DocumentArchiveVaultActions
        documentKind="PAV"
        documentId="pav-1"
        documentNo="PAV-260001"
        legalEntityCode="AS"
        workflowStatus="POSTED"
        initialPdfAvailable={true}
      />
    )

    await act(async () => {
      await Promise.resolve()
    })

    const download = container.querySelector('[data-testid="action-download-pdf"]')
    expect(download).not.toBeNull()
    expect(download?.getAttribute("href")).toBe(
      "/api/document-archive/by-document/PAV/pav-1/file?archiveKind=DOCUMENT_PDF"
    )
    expect(container.querySelector('[data-testid="action-upload-pdf"]')).toBeNull()
  })

  it("uploads multipart payload with document link fields", async () => {
    mockUpload.mockResolvedValue(undefined)
    mockFetchStatus.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

    const { container } = mount(
      <DocumentArchiveVaultActions
        documentKind="REV"
        documentId="rev-1"
        documentNo="REV-260001"
        legalEntityCode="AS"
        branchId="branch-1"
        workflowStatus="POSTED"
        initialPdfAvailable={false}
      />
    )

    await act(async () => {
      await Promise.resolve()
    })

    const input = container.querySelector(
      '[data-testid="document-archive-upload-input"]'
    ) as HTMLInputElement
    const file = new File(["pdf"], "REV-260001.pdf", { type: "application/pdf" })

    await act(async () => {
      Object.defineProperty(input, "files", { value: [file] })
      input.dispatchEvent(new Event("change", { bubbles: true }))
      await Promise.resolve()
    })

    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        legalEntityCode: "AS",
        branchId: "branch-1",
        links: [
          {
            documentKind: "REV",
            documentId: "rev-1",
            documentNo: "REV-260001",
          },
        ],
      })
    )
    expect(container.querySelector('[data-testid="action-download-pdf"]')).not.toBeNull()
  })

  it("renders nothing for unsupported null archive state", async () => {
    mockFetchStatus.mockResolvedValue(null)
    const { container } = mount(
      <DocumentArchiveVaultActions
        documentKind="PAV"
        documentId="pav-draft"
        documentNo="PAV-DRAFT"
        legalEntityCode="AS"
        workflowStatus="DRAFT"
        initialPdfAvailable={null}
      />
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(container.querySelector('[data-testid="document-archive-vault-actions"]')).toBeNull()
  })
})
