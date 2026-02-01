# Intervals.icu Sync Cloud Function

Python Cloud Function to fetch activities from Intervals.icu and transform them for Climb Performance Lab.

## Features

- Fetches activities from Intervals.icu API
- Properly handles **indoor/virtual activities** (trainer rides, Zwift, etc.)
- Maps all relevant fields including power data
- Filters by date range and activity type
- CORS enabled for browser requests

## Deployment to Google Cloud

### Prerequisites

1. Google Cloud account with billing enabled
2. `gcloud` CLI installed and authenticated
3. A Google Cloud project

### Deploy Steps

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Deploy the function
gcloud functions deploy sync-intervals \
    --gen2 \
    --runtime python312 \
    --trigger-http \
    --allow-unauthenticated \
    --region europe-west1 \
    --entry-point sync_intervals \
    --source .

# Note the URL in the output, it will look like:
# https://sync-intervals-XXXXX.europe-west1.run.app
```

### Update Frontend URL

After deployment, update the URL in `src/components/DataHub.jsx`:

```javascript
const CLOUD_SYNC_URL = "https://YOUR-FUNCTION-URL.run.app";
```

## API Reference

### Request

**POST** to your function URL

```json
{
    "athlete_id": "i12345",
    "api_key": "your-intervals-api-key",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "sport_types": ["Ride", "VirtualRide"]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `athlete_id` | Yes | Your Intervals.icu athlete ID (e.g., `i12345`) |
| `api_key` | Yes | Your Intervals.icu API key |
| `start_date` | Yes | Start date (YYYY-MM-DD) |
| `end_date` | Yes | End date (YYYY-MM-DD) |
| `sport_types` | No | Filter by activity types |

### Response

```json
[
    {
        "id": "i12345_abc123",
        "date": "2024-06-15",
        "type": "VirtualRide",
        "title": "Zwift - Watopia Flat Route",
        "moving_time": 3600,
        "distance": 45.2,
        "climbing": 0,
        "avg_speed": 32.5,
        "avg_power": 220,
        "norm_power": 235,
        "load": 85,
        "rpe": 7,
        "best_5min": 280,
        "best_20min": 250,
        "best_60min": 220
    }
]
```

## Getting Your Intervals.icu Credentials

1. Go to [intervals.icu](https://intervals.icu)
2. Click your profile icon -> **Settings**
3. Scroll to **Developer Settings**
4. Your **Athlete ID** is shown (format: `i12345`)
5. Click **Create API Key** to generate a key

## Troubleshooting

### Indoor activities showing empty data

The function now properly handles indoor activities by checking multiple field sources:

- `icu_distance` (trainer-reported distance)
- `icu_average_watts` (power from trainer)
- `icu_weighted_avg_watts` (Normalized Power)

### 401 Unauthorized

- Verify your API key is correct
- Check if the API key has read permissions
- Ensure athlete ID format is correct (starts with `i`)

### No activities returned

- Check date range includes activities
- Verify sport type filters aren't excluding all results
- Indoor rides are included by default

## Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
functions-framework --target=sync_intervals --debug

# Test with curl
curl -X POST http://localhost:8080 \
    -H "Content-Type: application/json" \
    -d '{
        "athlete_id": "i12345",
        "api_key": "your-key",
        "start_date": "2024-01-01",
        "end_date": "2024-12-31"
    }'
```
