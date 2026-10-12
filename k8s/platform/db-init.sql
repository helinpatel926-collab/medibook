-- One login and one database per service; CONNECT is revoked from PUBLIC.
-- Same result as db/init/01-create-databases.sh, but safe to run on every sync.

-- Terse error output does not echo the failing statement, which may contain a password.
\set VERBOSITY terse
\set SHOW_CONTEXT never

-- Best effort: keep a failing statement (and its password) out of the server log.
-- Only a superuser may change these settings, so a refusal is ignored.
DO $$
BEGIN
  SET log_statement = 'none';
  SET log_min_error_statement = 'panic';
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;

\getenv doctor_pw DOCTOR_DB_PASSWORD
\getenv patient_pw PATIENT_DB_PASSWORD
\getenv appointment_pw APPOINTMENT_DB_PASSWORD

-- Create each role if it is missing; otherwise reset its password to the one in Secrets Manager.
SELECT format('%s ROLE %I WITH LOGIN PASSWORD %L',
              CASE WHEN EXISTS (SELECT FROM pg_roles WHERE rolname = r.name)
                   THEN 'ALTER' ELSE 'CREATE' END,
              r.name, r.password)
FROM (VALUES ('doctor_service', :'doctor_pw'),
             ('patient_service', :'patient_pw'),
             ('appointment_service', :'appointment_pw')) AS r (name, password)
\gexec

-- On PostgreSQL 16 a CREATEROLE user that is not a superuser (the RDS master user) gets only
-- ADMIN on the roles it creates. CREATE DATABASE ... OWNER needs SET on the owner role, and
-- REVOKE on the database needs the owner's privileges (INHERIT).
SELECT format('GRANT %I TO CURRENT_USER WITH INHERIT TRUE, SET TRUE', r.name)
FROM (VALUES ('doctor_service'), ('patient_service'), ('appointment_service')) AS r (name)
WHERE NOT (pg_has_role(current_user, r.name, 'SET')
           AND pg_has_role(current_user, r.name, 'USAGE'))
\gexec

-- CREATE DATABASE cannot run inside a DO block, so the statements are generated and run with \gexec.
SELECT format('CREATE DATABASE %I OWNER %I', d.name, d.owner)
FROM (VALUES ('doctors', 'doctor_service'),
             ('patients', 'patient_service'),
             ('appointments', 'appointment_service')) AS d (name, owner)
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = d.name)
\gexec

REVOKE ALL ON DATABASE doctors FROM PUBLIC;
REVOKE ALL ON DATABASE patients FROM PUBLIC;
REVOKE ALL ON DATABASE appointments FROM PUBLIC;

\echo 'Service roles and databases are in place.'
