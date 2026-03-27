# DB Schema Sync (PostgreSQL / Vultr)

This workflow connects to the destination PostgreSQL database, validates schema metadata for allowlisted tables, writes audit artifacts, and can optionally apply a reviewed SQL patch file.

## Safety model

- Scope-limited: reads only tables listed in `scripts/db-sync/allowlist.json`.
- Destination guard: requires a Vultr PostgreSQL host unless explicitly overridden for isolated local testing.
- Non-destructive dry-run by default.
- Apply mode requires a pre-reviewed SQL patch file.

## Required environment variables

Destination (Vultr PostgreSQL):

- `DEST_DATABASE_URL` or one of: `POSTGRES_URL`, `POSTGRESQL_URL`, `DATABASE_URL`
- or split vars:
  - `DEST_DB_HOST`
  - `DEST_DB_PORT` (optional, default `5432`)
  - `DEST_DB_USER`
  - `DEST_DB_PASSWORD`
  - `DEST_DB_NAME`
  - `DEST_DB_SCHEMA` (optional, default `public`)
  - `DEST_DB_SSL` (optional, `true` or `false`)

Optional controls:

- `SCHEMA_PATCH_FILE` (required only for `apply` mode)
- `ALLOW_NON_VULTR_PG` (optional, default `false`; local testing only)

## Usage

Dry run (metadata extraction + reporting only):

```bash
npm run db:schema:dry-run
```

Apply a reviewed SQL patch to destination DB:

```bash
npm run db:schema:apply
```

## Artifacts

Run output is written to `artifacts/db-sync/`:

- `dest-schema-<timestamp>.json`

## CI/CD integration

In the target repo pipeline, inject DB credentials via CI/CD secrets and run:

```bash
npm ci
npm run db:schema:dry-run
npm run db:schema:apply
```

Recommended gate: require explicit approval of the SQL patch referenced by `SCHEMA_PATCH_FILE` before apply in production.
