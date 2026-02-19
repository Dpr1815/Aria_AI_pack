#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

FLOW_ENV="$PROJECT_ROOT/aria-flow-engine/.env"
WS_ENV="$PROJECT_ROOT/aria-ws-engine/.env"

# Read a variable value from a .env file
read_env() {
  local file="$1" var="$2"
  grep -E "^${var}=" "$file" | cut -d'=' -f2- | tr -d "'" | tr -d '"'
}

# Transform local paths/hosts to Docker equivalents
to_docker_uri() { echo "$1" | sed "s|localhost|${2}|"; }
to_docker_path() { echo "$1" | sed "s|^\./|/app/|"; }

# --- Ports ---
export FLOW_PORT=$(read_env "$FLOW_ENV" "PORT")
export WS_PORT=$(read_env "$WS_ENV" "PORT")

# --- Database URIs: localhost → mongo ---
export FLOW_DATABASE_URI=$(to_docker_uri "$(read_env "$FLOW_ENV" "DATABASE_URI")" "mongo")
export WS_DATABASE_URI=$(to_docker_uri "$(read_env "$WS_ENV" "DATABASE_URI")" "mongo")

# --- Redis URIs: localhost → redis ---
export FLOW_REDIS_URL=$(to_docker_uri "$(read_env "$FLOW_ENV" "REDIS_URL")" "redis")
export WS_REDIS_URL=$(to_docker_uri "$(read_env "$WS_ENV" "REDIS_URL")" "redis")

# --- API URL: localhost → aria-flow-engine ---
export WS_API_SERVER_URL="http://aria-flow-engine:${FLOW_PORT}"

# --- Credential paths: ./ → /app/ ---
export FLOW_GCS_KEY_FILE_PATH=$(to_docker_path "$(read_env "$FLOW_ENV" "GCS_KEY_FILE_PATH")")
export WS_GCS_KEY_FILE_PATH=$(to_docker_path "$(read_env "$WS_ENV" "GCS_KEY_FILE_PATH")")

echo "Aria services:"
echo "  aria-flow-engine → port $FLOW_PORT"
echo "  aria-ws-engine   → port $WS_PORT"
echo "  aria-frontend    → port 3000"

# Default to "up -d" if no arguments provided
if [ $# -eq 0 ]; then
  set -- up -d
fi

docker compose \
  -f "$SCRIPT_DIR/docker-compose.yml" \
  --project-directory "$SCRIPT_DIR" \
  "$@"
