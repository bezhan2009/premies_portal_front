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
  'internet-banking-backend", "internet-banking-frontend' \
  'main_service_arguments=' \
  'deploy_internet_banking=' \
  '-p internet_banking -f internet_banking_backend/deploy/docker-compose.yml up --build -d' \
  'INTERNET_BANKING_SERVICE_TOKEN: ${INTERNET_BANKING_SERVICE_TOKEN}'; do
  grep -Fq -- "$value" "$controller" || { echo "deploy.ps1 is missing: $value" >&2; exit 1; }
done

if grep -Fq '$serviceArguments = $quotedServices' "$controller"; then
  echo "deploy.ps1 still sends Internet Banking service names to the main Compose project" >&2
  exit 1
fi

if grep -Eq 'ghp_|glpat-' "$controller"; then
  echo "deploy.ps1 must not contain repository credentials" >&2
  exit 1
fi

echo "internet banking deployment configuration test passed"
