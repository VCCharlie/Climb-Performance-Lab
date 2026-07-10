"""
Cloud Function: strava-oauth
Secure Strava OAuth token exchange and refresh for Climb Performance Lab.

Deploy to Google Cloud Run (separate service from sync-intervals):
    gcloud run deploy strava-oauth \\
        --source cloud-function \\
        --function strava_oauth \\
        --region europe-west1 \\
        --allow-unauthenticated \\
        --set-secrets 'STRAVA_CLIENT_ID=strava-client-id:latest,STRAVA_CLIENT_SECRET=strava-client-secret:latest'

Browser clients must send Authorization: Bearer <Firebase ID token> for protected routes.
"""

import functions_framework
from flask import jsonify
import os

from auth_gate import verify_firebase_bearer, resolve_cors_origin, build_cors_headers
from strava_token_manager import (
    StravaTokenError,
    exchange_authorization_code,
    get_valid_strava_access_token,
    clear_stored_strava_tokens,
    get_firestore_client,
    persist_strava_tokens,
)


def _cors_preflight(cors_origin):
    headers = {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600",
    }
    if cors_origin:
        headers["Access-Control-Allow-Origin"] = cors_origin
        headers["Vary"] = "Origin"
    return ("", 204, headers)


def _require_firebase_auth(request, cors_headers):
    if not verify_firebase_bearer(request):
        return False, (jsonify({"error": "Unauthorized. Sign in to Climb Lab first."}), 401, cors_headers)
    return True, None


@functions_framework.http
def strava_oauth(request):
    """
    HTTP Cloud Function entry point.

    GET  ?route=config  — public Strava client_id
    POST { action: exchange, code, redirect_uri }
    POST { action: token }
    POST { action: disconnect }
    """
    origin = request.headers.get("Origin")
    cors_origin = resolve_cors_origin(origin)
    cors_headers = build_cors_headers(cors_origin)

    if request.method == "OPTIONS":
        return _cors_preflight(cors_origin)

    try:
        route = (request.args.get("route") or "").strip().lower()

        if request.method == "GET" and route == "config":
            client_id = (os.environ.get("STRAVA_CLIENT_ID") or "").strip()
            if not client_id:
                return (jsonify({"error": "STRAVA_CLIENT_ID is not configured on the server."}), 503, cors_headers)
            return (jsonify({"client_id": client_id}), 200, cors_headers)

        if request.method == "POST":
            body = request.get_json(silent=True) or {}
            action = (body.get("action") or route or "").strip().lower()

            if action == "exchange":
                ok, err_response = _require_firebase_auth(request, cors_headers)
                if not ok:
                    return err_response

                code = (body.get("code") or "").strip()
                redirect_uri = (body.get("redirect_uri") or "").strip()

                if not code or not redirect_uri:
                    return (jsonify({"error": "Missing code or redirect_uri."}), 400, cors_headers)

                token_payload = exchange_authorization_code(code, redirect_uri)
                db = get_firestore_client()
                persist_strava_tokens(db, token_payload)

                return (jsonify({
                    "athlete_id": token_payload.get("athlete_id"),
                    "athlete_name": token_payload.get("athlete_name"),
                    "expires_at": token_payload.get("expires_at"),
                }), 200, cors_headers)

            if action == "token":
                ok, err_response = _require_firebase_auth(request, cors_headers)
                if not ok:
                    return err_response

                db = get_firestore_client()
                access_token = get_valid_strava_access_token(db)
                return (jsonify({"access_token": access_token}), 200, cors_headers)

            if action == "disconnect":
                ok, err_response = _require_firebase_auth(request, cors_headers)
                if not ok:
                    return err_response

                db = get_firestore_client()
                clear_stored_strava_tokens(db)
                return (jsonify({"ok": True}), 200, cors_headers)

            return (jsonify({"error": "Unknown action. Use exchange, token, or disconnect."}), 400, cors_headers)

        return (jsonify({"error": "Not found."}), 404, cors_headers)

    except StravaTokenError as exc:
        return (jsonify({"error": str(exc)}), 400, cors_headers)
    except Exception as exc:
        return (jsonify({"error": f"Server error: {exc}"}), 500, cors_headers)
