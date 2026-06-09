import {
  uploadPaymentEvidenceSlip,
  uploadPaymentEvidenceSlipInBackground,
} from "@/lib/pos-ui/payment-evidence-upload-client"

describe("payment-evidence-upload-client", () => {
  it("posts multipart upload with receiptNo", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        evidenceId: "ev-1",
        receiptNo: "REC-SH001-202606-0001",
        status: "UPLOADED",
        blobPathname: "payment-slips/SH001/REC-SH001-202606-0001.jpg",
        blobUrl: "https://blob.example/slip.jpg",
      }),
    })

    const result = await uploadPaymentEvidenceSlip(
      {
        file: new Blob(["x"], { type: "image/jpeg" }),
        receiptNo: "REC-SH001-202606-0001",
      },
      fetchFn
    )

    expect(result.ok).toBe(true)
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/pos/payment-evidence/upload",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("background helper does not throw on upload failure", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "fail", code: "BLOB_UPLOAD_FAILED" }),
    })
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    uploadPaymentEvidenceSlipInBackground(
      {
        file: new Blob(["x"], { type: "image/jpeg" }),
        receiptNo: "REC-SH001-202606-0001",
      },
      fetchFn
    )

    await new Promise((r) => setTimeout(r, 0))
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
