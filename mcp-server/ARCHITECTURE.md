# Strava MCP Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Assistants Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Gemini     │  │    Claude    │  │    Other     │      │
│  │   (Google)   │  │  (Anthropic) │  │  MCP Clients │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
└─────────┼─────────────────┼──────────────────┼───────────────┘
          │                 │                  │
          │   Model Context Protocol (MCP)    │
          │                 │                  │
          └─────────────────┼──────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────┐
│              Strava MCP Server (Node.js)                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  MCP Protocol Handler                                 │ │
│  │  - Tool registration                                  │ │
│  │  - Request/response handling                          │ │
│  │  - Stdio transport                                    │ │
│  └────────────────────┬──────────────────────────────────┘ │
│                       │                                     │
│  ┌────────────────────▼──────────────────────────────────┐ │
│  │  Strava Integration Layer                             │ │
│  │  - OAuth 2.0 authentication                           │ │
│  │  - Token management & refresh                         │ │
│  │  - Activity fetching                                  │ │
│  │  - Data transformation                                │ │
│  └────────────────────┬──────────────────────────────────┘ │
│                       │                                     │
│  ┌────────────────────▼──────────────────────────────────┐ │
│  │  Local Storage                                        │ │
│  │  - .strava-tokens.json (OAuth tokens)                │ │
│  │  - .env (API credentials)                            │ │
│  └───────────────────────────────────────────────────────┘ │
└───────────────────────────┬───────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            │
┌───────────────────────────▼───────────────────────────────┐
│                  Strava API (strava.com)                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  - GET /api/v3/athlete/activities                    │ │
│  │  - GET /api/v3/activities/{id}                       │ │
│  │  - GET /api/v3/athlete                               │ │
│  │  - POST /api/v3/oauth/token                          │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Authentication Flow

```
User → AI Assistant → MCP Server → Strava OAuth
                                      ↓
User authorizes in browser ← ← ← ← ← ←
                                      ↓
Authorization code → AI → MCP Server → Strava API
                                      ↓
                     Access Token ← ← ←
                                      ↓
                  Saved to .strava-tokens.json
```

### 2. Activity Fetch Flow

```
AI Assistant Request
    ↓
"Get my activities from 2024-01-01 to 2024-12-31"
    ↓
MCP Server validates token
    ↓
Token expired? → Refresh token → Update storage
    ↓
Fetch from Strava API
    ↓
Transform to Climb Performance Lab format
    ↓
Return to AI Assistant
    ↓
User receives formatted activity data
```

## MCP Tools Available

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `strava_authenticate` | Start OAuth flow | redirect_uri (optional) | Authorization URL |
| `strava_exchange_code` | Exchange auth code | code | Success message |
| `strava_get_activities` | Fetch activities | start_date, end_date, page, per_page | Activity list (JSON) |
| `strava_get_activity_detail` | Get single activity | activity_id | Activity detail (JSON) |
| `strava_get_athlete` | Get profile | none | Athlete profile (JSON) |
| `strava_check_auth` | Verify auth status | none | Status message |

## Security Model

### Credential Storage
- **Client ID & Secret**: Stored in `.env` (never committed)
- **Access Tokens**: Stored in `.strava-tokens.json` (gitignored)
- **Refresh Tokens**: Automatically used to renew access tokens

### OAuth Flow
1. User explicitly authorizes in browser
2. Authorization code exchanged for tokens
3. Tokens stored locally and encrypted by OS
4. MCP server never exposes credentials to AI

### Token Lifecycle
```
Initial Auth → Access Token (6 hours)
                    ↓
            Automatically refreshed
                    ↓
            Refresh Token (never expires unless revoked)
```

## Integration Points

### With Climb Performance Lab App
```
Strava MCP Server
    ↓
Fetch activities (via AI)
    ↓
Save JSON output
    ↓
Import via DataHub CSV/JSON import
    ↓
Activities added to local database
    ↓
Synced to Firebase (optional)
```

### With AI Assistants

**Claude Desktop**
- Direct integration via stdio
- Tool calls through native MCP support

**Gemini (Google AI)**
- Via MCP bridge or custom integration
- Tool calls through MCP proxy

**Other AI Systems**
- Any MCP-compatible client
- Standard stdio MCP protocol

## Performance Considerations

- **Rate Limits**: Strava allows 200 requests per 15 minutes
- **Batch Fetching**: Up to 200 activities per request
- **Token Caching**: Tokens refreshed only when needed
- **Data Transformation**: Lightweight, in-memory processing

## Future Enhancements

- [ ] Direct integration button in DataHub UI
- [ ] Automatic activity import without AI intermediary
- [ ] Real-time webhook support for new activities
- [ ] Support for segments and detailed streams
- [ ] Multi-user authentication management
- [ ] Cloud deployment option (as serverless function)
