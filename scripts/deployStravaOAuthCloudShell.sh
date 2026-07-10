#!/usr/bin/env bash
# Deploy strava-oauth from Google Cloud Shell (browser terminal).
# Open: https://shell.cloud.google.com/?project=climb-performance-lab
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-climb-performance-lab}"
REGION="${REGION:-europe-west1}"
SERVICE_NAME="${SERVICE_NAME:-strava-oauth}"
ENTRY_POINT="${ENTRY_POINT:-strava_oauth}"
REPO_URL="${REPO_URL:-https://github.com/VCCharlie/Climb-Performance-Lab.git}"
REPO_DIR="${REPO_DIR:-${HOME}/Climb-Performance-Lab}"
# Use main after PR merge; until then deploy from the Strava OAuth feature branch.
DEPLOY_BRANCH="${DEPLOY_BRANCH:-cursor/strava-oauth-server-side-8810}"

echo "==> Project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

if [ -d "${REPO_DIR}/.git" ]; then
  echo "==> Updating existing repo at ${REPO_DIR} (branch: ${DEPLOY_BRANCH})"
  git -C "${REPO_DIR}" fetch origin "${DEPLOY_BRANCH}"
  git -C "${REPO_DIR}" checkout "${DEPLOY_BRANCH}"
  git -C "${REPO_DIR}" pull origin "${DEPLOY_BRANCH}"
else
  echo "==> Cloning repo to ${REPO_DIR} (branch: ${DEPLOY_BRANCH})"
  git clone --branch "${DEPLOY_BRANCH}" "${REPO_URL}" "${REPO_DIR}"
fi

cd "${REPO_DIR}/cloud-function"

echo "==> Deploying Cloud Run service: ${SERVICE_NAME}"
echo "    Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in Cloud Run if not using Secret Manager."

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
echo "Next:"
echo "  1. Cloud Run → ${SERVICE_NAME} → Variables → STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET"
echo "  2. GitHub Secrets → same STRAVA_* values for nightly sync"
echo "  3. Optional: VITE_STRAVA_OAUTH_URL=${URI} in GitHub Pages build"
echo "  4. Connect Strava once in the app (Settings)"
