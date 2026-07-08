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
FUNCTION_NAME="${FUNCTION_NAME:-sync-intervals}"
REPO_URL="${REPO_URL:-https://github.com/VCCharlie/Climb-Performance-Lab.git}"
REPO_DIR="${REPO_DIR:-${HOME}/Climb-Performance-Lab}"

echo "==> Project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

if [ -d "${REPO_DIR}/.git" ]; then
  echo "==> Updating repo at ${REPO_DIR}"
  git -C "${REPO_DIR}" fetch origin main
  git -C "${REPO_DIR}" checkout main
  git -C "${REPO_DIR}" pull origin main
else
  echo "==> Cloning repo to ${REPO_DIR}"
  git clone "${REPO_URL}" "${REPO_DIR}"
  git -C "${REPO_DIR}" checkout main
fi

cd "${REPO_DIR}/cloud-function"

echo "==> Deploying ${FUNCTION_NAME} (Python 3.12, Gen2)..."
echo "    Existing env vars (e.g. AUTOMATION_SHARED_SECRET) are kept unless you pass new ones."

gcloud functions deploy "${FUNCTION_NAME}" \
  --gen2 \
  --runtime python312 \
  --trigger-http \
  --allow-unauthenticated \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --entry-point sync_intervals \
  --source . \
  --set-secrets "INTERVALS_ATHLETE_ID=intervals-athlete-id:latest,INTERVALS_API_KEY=intervals-api-key:latest"

URI="$(gcloud functions describe "${FUNCTION_NAME}" \
  --gen2 \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format='value(serviceConfig.uri)')"

echo ""
echo "✅ Deploy complete."
echo "   URL: ${URI}"
echo ""
echo "Next: smoke-test Intervals sync in the app (signed in) and Nightly Sync workflow."
