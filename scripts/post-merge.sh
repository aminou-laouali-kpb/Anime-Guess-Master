#!/bin/bash
set -e
pnpm install --frozen-lockfile
# No `db push` here: the stats database is optional, and the server creates its
# own tables at startup (lib/db/src/ensure-schema.ts). Run
# `pnpm --filter @workspace/db run push` by hand when the schema changes.
