#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR=$(dirname "$0")
# Go up one level to the project root
PROJECT_ROOT="$SCRIPT_DIR/.."

# Load environment variables from .env file if it exists
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  # Use 'source' or '.' to load variables into the current shell session
  set -a # Automatically export all variables
  source "$ENV_FILE" || echo "Warning: Could not source $ENV_FILE"
  set +a # Stop automatically exporting variables
fi

# Check required env vars
if [[ -z "$NEON_API_KEY" || -z "$NEON_PROJECT_ID" || -z "$NEON_BRANCH_ID" ]]; then
  echo "Error: Missing Neon API credentials (NEON_API_KEY, NEON_PROJECT_ID, NEON_BRANCH_ID)."
  echo "Please ensure they are defined in your .env file."
  exit 1 # Exit with error status
fi

# Generate a timestamp for the snapshot name
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
SNAPSHOT_NAME="git-push-snapshot-$TIMESTAMP"

echo "Attempting to create Neon snapshot '$SNAPSHOT_NAME'..."

# Make API request using curl
# -s for silent mode (don't show progress)
# -X POST specifies the request method
# -H adds headers for Authorization and Content-Type
# -d provides the JSON payload
RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches/$NEON_BRANCH_ID/snapshots" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"snapshot\": {\"name\": \"$SNAPSHOT_NAME\"}}" )

# Check the HTTP response code
if [ "$RESPONSE_CODE" -ge 200 ] && [ "$RESPONSE_CODE" -lt 300 ]; then
  echo "✅ Neon snapshot request successful (HTTP $RESPONSE_CODE). Snapshot '$SNAPSHOT_NAME' is being created."
  exit 0 # Exit successfully
else
  echo "❌ Error: Neon snapshot request failed (HTTP $RESPONSE_CODE)."
  # Optionally, you could try to capture and print the response body for more details
  # RESPONSE_BODY=$(curl -s -X POST ... ) # Repeat curl command without -o /dev/null -w "%{http_code}"
  # echo "Response body: $RESPONSE_BODY"
  exit 1 # Exit with error status
fi
