import {
  escapeHtml,
  renderMobileUploadFormPage,
  renderMobileUploadSuccessPage,
  renderMobileUploadErrorPage,
  isHtmlFormUpload,
} from "@/lib/pos/payment-evidence-mobile-html"

describe("payment-evidence-mobile-html", () => {
  it("escapes HTML in output", () => {
    expect(escapeHtml(`<script>"x"&</script>`)).toBe(
      "&lt;script&gt;&quot;x&quot;&amp;&lt;/script&gt;"
    )
  })

  it("renders upload form with receipt details", () => {
    const html = renderMobileUploadFormPage({
      token: "signed.token",
      meta: {
        receiptNo: "REC-SH001-202606-0001",
        branchCode: "SH001",
        branchName: "Chidlom",
        amount: "250.00",
        expiresAt: "2026-06-09T12:00:00.000Z",
        status: "PENDING",
      },
    })

    expect(html).toContain("<!DOCTYPE html>")
    expect(html).toContain("REC-SH001-202606-0001")
    expect(html).toContain("Chidlom")
    expect(html).toContain("250.00")
    expect(html).toContain('action="/api/payment-evidence/mobile/upload"')
    expect(html).toContain('name="token"')
    expect(html).toContain('name="html"')
    expect(html).toContain("Take Photo")
    expect(html).toContain("Choose Photo")
    expect(html).toContain('capture="environment"')
    const choosePhotoSection = html.split("Choose Photo")[1] ?? ""
    expect(choosePhotoSection).not.toContain('capture="environment"')
    expect(html.match(/<form[^>]*action="\/api\/payment-evidence\/mobile\/upload"/g)?.length).toBe(2)
    expect(html).not.toContain("use client")
  })

  it("renders success page", () => {
    const html = renderMobileUploadSuccessPage()
    expect(html).toContain("Upload complete")
    expect(html).toContain("You can close this page")
  })

  it("renders error page with retry link", () => {
    const html = renderMobileUploadErrorPage({
      message: "Upload link has expired",
      retryUrl: "/payment-evidence/mobile/signed.token",
    })
    expect(html).toContain("Upload link has expired")
    expect(html).toContain('href="/payment-evidence/mobile/signed.token"')
  })

  it("detects html form upload flag", () => {
    const fd = new FormData()
    fd.set("html", "1")
    expect(isHtmlFormUpload(fd)).toBe(true)
  })
})
