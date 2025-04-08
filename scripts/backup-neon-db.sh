#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR=$(dirname "$0")
# Go up one level to the project root
PROJECT_ROOT="$SCRIPT_DIR/.."

# Load environment variables from .env file if it exists
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  # Use 'source' or '.' to load variables into the current shell session
  # Handle potential errors during sourcing
  set -a # Automatically export all variables
  source "$ENV_FILE" || echo "Warning: Could not source $ENV_FILE"
  set +a # Stop automatically exporting variables
fi

# Check if NEON_DATABASE_URL is set
if [ -z "$NEON_DATABASE_URL" ]; then
  echo "Error: NEON_DATABASE_URL environment variable is not set."
  echo "Please ensure it is defined in your .env file or system environment."
  exit 1 # Exit with error status
fi

# Create a timestamped backup file name
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$PROJECT_ROOT/db_backups"
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Ensure the backup directory exists
mkdir -p "$BACKUP_DIR"

echo "Attempting Neon database backup to $BACKUP_FILE..."

# Define the explicit path to pg_dump v17
PG_DUMP_CMD="/usr/lib/postgresql/17/bin/pg_dump"

# Check if the command exists
if [ ! -x "$PG_DUMP_CMD" ]; then
  echo "Error: pg_dump command not found at $PG_DUMP_CMD. Trying default pg_dump..."
  PG_DUMP_CMD="pg_dump" # Fallback to default if specific version not found
fi

# Run the export using the determined pg_dump command
# Use quotes around the URL to handle special characters
# Add --no-password to prevent prompts if password is in the URL (common for Neon)
"$PG_DUMP_CMD" "$NEON_DATABASE_URL" --no-password > "$BACKUP_FILE"

# Check the exit status of the pg_dump command
if [ $? -eq 0 ]; then
  echo "✅ Database backup successful: $BACKUP_FILE"
  exit 0 # Exit successfully
else
  echo "❌ Error: Database backup failed."
  # Optional: remove the potentially incomplete backup file
  rm "$BACKUP_FILE" 2>/dev/null
  exit 1 # Exit with error status
fi
