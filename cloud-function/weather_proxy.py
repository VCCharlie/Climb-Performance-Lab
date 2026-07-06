"""
OpenWeatherMap proxy for Climb Performance Lab.
Keeps API key server-side (OPENWEATHER_API_KEY env / Secret Manager).

Deploy:
    gcloud functions deploy openweather-proxy \\
        --gen2 \\
        --runtime python312 \\
        --trigger-http \\
        --allow-unauthenticated \\
        --region europe-west1 \\
        --entry-point openweather_proxy \\
        --set-secrets 'OPENWEATHER_API_KEY=openweather-api-key:latest' \\
        --set-env-vars ALLOWED_CORS_ORIGINS='http://localhost:5173,https://vccharlie.github.io' \\
        --source .
"""

import os
import functions_framework
from flask import jsonify
import requests

from main import resolve_cors_origin, build_cors_headers

OPENWEATHER_GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"
OPENWEATHER_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
REQUEST_TIMEOUT = 20


def get_openweather_api_key():
    return os.environ.get("OPENWEATHER_API_KEY")


def require_api_key(cors_headers):
    api_key = get_openweather_api_key()
    if not api_key:
        return None, (
            jsonify({
                "error": "OpenWeather API key not configured on server.",
                "hint": "Set OPENWEATHER_API_KEY secret when deploying openweather-proxy.",
            }),
            503,
            cors_headers,
        )
    return api_key, None


@functions_framework.http
def openweather_proxy(request):
    """Proxy geocode + current weather requests to OpenWeatherMap."""
    origin = request.headers.get("Origin")
    cors_origin = resolve_cors_origin(origin)

    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
        if cors_origin:
            headers["Access-Control-Allow-Origin"] = cors_origin
            headers["Vary"] = "Origin"
        return ("", 204, headers)

    cors_headers = build_cors_headers(cors_origin)

    try:
        request_json = request.get_json(silent=True) or {}
        action = (request_json.get("action") or "").strip().lower()

        api_key, err_response = require_api_key(cors_headers)
        if err_response:
            return err_response

        if action == "geocode":
            query = (request_json.get("query") or "").strip()
            if len(query) < 2:
                return (jsonify({"error": "query must be at least 2 characters"}), 400, cors_headers)

            limit = min(max(int(request_json.get("limit", 5)), 1), 10)
            response = requests.get(
                OPENWEATHER_GEO_URL,
                params={"q": query, "limit": limit, "appid": api_key},
                timeout=REQUEST_TIMEOUT,
            )
            if not response.ok:
                return (
                    jsonify({"error": _openweather_error_message(response)}),
                    response.status_code,
                    cors_headers,
                )
            return (jsonify(response.json()), 200, cors_headers)

        if action == "weather":
            params = {"appid": api_key, "units": "metric"}
            lat = request_json.get("lat")
            lon = request_json.get("lon")
            city_query = (request_json.get("q") or "").strip()

            if lat is not None and lon is not None:
                params["lat"] = lat
                params["lon"] = lon
            elif city_query:
                params["q"] = city_query
            else:
                return (jsonify({"error": "Provide lat/lon or q for weather lookup"}), 400, cors_headers)

            response = requests.get(
                OPENWEATHER_WEATHER_URL,
                params=params,
                timeout=REQUEST_TIMEOUT,
            )
            if not response.ok:
                return (
                    jsonify({"error": _openweather_error_message(response)}),
                    response.status_code,
                    cors_headers,
                )
            return (jsonify(response.json()), 200, cors_headers)

        return (jsonify({"error": "Unknown action. Use geocode or weather."}), 400, cors_headers)

    except requests.exceptions.Timeout:
        return (jsonify({"error": "OpenWeather request timed out."}), 504, cors_headers)

    except requests.exceptions.RequestException as e:
        return (jsonify({"error": f"Network error: {str(e)}"}), 502, cors_headers)

    except Exception as e:
        return (jsonify({"error": f"Server error: {str(e)}"}), 500, cors_headers)


def _openweather_error_message(response):
    try:
        body = response.json()
        if isinstance(body, dict) and body.get("message"):
            return body["message"]
    except (ValueError, TypeError):
        pass
    if response.status_code == 401:
        return "Invalid OpenWeather API key on server."
    if response.status_code == 404:
        return "Location not found."
    return f"OpenWeather error ({response.status_code})"
