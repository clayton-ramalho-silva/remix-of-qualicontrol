#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SYNC_OBRAS_ENDPOINT:-}" ]]; then
  echo "ERROR: SYNC_OBRAS_ENDPOINT is not set"
  exit 1
fi

if [[ -z "${SYNC_OBRAS_SECRET:-}" ]]; then
  echo "ERROR: SYNC_OBRAS_SECRET is not set"
  exit 1
fi

echo "Running Obras sync against $SYNC_OBRAS_ENDPOINT"

curl -fsS -X GET "$SYNC_OBRAS_ENDPOINT" \
  -H "Accept: application/json" \
  -H "X-Sync-Secret: $SYNC_OBRAS_SECRET"

echo
