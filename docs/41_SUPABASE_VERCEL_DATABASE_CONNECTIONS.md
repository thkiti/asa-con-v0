# Supabase + Vercel database connections (Prisma 7)

Scope: Runtime vs CLI connection strings for ASA-CON v0 on Vercel + Supabase.

Related: [prisma/README.md](../prisma/README.md), [.env.example](../.env.example)

## Roles

| Variable | Used by | Host / port | Purpose |
|----------|---------|-------------|---------|
| `DATABASE_URL` | Next.js runtime (`lib/shared/prisma.ts`) | `*.pooler.supabase.com:6543` | Supavisor **transaction** mode |
| `DIRECT_URL` | Prisma CLI (`prisma.config.ts`), heavy scripts | `db.<PROJECT_REF>.supabase.co:5432` | Direct Postgres |

Never put datasource URLs in `schema.prisma` (Prisma 7 — configured in `prisma.config.ts`).

## Runtime Pool

`lib/shared/prisma.ts` creates one `pg.Pool` + one `PrismaClient`, both cached on `globalThis`:

| Environment | `Pool.max` |
|-------------|------------|
| Vercel / Lambda (`VERCEL=1`, `VERCEL_ENV`, or `AWS_LAMBDA_FUNCTION_NAME`) | **1** |
| Local / other | **2** |
| Override | `PRISMA_POOL_MAX` (1–10) |

## Manual Vercel rollout

Do this in the Vercel dashboard (or CLI) — this repo does **not** change production env vars.

1. From Supabase → Connect, copy **Transaction** pooler URI → set as **`DATABASE_URL`**  
   - Port **6543**  
   - Add `?pgbouncer=true&connection_limit=1` if not already present  
2. Copy **Direct** connection URI → set as **`DIRECT_URL`**  
   - Host `db.<PROJECT_REF>.supabase.co`, port **5432**  
3. Apply to Production and Preview as needed; redeploy.  
4. Smoke: login, POS checkout, one finance read; watch Supabase connection charts for session-mode exhaustion.

## Prisma CLI

```bash
# Uses DIRECT_URL (fallback DATABASE_URL) from env / .env
npx prisma generate          # no live DB required (placeholder OK)
npx prisma migrate status    # read-only; needs reachable DIRECT_URL
# migrate deploy / db push — only when intentionally applying schema (not part of deploy default)
```

**Never** point migrations at the transaction pooler (`:6543`).

## Long-running scripts

Prefer `DIRECT_URL` (see `resolveDirectOrDatabaseUrl()`). Scripts that still import `@/lib/shared/prisma` follow **`DATABASE_URL`** (runtime pooler after rollout).

## Verify host/port without printing passwords

```bash
npx tsx -e "import 'dotenv/config'; import {config} from 'dotenv'; config({path:'.env.local'});
for (const k of ['DATABASE_URL','DIRECT_URL']) {
  const raw = process.env[k];
  if (!raw) { console.log(k + ': (unset)'); continue; }
  const u = new URL(raw.replace(/^postgresql:/,'http:'));
  console.log(k, u.hostname, u.port || '5432', [...u.searchParams.keys()].join(','));
}"
```

## Rollback

1. In Vercel, restore previous `DATABASE_URL` (session `:5432` if that was known-good).  
2. Redeploy.  
3. Keep `DIRECT_URL` for CLI if still valid.  
4. Revert repo connection changes only if the new Pool/`prisma.config` code itself misbehaves.

## Compatibility notes

- Interactive `prisma.$transaction` (POS checkout) is supported on transaction pooler while a connection is held for the tx.  
- Prepared statements: `@prisma/adapter-pg` does not enable named prepared-statement caching unless configured; keep `pgbouncer=true` on the pooled URL per Supabase guidance.
