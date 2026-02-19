# Aria AI

Aria is a real-time voice AI assistant with a 3D avatar, built as a monorepo with three services orchestrated via Docker.

## Architecture

```
aria-frontend  (React 19 + Three.js)
      |
      |--- REST ---> aria-flow-engine  (Express API, auth, storage, LLM)
      |                     |
      |--- WebSocket -----> aria-ws-engine  (voice pipeline: STT -> LLM -> TTS -> lip-sync)
                            |
                      MongoDB + Redis
```

## Project Structure

| Folder                                 | Description                                                                          | README                               |
| -------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| [aria-flow-engine/](aria-flow-engine/) | REST API — authentication, conversation management, file storage, OpenAI integration | [README](aria-flow-engine/README.md) |
| [aria-ws-engine/](aria-ws-engine/)     | WebSocket server — real-time voice pipeline (STT, TTS, Rhubarb lip-sync)             | [README](aria-ws-engine/README.md)   |
| [aria-frontend/](aria-frontend/)       | React SPA — 3D avatar with morph targets, voice UI, chat interface                   | [README](aria-frontend/README.md)    |
| [docker/](docker/)                     | Docker Compose orchestration and manager script                                      | —                                    |

## Quickstart

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- An **OpenAI API key**
- A **Google Cloud service account** JSON key (for GCS storage and TTS/STT operations)

### 1. Configure each service

For each of the three services (`aria-flow-engine`, `aria-ws-engine`, `aria-frontend`), follow its README to:

1. **Copy `.env.example` to `.env`** and fill in your values (API keys, secrets, etc.)
2. **Place your GCS `service-account.json`** in the `credentials/` folder (backend services only)

```bash
# aria-flow-engine
cp aria-flow-engine/.env.example aria-flow-engine/.env
# edit aria-flow-engine/.env with your values
# place your GCS key at aria-flow-engine/credentials/service-account.json

# aria-ws-engine
cp aria-ws-engine/.env.example aria-ws-engine/.env
# edit aria-ws-engine/.env with your values
# place your GCS key at aria-ws-engine/credentials/service-account.json

# aria-frontend
cp aria-frontend/.env.example aria-frontend/.env
# edit aria-frontend/.env with your values
```

### 2. Launch everything

```bash
./docker/docker_manager.sh
```

That's it. The script starts all services (MongoDB, Redis, both backends, and the frontend). The frontend is available at **http://localhost:3000**.

> **Note:** You do NOT need to run `npm install` locally. All Dockerfiles use multi-stage builds with `npm ci` to install dependencies and compile TypeScript inside the container. Local `npm install` is only needed if you want to develop outside Docker.

### 3. Other docker commands

The manager script is a thin wrapper around `docker compose` — you can pass any Compose command:

```bash
./docker/docker_manager.sh up -d       # start in background (default)
./docker/docker_manager.sh down         # stop and remove containers
./docker/docker_manager.sh build        # rebuild images
./docker/docker_manager.sh logs -f      # follow logs
./docker/docker_manager.sh ps           # list running containers
```

## How the Docker Manager Script Works

The script at [docker/docker_manager.sh](docker/docker_manager.sh) solves a key problem: your `.env` files use `localhost` for local development, but inside Docker containers the services need to reference each other by **container name**.

Here's what it does:

1. **Reads** the `.env` files from `aria-flow-engine/` and `aria-ws-engine/`
2. **Transforms** the values for Docker networking:
   - `mongodb://localhost:27017` becomes `mongodb://mongo:27017`
   - `redis://localhost:6379` becomes `redis://redis:6379`
   - `http://localhost:8080` (API URL) becomes `http://aria-flow-engine:<port>`
   - `./credentials/...` becomes `/app/credentials/...`
3. **Exports** those transformed values as environment variables
4. **Runs** `docker compose` with the transformed environment

This means you maintain a **single `.env` file per service** that works for both local development and Docker — no need for separate Docker-specific env files.

### Service Ports

| Service          | Container Port              | Host Port |
| ---------------- | --------------------------- | --------- |
| aria-flow-engine | `$FLOW_PORT` (default 8080) | same      |
| aria-ws-engine   | `$WS_PORT` (default 5000)   | same      |
| aria-frontend    | 80 (nginx)                  | 3000      |
| MongoDB          | 27017                       | 27017     |
| Redis            | 6379                        | 6379      |
