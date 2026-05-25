# Auth (Phase 2)

Session abstraction — **stub only**, no real login yet.

| File | Purpose |
|------|---------|
| `types.ts` | `SessionUser`, cookie payload types |
| `cookies.ts` | Cookie names + `readSessionCookies()` |
| `session.ts` | `getSession()` — trusts cookies, no DB |
| `index.ts` | Public exports |

Real Staff/password login deferred to a later phase.
