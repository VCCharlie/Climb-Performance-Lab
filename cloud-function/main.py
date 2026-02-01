"""
Cloud Function: sync-intervals
Fetches activities from Intervals.icu API and transforms them for Climb Performance Lab.

Credentials can be provided via:
1. Google Cloud Secret Manager (recommended, more secure)
2. Request body (fallback for multi-user scenarios)

Deploy to Google Cloud Run Functions:
    gcloud functions deploy sync-intervals \
        --gen2 \
        --runtime python312 \
        --trigger-http \
        --allow-unauthenticated \
        --region europe-west1 \
        --entry-point sync_intervals \
        --set-secrets 'INTERVALS_ATHLETE_ID=intervals-athlete-id:latest,INTERVALS_API_KEY=intervals-api-key:latest'
"""

import functions_framework
from flask import jsonify
import requests
from datetime import datetime
import base64
import os


def get_credentials_from_secrets():
    """
    Retrieve credentials from Google Cloud Secret Manager via environment variables.
    Returns (athlete_id, api_key) or (None, None) if not configured.
    """
    athlete_id = os.environ.get("INTERVALS_ATHLETE_ID")
    api_key = os.environ.get("INTERVALS_API_KEY")
    return athlete_id, api_key


def get_intervals_activities(athlete_id: str, api_key: str, start_date: str, end_date: str) -> list:
    """
    Fetch activities from Intervals.icu API.

    API Docs: https://intervals.icu/api/v1/docs
    """
    url = f"https://intervals.icu/api/v1/athlete/{athlete_id}/activities"

    # Basic auth: API key as password, empty username
    auth_string = f"API_KEY:{api_key}"
    auth_bytes = base64.b64encode(auth_string.encode()).decode()

    headers = {
        "Authorization": f"Basic {auth_bytes}",
        "Accept": "application/json"
    }

    params = {
        "oldest": start_date,
        "newest": end_date
    }

    response = requests.get(url, headers=headers, params=params, timeout=30)
    response.raise_for_status()

    return response.json()


def transform_activity(activity: dict) -> dict:
    """
    Transform Intervals.icu activity to Climb Performance Lab format.

    Handles both outdoor and INDOOR activities correctly.
    Indoor activities have different field availability.
    """
    # Basic fields
    activity_id = activity.get("id", "")
    activity_type = activity.get("type", "Ride")
    name = activity.get("name", "Untitled")

    # Date handling
    start_date = activity.get("start_date_local", activity.get("start_date", ""))
    if start_date:
        # Parse ISO format and convert to YYYY-MM-DD
        try:
            dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            date_str = dt.strftime("%Y-%m-%d")
        except:
            date_str = start_date[:10] if len(start_date) >= 10 else start_date
    else:
        date_str = datetime.now().strftime("%Y-%m-%d")

    # Time - Intervals uses seconds
    moving_time = activity.get("moving_time", 0) or 0
    elapsed_time = activity.get("elapsed_time", 0) or 0
    # Use moving_time, fallback to elapsed_time
    time_seconds = moving_time if moving_time > 0 else elapsed_time

    # Distance - Intervals returns meters, we need km
    # For indoor: check icu_distance (from trainer) or distance
    distance_m = (
        activity.get("icu_distance") or  # Indoor trainer distance
        activity.get("distance") or       # Outdoor GPS distance
        0
    )
    distance_km = distance_m / 1000 if distance_m else 0

    # Elevation - Indoor rides typically have no elevation
    # Check multiple fields
    elevation = (
        activity.get("total_elevation_gain") or
        activity.get("icu_elevation_gain") or
        activity.get("elevation_gain") or
        0
    )

    # Speed - Calculate if not provided
    avg_speed = activity.get("average_speed", 0) or 0  # m/s from API
    if avg_speed:
        avg_speed_kmh = avg_speed * 3.6  # Convert m/s to km/h
    elif distance_km > 0 and time_seconds > 0:
        avg_speed_kmh = distance_km / (time_seconds / 3600)
    else:
        avg_speed_kmh = 0

    # Power - Critical for indoor rides!
    # Intervals.icu uses different field names
    avg_power = (
        activity.get("icu_average_watts") or      # Primary field
        activity.get("average_watts") or          # Alternative
        activity.get("weighted_average_watts") or # Fallback
        0
    )

    # Normalized Power (NP)
    norm_power = (
        activity.get("icu_weighted_avg_watts") or  # Intervals NP field
        activity.get("weighted_average_watts") or
        activity.get("np") or
        avg_power  # Fallback to avg power
    )

    # Training Load (TSS equivalent)
    load = (
        activity.get("icu_training_load") or
        activity.get("training_load") or
        activity.get("suffer_score") or
        0
    )

    # RPE (Rate of Perceived Exertion)
    rpe = activity.get("icu_rpe") or activity.get("feel") or None

    # Power curve bests (if available)
    best_5min = activity.get("icu_power_5min") or activity.get("w5min") or 0
    best_20min = activity.get("icu_power_20min") or activity.get("w20min") or 0
    best_60min = activity.get("icu_power_60min") or activity.get("w60min") or 0

    # Determine activity type with virtual detection
    final_type = determine_activity_type(activity_type, name)

    return {
        "id": str(activity_id),
        "date": date_str,
        "type": final_type,
        "title": name,
        "moving_time": int(time_seconds),
        "distance": round(distance_km, 2),
        "climbing": int(elevation),
        "avg_speed": round(avg_speed_kmh, 1),
        "avg_power": int(avg_power),
        "norm_power": int(norm_power),
        "load": int(load),
        "rpe": rpe,
        "best_5min": int(best_5min),
        "best_20min": int(best_20min),
        "best_60min": int(best_60min),
    }


