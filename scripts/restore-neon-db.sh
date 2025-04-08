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

# Determine which database URL to use
DB_URL="${NEON_DATABASE_URL:-$DATABASE_URL}" # Use NEON_DATABASE_URL if set, otherwise fallback to DATABASE_URL

# Check if database URL is set
if [[ -z "$DB_URL" ]]; then
  echo "Error: Database connection URL not found."
  echo "Please ensure NEON_DATABASE_URL or DATABASE_URL is defined in your .env file or system environment."
  exit 1 # Exit with error status
fi

# Check if psql command exists
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    echo "On macOS with Homebrew: brew install libpq"
    echo "On Debian/Ubuntu: sudo apt-get update && sudo apt-get install postgresql-client"
    exit 1
fi

# Check if a backup file path was provided as an argument
if [[ -z "$1" ]]; then
  echo "Usage: $0 <path_to_backup.sql>"
  echo "Example: $0 db_backups/backup_YYYYMMDD_HHMMSS_branchname.sql"
  exit 1
fi

BACKUP_FILE="$1"

# Check if the backup file exists
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Error: Backup file not found at '$BACKUP_FILE'"
  exit 1
fi

echo "--- Attempting to restore database from '$BACKUP_FILE' ---"
echo "Target Database URL: $DB_URL" # Be cautious about logging full URLs if sensitive

# Confirmation prompt (optional but recommended)
read -p "WARNING: This will overwrite the current database. Are you sure? (y/N) " -n 1 -r
echo # Move to a new line
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Restore cancelled."
    exit 1
fi

# Execute the restore command using psql
# -v ON_ERROR_STOP=1 : Stop script execution if any SQL error occurs
# -f "$BACKUP_FILE" : Execute the SQL commands from the backup file
# -q : Quiet mode (optional, reduces psql output)
# We connect directly using the URL
echo "Running psql restore command..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$BACKUP_FILE"

# Check the exit status of the psql command
RESTORE_STATUS=$?
if [ $RESTORE_STATUS -ne 0 ]; then
  echo "❌ Error: Database restore failed (psql exit code: $RESTORE_STATUS)."
  exit 1 # Exit with error status
else
  echo "✅ Database restore successful from '$BACKUP_FILE'."
  exit 0 # Exit successfully
fi
