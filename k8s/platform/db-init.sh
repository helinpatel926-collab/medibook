#!/bin/sh
# Waits for PostgreSQL, then runs db-init.sql as the RDS admin user.
# Connection settings come from the PG* environment variables (libpq).
set -eu

: "${PGHOST:?PGHOST must be set}"
: "${PGUSER:?PGUSER must be set}"
: "${PGPASSWORD:?PGPASSWORD must be set}"
: "${DOCTOR_DB_PASSWORD:?DOCTOR_DB_PASSWORD must be set}"
: "${PATIENT_DB_PASSWORD:?PATIENT_DB_PASSWORD must be set}"
: "${APPOINTMENT_DB_PASSWORD:?APPOINTMENT_DB_PASSWORD must be set}"

max_attempts=60
attempt=1
until pg_isready --quiet --timeout=5; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "PostgreSQL at ${PGHOST}:${PGPORT:-5432} is not ready after ${max_attempts} attempts." >&2
    exit 1
  fi
  echo "Waiting for PostgreSQL at ${PGHOST}:${PGPORT:-5432} (attempt ${attempt}/${max_attempts})..."
  attempt=$((attempt + 1))
  sleep 5
done

# The SQL file reads the service passwords with \getenv, so they never appear on a command line.
exec psql --no-psqlrc --quiet --set ON_ERROR_STOP=1 --file "$(dirname "$0")/db-init.sql"
