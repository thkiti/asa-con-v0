# ASA-CON v0 Agent Rules

Modular monolith clean base. Read architecture docs before adding code:

- [docs/00_README.md](./docs/00_README.md)
- [docs/01_MODULAR_MONOLITH_BOUNDARIES.md](./docs/01_MODULAR_MONOLITH_BOUNDARIES.md)

## Rules

- Business logic lives in `lib/<domain>/`, not in `app/` routes or pages.
- Do not copy code from `asa-con` — use it as reference only.
- One phase at a time; see README phase table.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
