#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
controller="$repository_root/deploy.ps1"

for value in \
  'LocalName     = "internet_banking_backend"' \
  'ServiceName   = "internet-banking-backend"' \
  'GitlabProject = "Bejan/internet_banking_backend.git"' \
  'LocalName     = "internet_banking_frontend"' \
  'ServiceName   = "internet-banking-frontend"' \
  'GitlabProject = "Bejan/internet_banking_frontend.git"' \
  "INTERNET_BANKING_SERVICE_TOKEN" \
  "NEXT_PUBLIC_API_URL: http://10.65.10.20:4001" \
  "http://127.0.0.1:4001/ping" \
  "      - daily_network" \
  '"4001:4001"' \
  '"4000:3000"'; do
  grep -Fq "$value" "$controller" || { echo "deploy.ps1 is missing: $value" >&2; exit 1; }
done

echo "internet banking deployment configuration test passed"
