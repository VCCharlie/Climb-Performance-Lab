#!/usr/bin/env bash
# Disable Cloud Build auto-deploy for strava-oauth (keeps the Cloud Run service running).
#
# Run in Google Cloud Shell:
#   bash scripts/disableStravaOAuthCloudBuildTrigger.sh
#
# The service itself is NOT removed — only the GitHub → Cloud Build → deploy hook stops.
# Deploy Python changes manually: bash scripts/deployStravaOAuthCloudShell.sh
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-climb-performance-lab}"
TRIGGER_ID="${TRIGGER_ID:-}"

echo "==> Project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

echo ""
echo "==> Cloud Build triggers (strava-oauth / cloudbuild.strava-oauth.yaml):"
gcloud builds triggers list \
  --project="${PROJECT_ID}" \
  --format='table(id,name,filename,disabled,createTime.date())' \
  | grep -E 'strava-oauth|cloudbuild.strava-oauth|ID|NAME' || true

if [ -z "${TRIGGER_ID}" ]; then
  TRIGGER_ID="$(gcloud builds triggers list \
    --project="${PROJECT_ID}" \
    --filter='filename:cloudbuild.strava-oauth.yaml' \
    --format='value(id)' \
    | head -1)"
fi

if [ -z "${TRIGGER_ID}" ]; then
  echo ""
  echo "No trigger found for cloudbuild.strava-oauth.yaml."
  echo "Either continuous deployment is already off, or the trigger was removed."
  exit 0
fi

echo ""
echo "==> Disabling trigger: ${TRIGGER_ID}"
gcloud builds triggers update "${TRIGGER_ID}" \
  --project="${PROJECT_ID}" \
  --disabled

echo ""
echo "Done."
echo "  - strava-oauth on Cloud Run: still running (unchanged)"
echo "  - Auto-deploy on push to main: OFF"
echo "  - Next Python deploy: bash scripts/deployStravaOAuthCloudShell.sh"
