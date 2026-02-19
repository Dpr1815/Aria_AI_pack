# Aria Realtime Engine

WebSocket server that powers real-time voice conversational AI agents. Handles the full pipeline: **STT** (Google Speech-to-Text) **-> LLM** (OpenAI) **-> TTS** (Google Text-to-Speech) with optional lip sync via Rhubarb.

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **MongoDB** running locally or accessible via URI
- **Google Cloud** service account with Speech-to-Text and Text-to-Speech APIs enabled
- **OpenAI** API key
- **Rhubarb Lip Sync** binary (optional, for viseme generation)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file and fill in your values
cp .env.example .env
```

### Environment Variables

| Variable             | Description                                      |
| -------------------- | ------------------------------------------------ |
| `PORT`               | Server port (default: `3000`)                    |
| `NODE_ENV`           | `development` or `production`                    |
| `API_SERVER_URL`     | URL of the Aria Flow Engine API                  |
| `DATABASE_URI`       | MongoDB connection string                        |
| `DATABASE_NAME`      | MongoDB database name                            |
| `SESSION_JWT_SECRET` | JWT secret for session auth                      |
| `SERVICE_TOKEN`      | Service-to-service auth token                    |
| `OPENAI_API_KEY`     | OpenAI API key                                   |
| `GCS_KEY_FILE_PATH`  | Path to Google Cloud service account JSON        |
| `RHUBARB_PATH`       | Path to Rhubarb binary (optional)                |
| `MAX_RETRY_ATTEMPTS` | Retry attempts for external calls (default: `3`) |

### Run

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

### Docker

```bash
docker build -t aria-ws-engine .
docker run -p 5000:5000 --env-file .env aria-ws-engine
```

## Scripts

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `npm run dev`           | Start dev server with hot reload  |
| `npm run build`         | Compile TypeScript to `dist/`     |
| `npm start`             | Run compiled production build     |
| `npm test`              | Run test suite                    |
| `npm run test:watch`    | Run tests in watch mode           |
| `npm run test:coverage` | Run tests with coverage report    |
| `npm run lint`          | Lint source files                 |
| `npm run lint:fix`      | Lint and auto-fix                 |
| `npm run format`        | Format source files with Prettier |

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **WebSocket**: ws
- **HTTP**: Express
- **Database**: MongoDB (native driver)
- **STT**: Google Cloud Speech-to-Text (streaming)
- **TTS**: Google Cloud Text-to-Speech
- **LLM**: OpenAI API
- **Lip Sync**: Rhubarb (audio -> visemes)
- **Validation**: Zod
- **Logging**: Pino
- **Testing**: Jest

## Documentation

Detailed architecture and design docs live in the [`docs/`](docs/) folder:

- [Architecture Guide](docs/Architecture.md) — Project structure, startup flow, connection lifecycle, file responsibilities, data flows
- [WebSocket API Reference](docs/WebSocket_API.md) — All message types, payloads, response delivery flow, action types
- [Speech Pipeline Architecture](docs/Speech_pipeline_architecture.md) — STT -> LLM -> TTS concurrency strategy
- [Session Concurrency Mutex](docs/Session_concurrency_mutex.md) — Keyed async mutex for session state safety
- [Add a New Handler](docs/Add_new_handler.md) — How to add a new WebSocket message type
- [Add a New Action](docs/Add_new_action.md) — How to add a new LLM-triggered action
- [Add a New Step](docs/Add_new_step.md) — How to add a new conversation step
