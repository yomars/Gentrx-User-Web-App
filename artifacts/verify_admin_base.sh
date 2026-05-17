#!/usr/bin/env bash
set -euo pipefail

INDEX_FILE="dist/index.html"

if [ ! -f "$INDEX_FILE" ]; then
  echo "ERROR: $INDEX_FILE not found. Run build first." >&2
  exit 1
fi

if ! grep -q 'href="/admin/manifest.json"' "$INDEX_FILE"; then
  echo "ERROR: manifest path is not /admin/manifest.json" >&2
  exit 1
fi

if ! grep -q 'src="/admin/assets/' "$INDEX_FILE"; then
  echo "ERROR: script asset path is not /admin/assets/*" >&2
  exit 1
fi

if ! grep -q 'href="/admin/assets/' "$INDEX_FILE"; then
  echo "ERROR: stylesheet/modulepreload path is not /admin/assets/*" >&2
  exit 1
fi

echo "OK: admin base path guard passed"
