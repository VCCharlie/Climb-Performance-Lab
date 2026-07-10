"""
Server-side Strava OAuth token lifecycle for Cloud Run automation.
Tokens live in Firestore strava_tokens/automation (Admin SDK only).
"""

from __future__ import annotations

import os
import time
from typing import Any

import requests

import firebase_admin
from firebase_admin import firestore as admin_firestore

STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
STRAVA_TOKENS_DOC_PATH = "strava_tokens/automation"


class StravaTokenError(Exception):
    """Raised when Strava token operations fail."""


def _require_env(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise StravaTokenError(f"Missing required environment variable: {name}")
    return value


def _init_firebase():
    if not firebase_admin._apps:
        firebase_admin.initialize_app()


def get_firestore_client():
    _init_firebase()
    return admin_firestore.client()


def load_stored_strava_tokens(db) -> dict[str, Any] | None:
    snap = db.document(STRAVA_TOKENS_DOC_PATH).get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    if not data.get("refresh_token"):
        return None
    return data


def persist_strava_tokens(db, payload: dict[str, Any]) -> None:
    db.document(STRAVA_TOKENS_DOC_PATH).set(
        {
            "refresh_token": payload["refresh_token"],
            "access_token": payload.get("access_token"),
            "expires_at": payload.get("expires_at"),
            "athlete_id": payload.get("athlete_id"),
            "updated_at": admin_firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )


def clear_stored_strava_tokens(db) -> None:
    db.document(STRAVA_TOKENS_DOC_PATH).delete()


def exchange_authorization_code(code: str, redirect_uri: str) -> dict[str, Any]:
    client_id = _require_env("STRAVA_CLIENT_ID")
    client_secret = _require_env("STRAVA_CLIENT_SECRET")

    if not code:
        raise StravaTokenError("Missing authorization code.")

    response = requests.post(
        STRAVA_TOKEN_URL,
        json={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        },
        timeout=30,
    )

    if not response.ok:
        raise StravaTokenError(
            f"Strava authorization_code exchange failed ({response.status_code}): {response.text}"
        )

    data = response.json()
    athlete = data.get("athlete") or {}
    athlete_name = f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip() or None

    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_at": data["expires_at"],
        "athlete_id": athlete.get("id"),
        "athlete_name": athlete_name,
    }


def get_valid_strava_access_token(db) -> str:
    client_id = _require_env("STRAVA_CLIENT_ID")
    client_secret = _require_env("STRAVA_CLIENT_SECRET")

    stored = load_stored_strava_tokens(db)
    if not stored or not stored.get("refresh_token"):
        raise StravaTokenError(
            "No Strava refresh_token in Firestore (strava_tokens/automation). "
            "Connect Strava in the app Settings first."
        )

    now = int(time.time())
    access_token = stored.get("access_token")
    expires_at = stored.get("expires_at")

    if access_token and expires_at and int(expires_at) > now + 120:
        return str(access_token)

    response = requests.post(
        STRAVA_TOKEN_URL,
        json={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": stored["refresh_token"],
            "grant_type": "refresh_token",
        },
        timeout=30,
    )

    if not response.ok:
        raise StravaTokenError(
            f"Strava refresh_token grant failed ({response.status_code}): {response.text}"
        )

    data = response.json()
    persist_strava_tokens(
        db,
        {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
            "expires_at": data["expires_at"],
            "athlete_id": stored.get("athlete_id"),
        },
    )

    return str(data["access_token"])
