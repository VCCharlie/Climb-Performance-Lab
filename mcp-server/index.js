#!/usr/bin/env node

/**
 * Strava MCP Server for Climb Performance Lab
 * 
 * This MCP server allows Gemini and other AI assistants to access Strava activity data
 * through the Model Context Protocol. It provides secure OAuth authentication and
 * activity fetching capabilities.
 */

/* eslint-env node */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const TOKEN_FILE = path.join(__dirname, '.strava-tokens.json');

// Token management
let tokens = null;

/**
 * Load saved tokens from file
 */
function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = fs.readFileSync(TOKEN_FILE, 'utf8');
      tokens = JSON.parse(data);
      console.error('[Strava MCP] Loaded saved tokens');
      return true;
    }
  } catch (error) {
    console.error('[Strava MCP] Error loading tokens:', error.message);
  }
  return false;
}

/**
 * Save tokens to file
 */
function saveTokens(tokenData) {
  try {
    tokens = tokenData;
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
    console.error('[Strava MCP] Tokens saved');
  } catch (error) {
    console.error('[Strava MCP] Error saving tokens:', error.message);
  }
}

/**
 * Refresh access token if expired
 */
async function refreshAccessToken() {
  if (!tokens || !tokens.refresh_token) {
    throw new Error('No refresh token available. Please authenticate first.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at && tokens.expires_at > now + 300) {
    // Token still valid for at least 5 minutes
    return tokens.access_token;
  }

  console.error('[Strava MCP] Refreshing access token...');
  
  const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  saveTokens(data);
  console.error('[Strava MCP] Token refreshed successfully');
  
  return data.access_token;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCode(code) {
  console.error('[Strava MCP] Exchanging authorization code for tokens...');
  
  const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  saveTokens(data);
  console.error('[Strava MCP] Authentication successful!');
  
  return data;
}

/**
 * Fetch activities from Strava API
 */
async function fetchActivities(startDate, endDate, page = 1, perPage = 200) {
  const accessToken = await refreshAccessToken();
  
  const startTimestamp = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : undefined;
  const endTimestamp = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : undefined;
  
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  
  if (startTimestamp) params.append('after', startTimestamp.toString());
  if (endTimestamp) params.append('before', endTimestamp.toString());
  
  const url = `https://www.strava.com/api/v3/athlete/activities?${params}`;
  console.error(`[Strava MCP] Fetching activities from: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.status} ${response.statusText}`);
  }

  const activities = await response.json();
  console.error(`[Strava MCP] Fetched ${activities.length} activities`);
  
  return activities;
}

/**
 * Fetch detailed activity information
 */
async function fetchActivityDetail(activityId) {
  const accessToken = await refreshAccessToken();
  
  const url = `https://www.strava.com/api/v3/activities/${activityId}`;
  console.error(`[Strava MCP] Fetching activity detail: ${activityId}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch activity detail: ${response.status} ${response.statusText}`);
  }

  const activity = await response.json();
  return activity;
}

/**
 * Transform Strava activity to Climb Performance Lab format
 */
function transformActivity(stravaActivity) {
  return {
    id: `strava_${stravaActivity.id}`,
    date: stravaActivity.start_date,
    type: stravaActivity.type === 'VirtualRide' ? 'VirtualRide' : 'Ride',
    title: stravaActivity.name,
    moving_time: stravaActivity.moving_time,
    distance: (stravaActivity.distance / 1000).toFixed(2), // meters to km
    climbing: stravaActivity.total_elevation_gain || 0,
    avg_speed: stravaActivity.average_speed ? (stravaActivity.average_speed * 3.6).toFixed(1) : 0, // m/s to km/h
    avg_power: stravaActivity.average_watts || 0,
    norm_power: stravaActivity.weighted_average_watts || 0,
    load: stravaActivity.suffer_score || 0,
    rpe: Math.round((stravaActivity.suffer_score || 0) / 10), // Rough RPE estimation
    max_hr: stravaActivity.max_heartrate || 0,
    avg_hr: stravaActivity.average_heartrate || 0,
  };
}

/**
 * Get athlete profile
 */
