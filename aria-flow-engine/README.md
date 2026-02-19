# Aria Flow Engine

TypeScript backend service for managing conversational AI agents. Built with Express, MongoDB, OpenAI and Google Cloud Storage.

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **MongoDB** running locally or a remote URI
- **OpenAI API key**
- **Google Cloud Storage** bucket + service account credentials (for file uploads)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
PORT=8080
NODE_ENV=development

# MongoDB
DATABASE_URI=mongodb://localhost:27017
DATABASE_NAME=aria_ai

# Authentication (JWT Secrets)
ACCESS_TOKEN_SECRET=your-access-secret
REFRESH_TOKEN_SECRET=your-refresh-secret
SESSION_TOKEN_SECRET=your-session-secret
SERVICE_TOKEN_SECRET=your-service-secret

# OpenAI
OPENAI_API_KEY=sk-your-key

# Google Cloud Storage
GCS_BUCKET_NAME=your-bucket
GCS_KEY_FILE_PATH=./credentials/service-account.json
GCS_SIGNED_URL_EXPIRY_SECONDS=604800
GCS_MAX_FILE_SIZE_BYTES=52428800

# Redis (cache / rate-limiting)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
# Optional
LOG_LEVEL=info
```

### 3. Generate JWT secrets

Run the script to generate cryptographically secure secrets for all four JWT tokens:

```bash
npx ts-node scripts/generate-jwt-secrets.ts
```

Copy the output values into your `.env`.

### 4. Generate the service token

The `aria-ws-engine` uses a long-lived service token (valid for 1 year) to authenticate against this API. Make sure your `.env` is configured with the JWT secrets first, then run:

```bash
npx ts-node scripts/generate-service-token.ts
```

Copy the outputted `SERVICE_TOKEN` into the `aria-ws-engine` `.env` file. Regenerate annually or whenever you rotate secrets.

### 5. GCS Credentials

Place your Google Cloud service account JSON file at `./credentials/service-account.json` (this path is git-ignored).

### 6. Run in development

```bash
npm run dev
```

The server starts on `http://localhost:<PORT>` with hot-reload enabled.

### 7. Build & run for production

```bash
npm run build
npm start
```

### 8. Docker

```bash
docker build -t aria-flow-engine .
docker run -p 8080:3000 --env-file .env aria-flow-engine
```

## Scripts

| Command                 | Description                      |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Start dev server with hot-reload |
| `npm run build`         | Compile TypeScript to `dist/`    |
| `npm start`             | Run compiled app from `dist/`    |
| `npm run lint`          | Run ESLint                       |
| `npm test`              | Run all tests                    |
| `npm run test:watch`    | Run tests in watch mode          |
| `npm run test:coverage` | Run tests with coverage report   |

## Project Structure

```
src/
├── server.ts            # Entry point & graceful shutdown
├── bootstrap.ts         # Dependency injection & app init
├── config/              # Environment config loaders
├── connectors/          # External services (DB, LLM, Storage)
├── models/              # Documents & DTOs
├── repositories/        # Data access layer
├── services/            # Business logic
├── controllers/         # Route handlers
├── routes/              # API endpoint definitions
├── middleware/           # Auth, tenant, rate limiting
├── modules/             # Steps, summaries, statistics
├── prompts/             # LLM prompt templates
├── validations/         # Zod schemas
├── constants/           # Enums & constants
└── utils/               # Helpers
```

## API Overview

All authenticated routes live under `/api`. A public `/health` endpoint is available for readiness checks.

Key route groups: users, organizations, agents, sessions, conversations, participants, summaries, statistics, and categories.

## Documentation

In-depth guides are available in the [`docs/`](docs/) folder:

- [**Architecture**](docs/Architecture.md) — system design, tech stack, data models, and dependency injection
- [**Auth & Tenancy**](docs/Auth_and_tenancy.md) — JWT authentication, multi-tenancy, and RBAC
- [**Add a New Step**](docs/Add_new_step.md) — how to create a new conversation step type
- [**Add a New Statistic**](docs/Add_new_statistic.md) — how to add a new statistics aggregator
- [**Add a New Summary**](docs/Add_new_summary.md) — how to add a new summary template

Testing documentation is in [`tests/README.md`](tests/README.md).
