# devboard-v1 Legacy Data Archive

Permanent local archive of raw legacy master-data source files copied from the old ASA-CON dev import folder.

## What this is

This folder preserves **raw legacy evidence** used to seed devboard master data. It is not a schema source and does not replace `prisma/schema.prisma` in asa-con-v0, which remains the source of truth for database structure.

Files here support traceability for future Stock, Finance, POS, and Audit work: you can compare imported rows back to the original DBF/CSV inputs via `manifest.json` checksums.

## Where it came from

Default source folder:

`D:\_projects\asa-con\scripts`

Populate or refresh this archive with:

```bash
npx tsx scripts/import/archive-legacy-sources.ts --source-dir=D:/_projects/asa-con/scripts --target-dir=data/legacy/devboard-v1
```

Dry-run (no copies, no manifest write):

```bash
npx tsx scripts/import/archive-legacy-sources.ts --dry-run
```

## File roles

| File | Folder | Import role | Used today |
|------|--------|-------------|------------|
| `SHP.DBF` | `dbf/` | Branch | Yes (24B import) |
| `POSINY.DBF` | `dbf/` | Product | Yes (24B import) |
| `EME.DBF` | `dbf/` | Staff | Archived only (staff import not in 24B) |
| `SHP.DBT` | `dbf/` | DBF memo companion | Optional |
| `kCode.csv` | `csv/` | ReferenceStock (K) | Yes |
| `cCode.csv` | `csv/` | ReferenceStock (C) | Yes |
| `mCode.csv` | `csv/` | ReferenceStock (M) | Yes |
| `oCode.csv` | `csv/` | ReferenceStock (O) | Optional |

Encoding notes:

- DBF text fields: **TIS-620**
- CSV files: **UTF-8** (legacy CSV; treat as evidence, not canonical schema)

## Import dry-run from this archive

The import kernel accepts an archive root and resolves files under `dbf/` and `csv/` automatically:

```bash
npx tsx scripts/import/run.ts --profile=devboard-v1 --source-dir=data/legacy/devboard-v1 --dry-run
```

Default import (unchanged) still reads the flat legacy scripts folder:

```bash
npx tsx scripts/import/run.ts --profile=devboard-v1 --dry-run
```

Do **not** run `--apply` as part of archive maintenance unless you intentionally want database writes.

## Reports

Import dry-run/apply reports are runtime artifacts written to `tmp/import-reports/`. You may copy relevant reports into `reports/` here for audit evidence; nothing copies them automatically.

## Git policy

Raw DBF/CSV contents and generated `manifest.json` are **local-only** by default (see repo `.gitignore`). This repo commits the folder structure, README, and `manifest.example.json` only.
