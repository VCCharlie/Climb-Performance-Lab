#!/usr/bin/env bash
# Deploy strava-oauth from Google Cloud Shell (browser terminal).
#
# Open: https://shell.cloud.google.com/?project=climb-performance-lab
#
# IMPORTANT: VCCharlie/Climb-Performance-Lab is a PRIVATE GitHub repo.
# curl https://raw.githubusercontent.com/... always returns 404 without auth.
# Run this script from a local clone, or paste the git + gcloud block from docs/STRAVA_OAUTH.md.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-climb-performance-lab}"
REGION="${REGION:-europe-west1}"
SERVICE_NAME="${SERVICE_NAME:-strava-oauth}"
ENTRY_POINT="${ENTRY_POINT:-strava_oauth}"
REPO_URL="${REPO_URL:-https://github.com/VCCharlie/Climb-Performance-Lab.git}"
REPO_DIR="${REPO_DIR:-${HOME}/Climb-Performance-Lab}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

echo "==> Project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

if [ -d "${REPO_DIR}/.git" ]; then
  echo "==> Updating existing repo at ${REPO_DIR} (branch: ${DEPLOY_BRANCH})"
  git -C "${REPO_DIR}" fetch origin "${DEPLOY_BRANCH}"
  git -C "${REPO_DIR}" checkout "${DEPLOY_BRANCH}"
  git -C "${REPO_DIR}" pull origin "${DEPLOY_BRANCH}"
else
  echo "==> Cloning repo to ${REPO_DIR} (branch: ${DEPLOY_BRANCH})"
  echo "    Private repo: you must be signed in to GitHub in Cloud Shell (gh auth login or git credentials)."
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
