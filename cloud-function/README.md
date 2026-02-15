# Intervals.icu Sync Cloud Function

Python Cloud Function to fetch activities from Intervals.icu and transform them for Climb Performance Lab.

## Features

- Fetches activities from Intervals.icu API
- Properly handles **indoor/virtual activities** (trainer rides, Zwift, etc.)
- Maps all relevant fields including power data
- Filters by date range and activity type
- **Secure credential storage** via Google Cloud Secret Manager
- CORS enabled for browser requests

## Deployment to Google Cloud

### Prerequisites

1. Google Cloud account with billing enabled
2. `gcloud` CLI installed and authenticated
3. A Google Cloud project

### Step 1: Create Secrets

Store your Intervals.icu credentials securely in Secret Manager:

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Create the secrets
echo -n "i12345" | gcloud secrets create intervals-athlete-id --data-file=-
echo -n "your-api-key-here" | gcloud secrets create intervals-api-key --data-file=-
```

To update secrets later:
```bash
echo -n "new-value" | gcloud secrets versions add intervals-athlete-id --data-file=-
```

### Step 2: Deploy the Function

```bash
# Deploy with secrets attached
gcloud functions deploy sync-intervals \
    --gen2 \
    --runtime python312 \
    --trigger-http \
    --allow-unauthenticated \
    --region europe-west1 \
    --entry-point sync_intervals \
    --set-secrets 'INTERVALS_ATHLETE_ID=intervals-athlete-id:latest,INTERVALS_API_KEY=intervals-api-key:latest' \
    --source .
```

Note the URL in the output:
```
https://sync-intervals-XXXXX.europe-west1.run.app
```

### Step 3: Update Frontend URL

The cloud function URL is already configured in `src/config.js`:

```javascript
export const CLOUD_SYNC_URL = "https://sync-intervals-97555677694.europe-west1.run.app";
```

If you deploy to a different URL, update this constant.

## API Reference

### Request

**POST** to your function URL

```json
{
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "sport_types": ["Ride", "VirtualRide"]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `start_date` | Yes | Start date (YYYY-MM-DD) |
| `end_date` | Yes | End date (YYYY-MM-DD) |
| `sport_types` | No | Filter by activity types |
| `athlete_id` | No | Override secret (for multi-user) |
| `api_key` | No | Override secret (for multi-user) |

**Note:** If secrets are configured, you don't need to send `athlete_id` or `api_key` in the request.

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
        "avg_hr": 145,
        "max_hr": 175,
        "work": 792,
        "load": 85,
        "rpe": 7,
        "best_1min": 320,
        "best_5min": 280,
        "best_10min": 265,
        "best_20min": 250,
        "best_60min": 220,
        "eFTP": 245
    }
]
```

## Getting Your Intervals.icu Credentials

1. Go to [intervals.icu](https://intervals.icu)
2. Click your profile icon → **Settings**
3. Scroll to **Developer Settings**
4. Your **Athlete ID** is shown (format: `i12345`)
5. Click **Create API Key** to generate a key

## Architecture

```
┌─────────────┐     POST        ┌──────────────────┐     API      ┌───────────────┐
│   Browser   │ ───────────────▸│  Cloud Function  │─────────────▸│ Intervals.icu │
│  (DataHub)  │  dates/filters  │   (Python)       │  Basic Auth  │     API       │
└─────────────┘                 └──────────────────┘              └───────────────┘
                                        │
                                        │ reads
                                        ▼
                                ┌──────────────────┐
                                │  Secret Manager  │
                                │  - athlete_id    │
                                │  - api_key       │
                                └──────────────────┘
```

## Troubleshooting

### Indoor activities showing empty data

The function now properly handles indoor activities by checking multiple field sources:

- `icu_distance` (trainer-reported distance)
- `icu_average_watts` (power from trainer)
- `icu_weighted_avg_watts` (Normalized Power)

### 401 Unauthorized

- Verify your API key is correct in Secret Manager
- Check if the API key has read permissions
- Ensure athlete ID format is correct (starts with `i`)

### Missing credentials error

If you see "Missing credentials" error:
```bash
# Verify secrets exist
gcloud secrets list

# Check function has access to secrets
gcloud functions describe sync-intervals --region europe-west1
```

### No activities returned

- Check date range includes activities
- Verify sport type filters aren't excluding all results
- Indoor rides are included by default

## Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables for local testing
export INTERVALS_ATHLETE_ID="i12345"
export INTERVALS_API_KEY="your-key"

# Run locally
functions-framework --target=sync_intervals --debug

# Test with curl
curl -X POST http://localhost:8080 \
    -H "Content-Type: application/json" \
    -d '{
        "start_date": "2024-01-01",
        "end_date": "2024-12-31"
    }'
```

## Security Notes

- **Never commit API keys** to version control
- Secrets are stored encrypted in Google Cloud
- The function URL is public but credentials are server-side
- Consider adding authentication if deploying for multiple users
