/**
 * Placeholder login — Phase 2 foundation only.
 * Real Staff/password login is a later phase.
 * For local testing, set cookies: sessionId, role (see docs/05_AUTH_PERMISSIONS.md).
 */
export default function LoginPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Login</h1>
      <p className="mt-2 text-zinc-600">
        Session stub — no credential check yet. Set cookies manually for dev
        or wait for login implementation.
      </p>
      <p className="mt-4 text-sm text-zinc-500">
        After session cookies exist,{" "}
        <code className="rounded bg-zinc-100 px-1">GET /api/auth/session</code>{" "}
        returns the current user.
      </p>
    </main>
  )
}