# ASA-CON v0

Clean-base modular monolith for ASA inventory and POS.

- **Reference repo:** `asa-con` (read-only — do not copy legacy code)
- **Status:** Phase 1 — Prisma kernel + shared infra

## Docs

Start with [docs/00_README.md](./docs/00_README.md).

## Setup

```bash
npm install
npm run db:generate   # prisma generate — no database required
cp .env.example .env  # set DATABASE_URL before migrate (Phase 1+: migrations manual)
npm run build
```

Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Structure

```
app/        Routes (thin controllers)
lib/        Domain modules + lib/shared (prisma client, types)
prisma/     schema.prisma (kernel only)
docs/       Architecture
generated/  Prisma client output (gitignored)
```

## Phases

| Phase | Scope |
|-------|-------|
| 0 | Docs + scaffold |
| 1 | Prisma kernel + shared types (current) |
| 2 | Permissions + auth |
| 3+ | Domain vertical slices |
