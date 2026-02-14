# Strava MCP Server

Model Context Protocol (MCP) server for accessing Strava activity data in Climb Performance Lab. This server enables AI assistants like Gemini, Claude, and others to fetch and analyze your Strava cycling activities through a standardized protocol.

## Features

- 🔐 **Secure OAuth Authentication** - OAuth 2.0 flow with Strava
- 📊 **Activity Fetching** - Retrieve activities with date range filtering
- 🚴 **Cycling-Focused** - Optimized for cycling performance data
- 🔄 **Auto Token Refresh** - Handles token expiration automatically
- 📦 **MCP Compatible** - Works with any MCP-compatible AI assistant
- 🎯 **Performance Lab Format** - Outputs data in Climb Performance Lab format

## Prerequisites

1. **Node.js** v18 or higher
2. **Strava API Application** - You need to create an app on Strava

## Setup Instructions

### Step 1: Create a Strava API Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Click **"Create an App"** (or use an existing one)
3. Fill in the details:
   - **Application Name**: "Climb Performance Lab MCP"
   - **Category**: Choose appropriate category
   - **Website**: Your website or `http://localhost:3000`
   - **Authorization Callback Domain**: `localhost` (for local dev)
4. Click **"Create"**
5. Note your **Client ID** and **Client Secret**

### Step 2: Configure the MCP Server

1. Navigate to the MCP server directory:
   ```bash
   cd mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your Strava credentials:
   ```
   STRAVA_CLIENT_ID=your_actual_client_id
   STRAVA_CLIENT_SECRET=your_actual_client_secret
   ```

### Step 3: Configure MCP Client (Gemini/Claude Desktop)

#### For Claude Desktop

Add this to your Claude Desktop MCP configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "strava": {
      "command": "node",
      "args": ["/absolute/path/to/Climb-Performance-Lab/mcp-server/index.js"],
      "env": {
        "STRAVA_CLIENT_ID": "your_client_id",
        "STRAVA_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

#### For Gemini (via Google AI Studio or MCP Bridge)

If using an MCP bridge for Gemini:

```json
{
  "servers": {
    "strava-mcp": {
      "command": "node",
      "args": ["/path/to/mcp-server/index.js"],
      "env": {
        "STRAVA_CLIENT_ID": "your_client_id",
        "STRAVA_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

### Step 4: Test the Server

You can test the server locally:

```bash
npm start
```

The server runs on stdio (standard input/output) and communicates using the MCP protocol.

## Usage with AI Assistants

Once configured, you can ask your AI assistant to:

### Authenticate

```
Please authenticate with Strava
```

The AI will call the `strava_authenticate` tool and provide you with an authorization URL. Visit that URL, authorize the app, and you'll be redirected with a code.

Then tell the AI:

```
Use this authorization code: <your_code_here>
```

### Fetch Activities

```
Get my Strava activities from 2024-01-01 to 2024-12-31
```

```
Show me my cycling activities from the last 3 months
```

### Get Activity Details

```
Get details for Strava activity ID 12345678
```

### Check Authentication Status

```
Check if I'm authenticated with Strava
```

## Available MCP Tools

| Tool Name | Description |
|-----------|-------------|
| `strava_authenticate` | Generate OAuth URL for user authorization |
| `strava_exchange_code` | Exchange auth code for access tokens |
| `strava_get_activities` | Fetch activities with date filtering |
| `strava_get_activity_detail` | Get detailed info for a specific activity |
| `strava_get_athlete` | Get athlete profile information |
| `strava_check_auth` | Verify authentication status |

## Data Format

Activities are transformed to match Climb Performance Lab format:

```json
{
  "id": "strava_12345678",
  "date": "2024-06-15T10:30:00Z",
  "type": "Ride",
  "title": "Morning Climb",
  "moving_time": 3600,
  "distance": "45.20",
  "climbing": 850,
  "avg_speed": "32.5",
  "avg_power": 220,
  "norm_power": 235,
  "load": 85,
  "rpe": 7,
  "max_hr": 175,
  "avg_hr": 145
}
```

## Security Notes

- **Never commit `.env` file** - It contains your secrets
- **Token storage** - Tokens are stored in `.strava-tokens.json` (gitignored)
- **Automatic refresh** - Access tokens are automatically refreshed when needed
- **OAuth scopes** - Requests read-only access to activities and profile

## Troubleshooting

### "Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET"

Make sure you have:
1. Created a `.env` file in the `mcp-server` directory
2. Added your actual Strava credentials
3. No extra spaces or quotes around values

### "Not authenticated" errors

Run the authentication flow:
1. Ask AI to authenticate with Strava
2. Visit the authorization URL
3. Copy the code from the redirect URL
4. Give the code to the AI to exchange for tokens

### Token refresh fails

If tokens become invalid:
1. Delete `.strava-tokens.json`
2. Re-authenticate from scratch
3. Check that your Strava app is still active

### "Authorization callback domain" error

Make sure your Strava app's callback domain matches your redirect URI:
- For local development: Use `localhost` as the callback domain
- Update redirect URI in authentication requests if needed

## API Rate Limits

Strava API has rate limits:
- **200 requests per 15 minutes**
- **2,000 requests per day**

The MCP server respects these limits. Fetching activities in batches (up to 200 per request) is most efficient.

## Development

To work on the server:

```bash
# Watch mode (auto-restart on changes)
npm run dev

# Standard mode
npm start
```

## Integration with Climb Performance Lab

The MCP server outputs activities in a format compatible with Climb Performance Lab's data structure. You can:

1. Fetch activities via the AI assistant
2. Copy the JSON output
3. Save as a file
4. Import into Climb Performance Lab via the Import tab

Or integrate directly by adding a "Sync from Strava" button in the DataHub component that calls this MCP server.

## License

MIT

## Support

For issues related to:
- **MCP Server**: Open an issue in this repository
- **Strava API**: Check [Strava Developer Docs](https://developers.strava.com/)
- **MCP Protocol**: Check [Model Context Protocol](https://modelcontextprotocol.io/)
