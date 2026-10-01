#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:4000}"
TMP_BODY="$(mktemp)"
trap 'rm -f "$TMP_BODY"' EXIT

expect_status() {
  local expected="$1"
  local method="$2"
  local path="$3"
  local actual
  actual="$(curl -sS -o "$TMP_BODY" -w '%{http_code}' -X "$method" "${BASE_URL}${path}")"
  if [ "$actual" != "$expected" ]; then
    echo "Smoke failure: $method $path expected $expected, got $actual" >&2
    sed -n '1,80p' "$TMP_BODY" >&2
    exit 1
  fi
  echo "✓ $method $path -> $actual"
}

expect_status 200 GET /health/live
expect_status 200 GET /health/ready
expect_status 200 GET '/api/v1/discovery/treatments?limit=20'
expect_status 401 GET /api/v1/me

echo 'Local backend smoke check passed.'
