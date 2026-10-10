#!/bin/sh
# Test databases for the compose "test" profile.
(
set -eu

psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    -v owner="$POSTGRES_USER" <<'EOSQL'
CREATE DATABASE doctors_test OWNER :"owner";
CREATE DATABASE patients_test OWNER :"owner";
CREATE DATABASE appointments_test OWNER :"owner";
EOSQL
)
