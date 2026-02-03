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


def safe_int(val, default=0):
    """Safely convert value to int, handling None and invalid values."""
    if val is None:
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def safe_float(val, default=0.0):
    """Safely convert value to float, handling None and invalid values."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def get_first_valid(*values, default=0):
    """Return the first non-None, non-zero value from the list."""
    for val in values:
        if val is not None and val != 0 and val != "":
            return val
    return default


def transform_activity(activity: dict) -> dict:
    """
    Transform Intervals.icu activity to Climb Performance Lab format.

    ROBUST VERSION - Based on actual Intervals.icu API field names:
    ['id', 'start_date_local', 'type', 'name', 'distance', 'icu_distance',
     'moving_time', 'elapsed_time', 'total_elevation_gain', 'average_speed',
     'icu_average_watts', 'icu_weighted_avg_watts', 'icu_training_load',
     'icu_rpe', 'perceived_exertion', 'feel', 'trainer',
     'Best1minpower', 'Best5minpower', 'Best10minpower', 'Best20minpower', 'Best60minpower']
    """
    # === BASIC FIELDS ===
    activity_id = activity.get("id", "")
    activity_type = activity.get("type", "Ride")
    name = activity.get("name", "") or activity.get("title", "") or "Untitled"
    is_indoor = activity.get("trainer", False)

    # === DATE HANDLING ===
    start_date = activity.get("start_date_local") or activity.get("start_date", "")
    if start_date:
        try:
            # Handle ISO format with timezone
            dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            date_str = dt.strftime("%Y-%m-%d")
        except (ValueError, AttributeError):
            # Fallback: extract first 10 characters if date-like
            date_str = start_date[:10] if len(str(start_date)) >= 10 else str(start_date)
    else:
        date_str = datetime.now().strftime("%Y-%m-%d")

    # === TIME (seconds) ===
    moving_time = safe_int(activity.get("moving_time"))
    elapsed_time = safe_int(activity.get("elapsed_time"))
    recording_time = safe_int(activity.get("icu_recording_time"))
    time_seconds = get_first_valid(moving_time, elapsed_time, recording_time, default=0)

    # === DISTANCE (API returns meters, we need km) ===
    # Indoor rides: prefer icu_distance (trainer-reported)
    # Outdoor rides: prefer distance (GPS)
    if is_indoor:
        distance_m = get_first_valid(
            activity.get("icu_distance"),
            activity.get("distance"),
            default=0
        )
    else:
        distance_m = get_first_valid(
            activity.get("distance"),
            activity.get("icu_distance"),
            default=0
        )
    distance_km = safe_float(distance_m) / 1000 if distance_m else 0

    # === ELEVATION (meters) ===
    elevation = safe_int(get_first_valid(
        activity.get("total_elevation_gain"),
        activity.get("total_elevation_loss"),  # Fallback if only loss recorded
        activity.get("icu_elevation_gain"),
        default=0
    ))

    # === SPEED (API returns m/s, we need km/h) ===
    avg_speed_ms = safe_float(activity.get("average_speed"))
    if avg_speed_ms > 0:
        avg_speed_kmh = avg_speed_ms * 3.6
    elif distance_km > 0 and time_seconds > 0:
        # Calculate from distance/time
        avg_speed_kmh = distance_km / (time_seconds / 3600)
    else:
        avg_speed_kmh = 0

    # === POWER (watts) ===
    # Average Power - multiple possible field names
    avg_power = safe_int(get_first_valid(
        activity.get("icu_average_watts"),       # Primary Intervals.icu field
        activity.get("average_watts"),           # Alternative
        activity.get("weighted_average_watts"),  # Fallback
        default=0
    ))

    # Normalized Power (NP) / Weighted Average
    norm_power = safe_int(get_first_valid(
        activity.get("icu_weighted_avg_watts"),  # Primary Intervals.icu NP field
        activity.get("weighted_avg_watts"),
        activity.get("np"),
        activity.get("normalized_power"),
        default=0
    ))
    # If NP is 0 but we have avg power, use avg power as fallback
    if norm_power == 0 and avg_power > 0:
        norm_power = avg_power

    # === TRAINING LOAD (TSS equivalent) ===
    load = safe_int(get_first_valid(
        activity.get("icu_training_load"),
        activity.get("training_load"),
        activity.get("power_load"),
        activity.get("trimp"),  # HR-based load as fallback
        default=0
    ))

    # === RPE (Rate of Perceived Exertion, 1-10) ===
    rpe = get_first_valid(
        activity.get("icu_rpe"),
        activity.get("perceived_exertion"),
        activity.get("feel"),
        activity.get("session_rpe"),
        default=None
    )
    # Ensure RPE is in valid range
    if rpe is not None:
        rpe = safe_int(rpe)
        if rpe < 1 or rpe > 10:
            rpe = None

    # === POWER CURVE BESTS (PascalCase field names from API!) ===
    # Intervals.icu uses: Best1minpower, Best5minpower, Best10minpower, Best20minpower, Best60minpower
    best_1min = safe_int(get_first_valid(
        activity.get("Best1minpower"),
        activity.get("best_1min_power"),
        activity.get("w1min"),
        default=0
    ))
    best_5min = safe_int(get_first_valid(
        activity.get("Best5minpower"),
        activity.get("best_5min_power"),
        activity.get("icu_power_5min"),
        activity.get("w5min"),
        default=0
    ))
    best_10min = safe_int(get_first_valid(
        activity.get("Best10minpower"),
        activity.get("best_10min_power"),
        activity.get("w10min"),
        default=0
    ))
    best_20min = safe_int(get_first_valid(
        activity.get("Best20minpower"),
        activity.get("best_20min_power"),
        activity.get("icu_power_20min"),
        activity.get("w20min"),
        default=0
    ))
    best_60min = safe_int(get_first_valid(
        activity.get("Best60minpower"),
        activity.get("best_60min_power"),
        activity.get("icu_power_60min"),
        activity.get("w60min"),
        default=0
    ))

    # === ACTIVITY TYPE DETECTION ===
    # Check trainer flag and title keywords for virtual detection
    final_type = determine_activity_type(activity_type, name, is_indoor)

    return {
        "id": str(activity_id),
        "date": date_str,
        "type": final_type,
        "title": name,
        "moving_time": int(time_seconds),
        "distance": round(distance_km, 2),
        "climbing": int(elevation),
        "avg_speed": round(avg_speed_kmh, 1),
        "avg_power": avg_power,
        "norm_power": norm_power,
        "load": load,
        "rpe": rpe,
        "best_1min": best_1min,
        "best_5min": best_5min,
        "best_10min": best_10min,
        "best_20min": best_20min,
        "best_60min": best_60min,
    }


def determine_activity_type(api_type: str, title: str, is_indoor: bool = False) -> str:
    """
    Determine activity type, detecting virtual/indoor rides from:
    1. API type field
    2. Trainer flag (is_indoor)
    3. Title keywords
    """
    clean_type = (api_type or "").replace(" ", "")
    type_lower = clean_type.lower()

    # Direct type mappings from API
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
    if type_lower == "swim":
        return "Swim"
    if type_lower == "weighttraining":
        return "WeightTraining"

    # If trainer flag is set, it's a virtual/indoor ride
    if is_indoor and type_lower in ("ride", "cycling", ""):
        return "VirtualRide"

    # Check title for virtual/indoor keywords
    title_lower = (title or "").lower()
    virtual_keywords = [
        "virtual", "indoor", "trainer",
        "zwift", "watopia", "makuri", "richmond", "london", "innsbruck",
        "yorkshire", "bologna", "crit city", "scotland", "neokyo", "france", "paris",
        "mywhoosh", "rouvy", "fulgaz", "bkool", "rgt", "indievelo", "kinomap",
        "tacx", "trainerroad", "sufferfest", "systm", "wahoo", "kickr"
    ]

    if any(keyword in title_lower for keyword in virtual_keywords):
        return "VirtualRide"

    # Default for bike types
    if type_lower in ("ride", "cycling", ""):
        return "Ride"

    # Return cleaned type with proper casing if unknown
    return clean_type if clean_type else "Ride"


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
        "api_key": "your-api-key",                // optional, overrides secret
        "debug": false                            // optional, enables debug logging
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
        debug_mode = request_json.get("debug", False)

        # Get credentials: prefer secrets, fallback to request body
        secret_athlete_id, secret_api_key = get_credentials_from_secrets()

        athlete_id = secret_athlete_id or request_json.get("athlete_id")
        api_key = secret_api_key or request_json.get("api_key")

        # Get date range from request
        start_date = request_json.get("start_date")
        end_date = request_json.get("end_date")
        sport_types = request_json.get("sport_types", [])

        if debug_mode:
            print(f"[DEBUG] Request: start={start_date}, end={end_date}, types={sport_types}")
            print(f"[DEBUG] Using credentials: athlete_id={'*' * len(athlete_id) if athlete_id else 'None'}")

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

        if debug_mode:
            print(f"[DEBUG] Fetched {len(raw_activities)} activities from Intervals.icu")
            if raw_activities:
                # Log available fields from first activity
                first_activity = raw_activities[0]
                print(f"[DEBUG] Available fields: {list(first_activity.keys())}")
                # Log sample values for key fields
                key_fields = [
                    "id", "name", "type", "trainer", "distance", "icu_distance",
                    "moving_time", "icu_average_watts", "icu_weighted_avg_watts",
                    "icu_training_load", "Best5minpower", "Best20minpower"
                ]
                print(f"[DEBUG] Sample activity values:")
                for field in key_fields:
                    val = first_activity.get(field)
                    print(f"  {field}: {val}")

        # Transform activities
        transformed = [transform_activity(act) for act in raw_activities]

        if debug_mode:
            print(f"[DEBUG] Transformed {len(transformed)} activities")
            if transformed:
                print(f"[DEBUG] First transformed activity: {transformed[0]}")

        # Filter by sport type if specified
        if sport_types:
            before_filter = len(transformed)
            transformed = [act for act in transformed if act["type"] in sport_types]
            if debug_mode:
                print(f"[DEBUG] Sport filter: {before_filter} -> {len(transformed)} activities")

        # Filter out activities with no meaningful data
        # Keep activities that have either distance OR moving_time OR power
        before_filter = len(transformed)
        transformed = [
            act for act in transformed
            if act["distance"] > 0 or act["moving_time"] > 0 or act["avg_power"] > 0
        ]
        if debug_mode:
            print(f"[DEBUG] Data filter: {before_filter} -> {len(transformed)} activities")

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
