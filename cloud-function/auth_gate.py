"""
Sentinel Phase 4.2 — authenticate HTTP requests to sync-intervals.

Accepts either:
  - Authorization: Bearer <Firebase ID token> (signed-in app users)
  - X-Automation-Secret: <shared secret> (GitHub Actions nightly sync only)
"""
import os

import firebase_admin
from firebase_admin import auth as firebase_auth

AUTOMATION_HEADER = "X-Automation-Secret"


def _init_firebase():
    if not firebase_admin._apps:
        firebase_admin.initialize_app()


def is_automation_request(request) -> bool:
    """True when a valid automation shared secret was sent (server-side cron)."""
    expected = (os.environ.get("AUTOMATION_SHARED_SECRET") or "").strip()
    if not expected:
        return False
    provided = (request.headers.get(AUTOMATION_HEADER) or "").strip()
    return bool(provided) and provided == expected


def verify_firebase_bearer(request) -> bool:
    auth_header = request.headers.get("Authorization") or ""
    if not auth_header.startswith("Bearer "):
        return False
    token = auth_header[7:].strip()
    if not token:
        return False
    try:
        _init_firebase()
        firebase_auth.verify_id_token(token)
        return True
    except Exception:
        return False


def authorize_sync_request(request):
    """
    @returns (authorized: bool, error_body: dict | None, status: int | None)
    """
    if is_automation_request(request):
        return True, None, None
    if verify_firebase_bearer(request):
        return True, None, None
    return False, {
        "error": "Unauthorized. Sign in to Climb Lab or use a valid automation credential.",
    }, 401


def resolve_intervals_credentials(request_json: dict, request, *, allow_body_credentials: bool):
    """
    Load Intervals.icu credentials from secrets. Body overrides only for automation calls.
    """
    secret_athlete_id, secret_api_key = _get_credentials_from_secrets()
    if allow_body_credentials:
        athlete_id = secret_athlete_id or request_json.get("athlete_id")
        api_key = secret_api_key or request_json.get("api_key")
    else:
        athlete_id = secret_athlete_id
        api_key = secret_api_key
    return athlete_id, api_key


def _get_credentials_from_secrets():
    athlete_id = os.environ.get("INTERVALS_ATHLETE_ID")
    api_key = os.environ.get("INTERVALS_API_KEY")
    return athlete_id, api_key