def determine_activity_type(api_type: str, title: str) -> str:
    """
    Determine activity type, detecting virtual/indoor rides from title keywords.
    """
    clean_type = api_type.replace(" ", "") if api_type else "Ride"

    # Direct type mappings
    type_lower = clean_type.lower()
    if type_lower == "virtualride":
        return "VirtualRide"
    if type_lower == "run":
        return "Run"
    if type_lower == "walk":
        return "Walk"
    if type_lower == "hike":
        return "Hike"
    if type_lower in ("gravelride", "gravel"):
        return "GravelRide"
    if type_lower in ("mountainbikeride", "mtb"):
        return "MountainBikeRide"
    if type_lower in ("ebikeride", "ebike"):
        return "EBikeRide"

    # Check title for virtual/indoor keywords
    title_lower = (title or "").lower()
    virtual_keywords = [
        "virtual", "indoor", "trainer",
        "zwift", "watopia", "makuri", "richmond", "london", "innsbruck",
        "yorkshire", "bologna", "crit city", "scotland", "neokyo", "france", "paris",
        "mywhoosh", "rouvy", "fulgaz", "bkool", "rgt", "indievelo", "kinomap",
        "tacx", "trainerroad", "sufferfest", "systm", "wahoo"
    ]

    if any(keyword in title_lower for keyword in virtual_keywords):
        return "VirtualRide"

    return "Ride"


@functions_framework.http
def sync_intervals(request):
    """
    HTTP Cloud Function entry point.

    Credentials are loaded from Google Cloud Secret Manager (environment variables).
    If not configured, falls back to credentials in request body.

    Expects POST with JSON body:
    {
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "sport_types": ["Ride", "VirtualRide"],  // optional filter
        "athlete_id": "i12345",                   // optional, overrides secret
        "api_key": "your-api-key"                 // optional, overrides secret
    }

    Returns: JSON array of transformed activities
    """
    # Handle CORS preflight
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "3600",
        }
        return ("", 204, headers)

    # CORS headers for actual request
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
    }

    try:
        # Parse request
        request_json = request.get_json(silent=True) or {}

        # Get credentials: prefer secrets, fallback to request body
        secret_athlete_id, secret_api_key = get_credentials_from_secrets()

        athlete_id = secret_athlete_id or request_json.get("athlete_id")
        api_key = secret_api_key or request_json.get("api_key")

        # Get date range from request
        start_date = request_json.get("start_date")
        end_date = request_json.get("end_date")
        sport_types = request_json.get("sport_types", [])

        # Validate required fields
        if not athlete_id or not api_key:
            return (jsonify({
                "error": "Missing credentials. Configure secrets in Google Cloud or provide athlete_id/api_key in request.",
                "hint": "Set INTERVALS_ATHLETE_ID and INTERVALS_API_KEY secrets in Cloud Run"
            }), 400, cors_headers)

        if not start_date or not end_date:
            return (jsonify({"error": "Missing start_date or end_date"}), 400, cors_headers)

        # Fetch from Intervals.icu
        raw_activities = get_intervals_activities(athlete_id, api_key, start_date, end_date)

        # Transform activities
        transformed = [transform_activity(act) for act in raw_activities]

        # Filter by sport type if specified
        if sport_types:
            transformed = [act for act in transformed if act["type"] in sport_types]

        # Filter out activities with no meaningful data
        # Keep activities that have either distance OR moving_time OR power
        transformed = [
            act for act in transformed
            if act["distance"] > 0 or act["moving_time"] > 0 or act["avg_power"] > 0
        ]

        return (jsonify(transformed), 200, cors_headers)

    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code if e.response else 500
        if status_code == 401:
            error_msg = "Invalid API credentials. Check your Athlete ID and API Key."
        elif status_code == 403:
            error_msg = "Access forbidden. Verify your API key permissions."
        elif status_code == 404:
            error_msg = "Athlete not found. Check your Athlete ID."
        else:
            error_msg = f"Intervals.icu API error: {str(e)}"
        return (jsonify({"error": error_msg}), status_code, cors_headers)

    except requests.exceptions.Timeout:
        return (jsonify({"error": "Request timed out. Please try again."}), 504, cors_headers)

    except requests.exceptions.RequestException as e:
        return (jsonify({"error": f"Network error: {str(e)}"}), 502, cors_headers)

    except Exception as e:
        return (jsonify({"error": f"Server error: {str(e)}"}), 500, cors_headers)
