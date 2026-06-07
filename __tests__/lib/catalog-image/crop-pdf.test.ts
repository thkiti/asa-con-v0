import { EventEmitter } from "events"
import { CatalogImageError } from "@/lib/catalog-image/errors"

const mockSpawn = jest.fn()
const mockAccess = jest.fn()

jest.mock("child_process", () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}))

jest.mock("fs/promises", () => ({
  access: (...args: unknown[]) => mockAccess(...args),
}))

jest.mock("@/lib/catalog-image/config", () => ({
  getCatalogImageWorkDir: () => "/tmp/catalog-work",
}))

import { PDF_PAGE_RENDER_SCALE } from "@/lib/catalog-image/constants"
import {
  cropCatalogPdf,
  getCatalogImageCropWorkerPath,
  runCatalogImageCropWorker,
} from "@/lib/catalog-image/crop-pdf"

function createMockChild(stdout: string, stderr = "", exitCode = 0) {
  const stdin = new EventEmitter() as EventEmitter & {
    write: jest.Mock
    end: jest.Mock
  }
  stdin.write = jest.fn()
  stdin.end = jest.fn()

  const stdoutEmitter = new EventEmitter()
  const stderrEmitter = new EventEmitter()
  const child = new EventEmitter() as EventEmitter & {
    stdin: typeof stdin
    stdout: EventEmitter
    stderr: EventEmitter
  }
  child.stdin = stdin
  child.stdout = stdoutEmitter
  child.stderr = stderrEmitter

  process.nextTick(() => {
    if (stdout) stdoutEmitter.emit("data", Buffer.from(stdout))
    if (stderr) stderrEmitter.emit("data", Buffer.from(stderr))
    child.emit("close", exitCode)
  })

  return child
}

