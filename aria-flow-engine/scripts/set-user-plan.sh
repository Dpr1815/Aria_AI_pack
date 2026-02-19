#!/usr/bin/env bash
#
# Update a user's plan in the database.
#
# Usage:
#   ./scripts/set-user-plan.sh
#
# Requires: mongosh (MongoDB Shell)
# Reads DATABASE_URI and DATABASE_NAME from .env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found at $ENV_FILE"
  exit 1
fi

DATABASE_URI=$(grep -E '^DATABASE_URI=' "$ENV_FILE" | cut -d '=' -f2-)
DATABASE_NAME=$(grep -E '^DATABASE_NAME=' "$ENV_FILE" | cut -d '=' -f2-)

if [ -z "$DATABASE_URI" ] || [ -z "$DATABASE_NAME" ]; then
  echo "Error: DATABASE_URI or DATABASE_NAME not set in .env"
  exit 1
fi

VALID_PLANS=("plan_free" "plan_starter" "plan_advanced")

read -rp "Enter user email: " EMAIL

if [ -z "$EMAIL" ]; then
  echo "Error: email cannot be empty"
  exit 1
fi

echo ""
echo "Available plans:"
echo "  1) plan_free"
echo "  2) plan_starter"
echo "  3) plan_advanced"
echo ""
read -rp "Select plan (1-3): " CHOICE

case "$CHOICE" in
  1) PLAN="plan_free" ;;
  2) PLAN="plan_starter" ;;
  3) PLAN="plan_advanced" ;;
  *)
    echo "Error: invalid choice"
    exit 1
    ;;
esac

echo ""
echo "Updating user '$EMAIL' to plan '$PLAN'..."

RESULT=$(mongosh "$DATABASE_URI/$DATABASE_NAME" --quiet --eval "
  const result = db.users.updateOne(
    { email: '$EMAIL' },
    { \$set: { planId: '$PLAN', updatedAt: new Date() } }
  );
  printjson(result);
")

if echo "$RESULT" | grep -q 'matchedCount.*1'; then
  echo "Done. User plan updated to '$PLAN'."
else
  echo "Error: no user found with email '$EMAIL'."
  exit 1
fi
