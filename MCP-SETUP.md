# MCP Configuration for Gemini/Claude

This file provides example configurations for connecting AI assistants to the Strava MCP server.

## For Claude Desktop

Create or edit: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "strava": {
      "command": "node",
      "args": ["/absolute/path/to/Climb-Performance-Lab/mcp-server/index.js"],
      "env": {
        "STRAVA_CLIENT_ID": "your_strava_client_id",
        "STRAVA_CLIENT_SECRET": "your_strava_client_secret"
      }
    }
  }
}
```

## For Gemini Code Assist

If you're using Gemini with an MCP bridge (like `mcp-bridge` or custom integration):

```json
{
  "servers": {
    "strava-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/Climb-Performance-Lab/mcp-server/index.js"],
      "env": {
        "STRAVA_CLIENT_ID": "your_strava_client_id",
        "STRAVA_CLIENT_SECRET": "your_strava_client_secret"
      }
    }
  }
}
```

## For Google AI Studio / Gemini API

Google AI Studio doesn't natively support MCP servers yet. However, you can use:

1. **MCP Bridge** - A proxy service that exposes MCP servers as REST APIs
2. **Custom Integration** - Call the MCP server programmatically via stdio

### Using MCP Bridge

Install an MCP bridge:
```bash
npm install -g @modelcontextprotocol/bridge
```

Then configure your bridge to expose the Strava MCP server as an API endpoint.

## Environment Variables

Replace these placeholders with your actual values:

- `your_strava_client_id` - From your Strava API application
- `your_strava_client_secret` - From your Strava API application
- `/absolute/path/to/` - The full path to your Climb Performance Lab directory

## Verification

After configuring, restart your AI assistant and verify the MCP server is loaded:

### Claude Desktop
- Look for "strava" in the available tools/integrations
- It should appear in the tools menu

### Gemini
- Depends on your MCP bridge setup
- Check bridge logs to verify server is connected

## Security Notes

⚠️ **Important**: Never commit files containing your actual API credentials!

The MCP server will:
1. Store tokens securely in `.strava-tokens.json` (gitignored)
2. Automatically refresh expired tokens
3. Use environment variables for credentials

## Need Help?

See the full setup guide in `mcp-server/README.md`