describe("cropCatalogPdf", () => {
  beforeEach(() => {
    mockSpawn.mockReset()
    mockAccess.mockReset()
    mockAccess.mockResolvedValue(undefined)
  })

  it("delegates to crop worker script via child process", async () => {
    const workerResult = {
      batchId: "batch-1",
      pages: [
        {
          pageNo: 1,
          slots: [
            {
              sourcePage: 1,
              sourceSlot: 1,
              localFilePath: "/tmp/catalog-work/batch-1/page-1/slot-1.png",
              previewPath: "/tmp/catalog-work/batch-1/page-1/slot-1.png",
            },
          ],
        },
      ],
    }

    const child = createMockChild(JSON.stringify(workerResult))
    mockSpawn.mockReturnValue(child)

    const result = await cropCatalogPdf({
      pdfPath: "/tmp/catalog-input/catalog.pdf",
      batchId: "batch-1",
      rotateDeg: 180,
      columns: 3,
      rows: 2,
    })

    expect(mockSpawn).toHaveBeenCalledWith(
      process.execPath,
      [getCatalogImageCropWorkerPath()],
      { stdio: ["pipe", "pipe", "pipe"] }
    )
    expect(child.stdin.write).toHaveBeenCalledWith(
      JSON.stringify({
        pdfPath: "/tmp/catalog-input/catalog.pdf",
        workDir: "/tmp/catalog-work",
        batchId: "batch-1",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
        renderScale: PDF_PAGE_RENDER_SCALE,
      })
    )
    expect(result).toEqual(workerResult)
  })

  it("passes pageNo to worker when set", async () => {
    const workerResult = {
      batchId: "batch-1",
      pages: [
        {
          pageNo: 3,
          slots: [
            {
              sourcePage: 3,
              sourceSlot: 1,
              localFilePath: "/tmp/catalog-work/batch-1/page-3/slot-1.png",
              previewPath: "/tmp/catalog-work/batch-1/page-3/slot-1.png",
            },
          ],
        },
      ],
    }
    const child = createMockChild(JSON.stringify(workerResult))
    mockSpawn.mockReturnValue(child)

    const result = await cropCatalogPdf({
      pdfPath: "/tmp/catalog-input/catalog.pdf",
      batchId: "batch-1",
      rotateDeg: 180,
      columns: 3,
      rows: 2,
      pageNo: 3,
    })

    expect(child.stdin.write).toHaveBeenCalledWith(
      JSON.stringify({
        pdfPath: "/tmp/catalog-input/catalog.pdf",
        workDir: "/tmp/catalog-work",
        batchId: "batch-1",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
        renderScale: PDF_PAGE_RENDER_SCALE,
        pageNo: 3,
      })
    )
    expect(result.pages).toHaveLength(1)
    expect(result.pages[0].pageNo).toBe(3)
  })

  it("passes crop area and render scale to worker", async () => {
    const workerResult = { batchId: "batch-1", pages: [] }
    const child = createMockChild(JSON.stringify(workerResult))
    mockSpawn.mockReturnValue(child)

    await cropCatalogPdf({
      pdfPath: "/tmp/catalog-input/catalog.pdf",
      batchId: "batch-1",
      rotateDeg: 180,
      columns: 3,
      rows: 2,
      cropArea: {
        cropX: 120,
        cropY: 40,
        cropWidth: 980,
        cropHeight: 1260,
      },
    })

    expect(child.stdin.write).toHaveBeenCalledWith(
      JSON.stringify({
        pdfPath: "/tmp/catalog-input/catalog.pdf",
        workDir: "/tmp/catalog-work",
        batchId: "batch-1",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
        renderScale: PDF_PAGE_RENDER_SCALE,
        cropX: 120,
        cropY: 40,
        cropWidth: 980,
        cropHeight: 1260,
      })
    )
  })

  it("maps worker INVALID_CROP_TEMPLATE stderr to API error", async () => {
    mockSpawn.mockReturnValue(
      createMockChild("", "INVALID_CROP_TEMPLATE: crop area is outside page bounds", 2)
    )

    await expect(
      cropCatalogPdf({
        pdfPath: "/tmp/catalog-input/catalog.pdf",
        batchId: "batch-1",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
        cropArea: {
          cropX: 0,
          cropY: 0,
          cropWidth: 99999,
          cropHeight: 99999,
        },
      })
    ).rejects.toMatchObject({
      code: "INVALID_CROP_TEMPLATE",
      httpStatus: 400,
    })
  })

  it("throws NOT_IMPLEMENTED when worker script is missing", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"))

    await expect(
      cropCatalogPdf({
        pdfPath: "/tmp/catalog-input/catalog.pdf",
        batchId: "batch-1",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
      })
    ).rejects.toMatchObject({
      code: "NOT_IMPLEMENTED",
      httpStatus: 501,
    })

    expect(mockSpawn).not.toHaveBeenCalled()
  })

  it("throws PDF_CROP_FAILED when worker exits non-zero", async () => {
    mockSpawn.mockReturnValue(
      createMockChild("", "worker render failed", 1)
    )

    await expect(
      cropCatalogPdf({
        pdfPath: "/tmp/catalog-input/catalog.pdf",
        batchId: "batch-1",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
      })
    ).rejects.toMatchObject({
      code: "PDF_CROP_FAILED",
      httpStatus: 500,
    })
  })

  it("rejects worker output paths outside work directory", async () => {
    const workerResult = {
      batchId: "batch-1",
      pages: [
        {
          pageNo: 1,
          slots: [
            {
              sourcePage: 1,
              sourceSlot: 1,
              localFilePath: "/etc/passwd",
              previewPath: "/etc/passwd",
            },
          ],
        },
      ],
    }

    mockSpawn.mockReturnValue(createMockChild(JSON.stringify(workerResult)))

    await expect(
      cropCatalogPdf({
        pdfPath: "/tmp/catalog-input/catalog.pdf",
        batchId: "batch-1",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
      })
    ).rejects.toMatchObject({
      code: "PATH_TRAVERSAL",
      httpStatus: 500,
    })
  })

  it("runCatalogImageCropWorker parses stdout from custom worker path", async () => {
    const workerResult = { batchId: "b", pages: [] }
    mockSpawn.mockReturnValue(createMockChild(JSON.stringify(workerResult)))

    const result = await runCatalogImageCropWorker(
      {
        pdfPath: "/a.pdf",
        workDir: "/tmp/catalog-work",
        batchId: "b",
        rotateDeg: 180,
        columns: 3,
        rows: 2,
        renderScale: PDF_PAGE_RENDER_SCALE,
      },
      "/custom/worker.mjs"
    )

    expect(mockSpawn).toHaveBeenCalledWith(process.execPath, ["/custom/worker.mjs"], {
      stdio: ["pipe", "pipe", "pipe"],
    })
    expect(result).toEqual(workerResult)
  })

  it("throws VALIDATION_ERROR for invalid grid dimensions", async () => {
    await expect(
      cropCatalogPdf({
        pdfPath: "/tmp/catalog-input/catalog.pdf",
        batchId: "batch-1",
        rotateDeg: 180,
        columns: 0,
        rows: 2,
      })
    ).rejects.toBeInstanceOf(CatalogImageError)

    expect(mockSpawn).not.toHaveBeenCalled()
  })
})
