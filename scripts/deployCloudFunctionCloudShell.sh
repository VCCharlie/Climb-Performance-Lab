#!/usr/bin/env bash
# Deploy sync-intervals from Google Cloud Shell (browser terminal).
# Uses YOUR Google login — no GitHub service-account IAM roles needed.
#
# Open: https://shell.cloud.google.com/?project=climb-performance-lab
# Then paste ONE line (see docs/CLOUD_FUNCTION_AUTH.md):
#   curl -fsSL https://raw.githubusercontent.com/VCCharlie/Climb-Performance-Lab/main/scripts/deployCloudFunctionCloudShell.sh | bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-climb-performance-lab}"
REGION="${REGION:-europe-west1}"
SERVICE_NAME="${SERVICE_NAME:-sync-intervals}"
ENTRY_POINT="${ENTRY_POINT:-sync_intervals}"
REPO_URL="${REPO_URL:-https://github.com/VCCharlie/Climb-Performance-Lab.git}"
REPO_DIR="${REPO_DIR:-${HOME}/Climb-Performance-Lab}"

echo "==> Project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

if [ -d "${REPO_DIR}/.git" ]; then
  echo "==> Updating existing repo at ${REPO_DIR}"
  git -C "${REPO_DIR}" fetch origin main
  git -C "${REPO_DIR}" checkout main
  git -C "${REPO_DIR}" pull origin main
else
  echo "==> Cloning repo to ${REPO_DIR}"
  git clone "${REPO_URL}" "${REPO_DIR}"
  git -C "${REPO_DIR}" checkout main
fi

cd "${REPO_DIR}/cloud-function"

echo "==> Deploying new revision to Cloud Run service: ${SERVICE_NAME}"
echo "    Existing env vars and secrets (Intervals keys, AUTOMATION_SHARED_SECRET) are kept."
echo "    Do NOT pass --set-secrets on redeploy — type mismatch error if already configured."

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --function "${ENTRY_POINT}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --allow-unauthenticated

URI="$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format='value(status.url)')"

echo ""
echo "✅ Deploy complete."
echo "   URL: ${URI}"
echo ""
echo "Next: smoke-test Intervals sync in the app (signed in) and Nightly Sync workflow."
