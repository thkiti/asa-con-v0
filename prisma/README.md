# Prisma

ASA-CON v0 schema and migrations (Prisma **7.8**). Datasource URL lives in [`prisma.config.ts`](../prisma.config.ts), not in `schema.prisma`.

## Connection URLs

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Next.js / Vercel runtime (`lib/shared/prisma.ts`) — transaction pooler `:6543` |
| `DIRECT_URL` | Prisma CLI (`migrate`, `db push`, `db execute`) — direct Postgres `:5432` |

See [.env.example](../.env.example) and [docs/41_SUPABASE_VERCEL_DATABASE_CONNECTIONS.md](../docs/41_SUPABASE_VERCEL_DATABASE_CONNECTIONS.md).

```bash
cp .env.example .env.local   # then fill placeholders from Supabase Connect UI
```

## Commands

```bash
# Generate client (no live database required)
npm run db:generate
# or: npx prisma generate

# Read-only status (needs DIRECT_URL or DATABASE_URL)
npx prisma migrate status

# Apply migrations — reviewed, intentional only (never against transaction pooler)
# npx prisma migrate deploy
```

## Runtime client

`lib/shared/prisma.ts` — lazy global singleton + `pg.Pool` (`max` 1 on Vercel, 2 locally). Do not construct `PrismaClient` per request.