async function getAthleteProfile() {
  const accessToken = await refreshAccessToken();
  
  const response = await fetch('https://www.strava.com/api/v3/athlete', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch athlete profile: ${response.status}`);
  }

  return await response.json();
}

// Initialize MCP Server
const server = new Server(
  {
    name: 'strava-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool: Authenticate with Strava
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'strava_authenticate',
        description: 'Start OAuth authentication flow with Strava. Returns authorization URL that user must visit.',
        inputSchema: {
          type: 'object',
          properties: {
            redirect_uri: {
              type: 'string',
              description: 'Redirect URI registered with your Strava app',
              default: 'http://localhost:3000/auth/strava/callback',
            },
          },
        },
      },
      {
        name: 'strava_exchange_code',
        description: 'Exchange authorization code for access tokens after user authorization',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Authorization code from Strava OAuth callback',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'strava_get_activities',
        description: 'Fetch activities from Strava within a date range. Returns activities in Climb Performance Lab format.',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
              default: 1,
            },
            per_page: {
              type: 'number',
              description: 'Activities per page (max: 200, default: 200)',
              default: 200,
            },
          },
        },
      },
      {
        name: 'strava_get_activity_detail',
        description: 'Get detailed information about a specific activity',
        inputSchema: {
          type: 'object',
          properties: {
            activity_id: {
              type: 'string',
              description: 'Strava activity ID',
            },
          },
          required: ['activity_id'],
        },
      },
      {
        name: 'strava_get_athlete',
        description: 'Get authenticated athlete profile information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'strava_check_auth',
        description: 'Check if user is authenticated and tokens are valid',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'strava_authenticate': {
        const redirectUri = args.redirect_uri || 'http://localhost:3000/auth/strava/callback';
        const scope = 'read,activity:read_all,profile:read_all';
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=auto`;
        
        return {
          content: [
            {
              type: 'text',
              text: `Please visit this URL to authorize:\n\n${authUrl}\n\nAfter authorization, you'll be redirected with a 'code' parameter. Use that with the strava_exchange_code tool.`,
            },
          ],
        };
      }

      case 'strava_exchange_code': {
        if (!args.code) {
          throw new Error('Authorization code is required');
        }
        
        const tokenData = await exchangeCode(args.code);
        
        return {
          content: [
            {
              type: 'text',
              text: `Authentication successful! Token saved.\nAthlete: ${tokenData.athlete?.firstname} ${tokenData.athlete?.lastname}\nYou can now use other Strava tools.`,
            },
          ],
        };
      }

      case 'strava_get_activities': {
        if (!tokens) {
          throw new Error('Not authenticated. Please authenticate first using strava_authenticate.');
        }
        
        const activities = await fetchActivities(
          args.start_date,
          args.end_date,
          args.page || 1,
          args.per_page || 200
        );
        
        const transformed = activities.map(transformActivity);
        
        return {
          content: [
            {
              type: 'text',
              text: `Found ${transformed.length} activities:\n\n${JSON.stringify(transformed, null, 2)}`,
            },
          ],
        };
      }

      case 'strava_get_activity_detail': {
        if (!tokens) {
          throw new Error('Not authenticated. Please authenticate first.');
        }
        
        if (!args.activity_id) {
          throw new Error('activity_id is required');
        }
        
        const detail = await fetchActivityDetail(args.activity_id);
        const transformed = transformActivity(detail);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(transformed, null, 2),
            },
          ],
        };
      }

      case 'strava_get_athlete': {
        if (!tokens) {
          throw new Error('Not authenticated. Please authenticate first.');
        }
        
        const athlete = await getAthleteProfile();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(athlete, null, 2),
            },
          ],
        };
      }

      case 'strava_check_auth': {
        if (!tokens) {
          return {
            content: [
              {
                type: 'text',
                text: 'Not authenticated. Please use strava_authenticate to start authentication.',
              },
            ],
          };
        }
        
        try {
          await refreshAccessToken();
          return {
            content: [
              {
                type: 'text',
                text: 'Authenticated and token is valid.',
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Token invalid or expired: ${error.message}`,
              },
            ],
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  console.error('[Strava MCP] Starting server...');
  
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    console.error('[Strava MCP] ERROR: Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET');
    console.error('[Strava MCP] Please set these in your .env file');
    process.exit(1);
  }
  
  // Load existing tokens
  loadTokens();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('[Strava MCP] Server running on stdio');
  console.error('[Strava MCP] Ready to receive requests');
}

main().catch((error) => {
  console.error('[Strava MCP] Fatal error:', error);
  process.exit(1);
});
