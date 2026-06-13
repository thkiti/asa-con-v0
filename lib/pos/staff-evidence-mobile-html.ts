import type { StaffEvidenceCaptureMobileMeta } from "@/lib/pos/staff-evidence-capture-token"

const PAGE_STYLE = `
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #fafafa; color: #18181b; }
  main { max-width: 28rem; margin: 0 auto; padding: 1.5rem 1rem; min-height: 100vh; box-sizing: border-box; }
  h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
  p { margin: 0.5rem 0; line-height: 1.5; }
  .card { background: #fff; border: 1px solid #d4d4d8; border-radius: 0.75rem; padding: 1rem; margin: 1rem 0; }
  .row { display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 0.75rem; font-size: 0.875rem; }
  .row:first-child { margin-top: 0; }
  .label { color: #71717a; }
  .mono { font-family: ui-monospace, monospace; font-size: 0.75rem; }
  .success { border-color: #86efac; background: #ecfdf5; color: #064e3b; }
  .error { border-color: #fca5a5; background: #fef2f2; color: #7f1d1d; }
  .btn { display: block; width: 100%; margin-top: 1rem; padding: 1rem; font-size: 1rem; font-weight: 700;
    border: none; border-radius: 0.75rem; background: #0369a1; color: #fff; cursor: pointer; }
  .btn-secondary { background: #fff; color: #27272a; border: 1px solid #a1a1aa; font-weight: 600; text-align: center;
    text-decoration: none; box-sizing: border-box; }
  .upload-section { margin-top: 1.25rem; }
  .upload-section h2 { font-size: 1rem; margin: 0 0 0.5rem; }
  input[type=file] { display: block; width: 100%; margin: 0.75rem 0; font-size: 1rem; }
`

export function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function buildStaffEvidenceMobileUploadPagePath(token: string): string {
  return `/staff-evidence/mobile/${encodeURIComponent(token)}`
}

function pageShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`
}

export function renderStaffEvidenceMobileUploadFormPage(input: {
  token: string
  meta: StaffEvidenceCaptureMobileMeta
}): string {
  const kindHint =
    input.meta.kind === "ph"
      ? "Upload a portrait staff photo."
      : "Upload a clear photo of the ID card."

  return pageShell(
    input.meta.label,
    `
    <h1>${escapeHtml(input.meta.label)}</h1>
    <p>${escapeHtml(kindHint)}</p>
    <section class="card">
      <div class="row"><span class="label">Staff ID</span><span class="mono">${escapeHtml(input.meta.staffId)}</span></div>
      <div class="row"><span class="label">Type</span><span>${escapeHtml(input.meta.label)}</span></div>
    </section>
    <section class="upload-section">
      <h2>Take Photo</h2>
      <form action="/api/staff-evidence/mobile/upload" method="post" enctype="multipart/form-data">
        <input type="hidden" name="token" value="${escapeHtml(input.token)}" />
        <input type="hidden" name="html" value="1" />
        <input type="file" name="file" accept="image/*" capture="environment" required />
        <button class="btn" type="submit">Upload Photo</button>
      </form>
    </section>
    <section class="upload-section">
      <h2>Choose Photo</h2>
      <form action="/api/staff-evidence/mobile/upload" method="post" enctype="multipart/form-data">
        <input type="hidden" name="token" value="${escapeHtml(input.token)}" />
        <input type="hidden" name="html" value="1" />
        <input type="file" name="file" accept="image/*" required />
        <button class="btn" type="submit">Upload Photo</button>
      </form>
    </section>
    `
  )
}

export function renderStaffEvidenceMobileUploadSuccessPage(): string {
  return pageShell(
    "Upload Complete",
    `
    <section class="card success">
      <h1>Upload complete</h1>
      <p>You can close this page and return to the desktop upload screen.</p>
    </section>
    `
  )
}

export function renderStaffEvidenceMobileUploadErrorPage(input: {
  title?: string
  message: string
  retryUrl?: string | null
}): string {
  const retry =
    input.retryUrl && input.retryUrl.trim()
      ? `<a class="btn btn-secondary" href="${escapeHtml(input.retryUrl)}">Try again</a>`
      : ""

  return pageShell(
    input.title ?? "Upload Unavailable",
    `
    <section class="card error">
      <h1>${escapeHtml(input.title ?? "Upload unavailable")}</h1>
      <p>${escapeHtml(input.message)}</p>
      ${retry}
    </section>
    `
  )
}

export function staffEvidenceHtmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}

export function isStaffEvidenceHtmlFormUpload(form: FormData): boolean {
  return String(form.get("html") ?? "").trim() === "1"
}
