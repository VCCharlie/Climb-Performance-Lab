# Climb Performance Lab

A React-based web application for cycling performance analysis, focused on climbing metrics and training optimization.

## Features

- **Physics-Based Calculations**: Climb time/power estimation using Newton-Raphson solver
- **Training Data Integration**: 
  - CSV import
  - Intervals.icu sync
  - **NEW: Strava integration via MCP** 🎉
- **Performance Visualization**: Track climbing performance trends
- **Race Planning**: Nutrition and fueling strategy calculator
- **Cloud Sync**: Firebase integration for data backup

## Tech Stack

- React 19.2.3 + Vite
- Firebase/Firestore for cloud storage
- Tailwind CSS for styling
- Recharts for data visualization
- Model Context Protocol (MCP) for AI assistant integration

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

### 3. Build for Production

```bash
npm run build
```

## 🆕 Strava Integration with MCP

This project now includes an **MCP (Model Context Protocol) server** that allows AI assistants like **Gemini** and **Claude** to access your Strava data securely.

### What is MCP?

MCP is a standardized protocol that enables AI assistants to interact with external data sources and tools. With our Strava MCP server, you can:

- Ask AI to fetch your Strava activities
- Analyze training data through conversational AI
- Import activities directly into Climb Performance Lab
- Get insights about your cycling performance

### Setup Strava MCP Server

See detailed instructions in [MCP-SETUP.md](./MCP-SETUP.md) or [mcp-server/README.md](./mcp-server/README.md).

**Quick setup:**

1. Create a Strava API application at https://www.strava.com/settings/api
2. Configure the MCP server:
   ```bash
   cd mcp-server
   npm install
   cp .env.example .env
   # Edit .env with your Strava credentials
   ```
3. Add to your AI assistant's MCP configuration (see [MCP-SETUP.md](./MCP-SETUP.md))

### Using with Gemini/Claude

Once configured, you can ask your AI assistant:

```
"Get my Strava activities from the last 3 months"
"Show me my best climbing rides this year"
"Analyze my training load from Strava"
```

The AI will use the MCP server to fetch your data securely!

## Intervals.icu Integration

The app supports syncing with Intervals.icu via a **Google Cloud Function**. This architecture provides:

- **✅ No CORS issues**: Cloud function handles API communication
- **✅ Secure credentials**: API keys stored in Google Cloud Secret Manager
- **✅ Proper data transformation**: Automatically maps all Intervals.icu fields to the app format
- **✅ Indoor/Virtual ride detection**: Properly handles Zwift, TrainerRoad, etc.

**Architecture:**
```
Frontend (React) → Cloud Function (Python) → Intervals.icu API
```

The cloud function is configured in `src/config.js`:
```javascript
export const CLOUD_SYNC_URL = "https://sync-intervals-97555677694.europe-west1.run.app";
```

For deployment and setup instructions, see [cloud-function/README.md](./cloud-function/README.md).

## Project Structure

```
├── src/
│   ├── components/        # React components
│   │   ├── DataHub.jsx   # Data import and management
│   │   ├── PhysicsEngine.jsx  # Climb calculations
│   │   └── Dashboard.jsx # Performance visualization
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services
│   └── utils/            # Utility functions
├── cloud-function/       # Intervals.icu sync (Python)
└── mcp-server/          # NEW: Strava MCP server (Node.js)
```

## Configuration

### Firebase (Optional)
For cloud sync, create a `src/firebase.js` with your Firebase credentials.

### Strava MCP
See [MCP-SETUP.md](./MCP-SETUP.md) for Strava integration setup.

### Intervals.icu
See [cloud-function/README.md](./cloud-function/README.md) for API sync setup.

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Documentation

- [MCP Setup Guide](./MCP-SETUP.md) - Configure Strava MCP for AI assistants
- [MCP Server README](./mcp-server/README.md) - Detailed MCP server documentation
- [Cloud Function Guide](./cloud-function/README.md) - Intervals.icu integration
- [CLAUDE.md](./CLAUDE.md) - AI assistant development guide
- [AGENTS.md](./AGENTS.md) - Code standards and guidelines

## License

MIT

## Contributing

Contributions are welcome! Please ensure code follows the guidelines in [AGENTS.md](./AGENTS.md).

## React + Vite Template Info

This project is built on React + Vite template with:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
