#!/bin/sh
# One login and one database per service; CONNECT is revoked from PUBLIC.
# Runs in a subshell so `set -eu` stays local if the entrypoint sources this file.
(
set -eu

: "${DOCTOR_DB_PASSWORD:?DOCTOR_DB_PASSWORD must be set}"
: "${PATIENT_DB_PASSWORD:?PATIENT_DB_PASSWORD must be set}"
: "${APPOINTMENT_DB_PASSWORD:?APPOINTMENT_DB_PASSWORD must be set}"

# Passwords are passed as psql variables, not interpolated into the SQL.
psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    -v doctor_pw="$DOCTOR_DB_PASSWORD" \
    -v patient_pw="$PATIENT_DB_PASSWORD" \
    -v appointment_pw="$APPOINTMENT_DB_PASSWORD" <<'EOSQL'
CREATE USER doctor_service WITH PASSWORD :'doctor_pw';
CREATE USER patient_service WITH PASSWORD :'patient_pw';
CREATE USER appointment_service WITH PASSWORD :'appointment_pw';

CREATE DATABASE doctors OWNER doctor_service;
CREATE DATABASE patients OWNER patient_service;
CREATE DATABASE appointments OWNER appointment_service;

REVOKE ALL ON DATABASE doctors FROM PUBLIC;
REVOKE ALL ON DATABASE patients FROM PUBLIC;
REVOKE ALL ON DATABASE appointments FROM PUBLIC;
EOSQL
)
