# Permissions (Phase 2)

Centralized RBAC — pure functions, no React imports.

| File | Purpose |
|------|---------|
| `roles.ts` | `ROLE_AREAS`, `roleLandingPath()` |
| `route-access.ts` | `canAccessRoute()` |
| `menu.ts` | `canAccessMenu()`, `getMenuItemsForRole()` |
| `index.ts` | Public exports |

Components and middleware import from here — do not embed role matrices in UI.
