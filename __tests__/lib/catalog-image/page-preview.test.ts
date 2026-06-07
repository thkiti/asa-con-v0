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

import {
  getCatalogImagePagePreviewWorkerPath,
  renderCatalogPagePreview,
  runCatalogImagePagePreviewWorker,
} from "@/lib/catalog-image/page-preview"

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function createMockChild(stdout: Buffer, stderr = "", exitCode = 0) {
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
    if (stdout.length > 0) stdoutEmitter.emit("data", stdout)
    if (stderr) stderrEmitter.emit("data", Buffer.from(stderr))
    child.emit("close", exitCode)
  })

  return child
}

describe("renderCatalogPagePreview", () => {
  beforeEach(() => {
    mockSpawn.mockReset()
    mockAccess.mockReset()
    mockAccess.mockResolvedValue(undefined)
  })

  it("delegates to page-preview worker and returns PNG buffer", async () => {
    const png = Buffer.concat([PNG_HEADER, Buffer.from("fake-png-body")])
    const child = createMockChild(png)
    mockSpawn.mockReturnValue(child)

    const result = await renderCatalogPagePreview("/tmp/catalog.pdf", 180)

    expect(mockSpawn).toHaveBeenCalledWith(
      process.execPath,
      [getCatalogImagePagePreviewWorkerPath()],
      { stdio: ["pipe", "pipe", "pipe"] }
    )
    expect(child.stdin.write).toHaveBeenCalledWith(
      JSON.stringify({
        pdfPath: "/tmp/catalog.pdf",
        rotateDeg: 180,
        renderScale: 2,
        pageNo: 1,
      })
    )
    expect(result.equals(png)).toBe(true)
  })

  it("passes pageNo to page-preview worker", async () => {
    const png = Buffer.concat([PNG_HEADER, Buffer.from("fake-png-body")])
    const child = createMockChild(png)
    mockSpawn.mockReturnValue(child)

    await renderCatalogPagePreview("/tmp/catalog.pdf", 180, 4)

    expect(child.stdin.write).toHaveBeenCalledWith(
      JSON.stringify({
        pdfPath: "/tmp/catalog.pdf",
        rotateDeg: 180,
        renderScale: 2,
        pageNo: 4,
      })
    )
  })

  it("throws NOT_IMPLEMENTED when worker script is missing", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"))

    await expect(
      renderCatalogPagePreview("/tmp/catalog.pdf", 180)
    ).rejects.toMatchObject({
      code: "NOT_IMPLEMENTED",
      httpStatus: 501,
    })
  })

  it("throws PAGE_PREVIEW_FAILED when worker exits non-zero", async () => {
    mockSpawn.mockReturnValue(createMockChild(Buffer.alloc(0), "render failed", 1))

    await expect(
      renderCatalogPagePreview("/tmp/catalog.pdf", 180)
    ).rejects.toMatchObject({
      code: "PAGE_PREVIEW_FAILED",
      httpStatus: 500,
    })
  })

  it("runCatalogImagePagePreviewWorker rejects invalid PNG output", async () => {
    mockSpawn.mockReturnValue(createMockChild(Buffer.from("not-a-png")))

    await expect(
      runCatalogImagePagePreviewWorker(
        { pdfPath: "/tmp/catalog.pdf", rotateDeg: 180 },
        "/custom/page-preview-worker.mjs"
      )
    ).rejects.toMatchObject({
      code: "PAGE_PREVIEW_FAILED",
    })
  })
})
