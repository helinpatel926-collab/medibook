# MediBook

MediBook is a clinic appointment booking platform built as microservices. Patients book visits online, and front-desk staff manage patient records and the daily schedule. Each service owns its data and runs in its own container. Deployment to **AWS EKS** with Terraform, GitHub Actions, Argo CD and Prometheus/Grafana is in progress.

## Architecture

| Service | Responsibility | Database | Local port |
|---|---|---|---|
| `frontend` | Booking site and front-desk screens (Nginx). Also routes `/api/...` to the services | none | 8080 |
| `auth-service` | Staff sign-in. Issues signed JWTs | none | 8004 |
| `doctor-service` | Departments, doctors, clinic hours (closed Sundays and Ontario statutory holidays), slot templates | `doctors` | 8001 |
| `patient-service` | Patient records and medical record numbers (MRNs) | `patients` | 8002 |
| `appointment-service` | Availability, online and staff bookings, appointment status | `appointments` | 8003 |
| `db` | PostgreSQL 16, with one database and one login per service | n/a | internal only |
| `seed` | One-off job that loads demo data on first start | none | n/a |

All four services are Python FastAPI apps. Each one has the same operational endpoints:

- `/health` for liveness (doesn't touch the database)
- `/ready` for readiness (returns 503 until the service's database is reachable, or for auth-service, until sign-in is configured)
- `/version`
- `/metrics` (Prometheus)

Services never share a database. Each database is owned by its own service login, and `CONNECT` is revoked from everyone else ([db/init](db/init/01-create-databases.sh)). When a service needs another service's data, it calls that service over HTTP.

## Request routing

The browser only calls relative `/api/...` paths. Nginx in the `frontend` container sends them on to the right service:

| Path | Service | Access |
|---|---|---|
| `/api/auth/*` (`login`, `me`) | auth-service | public / staff token |
| `/api/public/departments`, `/api/public/doctors`, `/api/public/slots` | doctor-service | public |
| `/api/public/availability`, `/api/public/next-available`, `/api/public/summary`, `/api/public/bookings` | appointment-service | public |
| `/api/staff/patients*` | patient-service | staff token |
| `/api/staff/appointments*` | appointment-service | staff token |

`/internal/*` endpoints (service-to-service calls and demo seeding) and `/metrics` are never exposed through the frontend. Locally they can only be reached on the services' own ports.

## Booking flow

1. The booking page loads departments and doctors from doctor-service.
2. When the patient picks a doctor, appointment-service returns the upcoming free slots. It gets the slot templates from doctor-service and leaves out times that are already booked in its own database.
3. The patient enters their details and submits `POST /api/public/bookings`.
4. appointment-service checks the slot again with doctor-service and applies the age rule (Pediatrics only sees patients under 18). Then it finds or creates the patient through patient-service (`/internal/patients/match`).
5. It saves the appointment with a copy of the patient's name and MRN and returns a booking reference. If the slot was taken in the meantime, it returns `409` instead.
6. Front-desk staff sign in through auth-service and receive a JWT, which they send on `/api/staff/...` requests. patient-service and appointment-service verify the token themselves using the shared `JWT_SECRET`.

## Run locally

**Requirements:** Docker with Docker Compose v2.

```bash
cp .env.example .env        # then replace every change-me value
docker compose up --build
```

To generate random values for the passwords and `JWT_SECRET`, run `python -c "import secrets; print(secrets.token_urlsafe(24))"`.

| URL | What |
|---|---|
| http://localhost:8080 | MediBook web app |
| http://localhost:8001/docs | doctor-service API (Swagger UI) |
| http://localhost:8002/docs | patient-service API |
| http://localhost:8003/docs | appointment-service API |
| http://localhost:8004/docs | auth-service API |

- **Staff sign-in:** use `STAFF_EMAIL` and `STAFF_PASSWORD` from your `.env`.
- **Demo data:** on first start, the `seed` job loads 20 demo patients and five weeks of appointments (three weeks back, two weeks ahead), then exits. On later starts it finds the data already there and does nothing.
- **Stop:** `docker compose down` stops the stack and keeps the data in the `db-data` volume. `docker compose down -v` deletes the data too.
- **Database passwords** are applied only when the volume is first created. If you change them in `.env` later, run `docker compose down -v` first.

## Run the tests

Each service's tests run in the `test` stage of its Dockerfile. The suites that need a database use `db-test`, a throwaway PostgreSQL that keeps its data in memory, with separate `*_test` databases. They never touch your local data. The commands read `.env`, so create it first (see above).

```bash
docker compose run --rm auth-tests
docker compose run --rm doctor-tests
docker compose run --rm patient-tests
docker compose run --rm appointment-tests

docker compose --profile test rm -sf db-test    # remove the test database
```

## Configuration

Settings come from environment variables. Locally they are read from `.env`:

| Variable | Used by | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | db | Password for the PostgreSQL admin user `medibook_admin` |
| `DOCTOR_DB_PASSWORD` | db, doctor-service | Password for the `doctor_service` login (database `doctors`) |
| `PATIENT_DB_PASSWORD` | db, patient-service | Password for the `patient_service` login (database `patients`) |
| `APPOINTMENT_DB_PASSWORD` | db, appointment-service | Password for the `appointment_service` login (database `appointments`) |
| `JWT_SECRET` | auth, patient, appointment services | HS256 key that signs and verifies staff tokens |
| `STAFF_EMAIL`, `STAFF_PASSWORD` | auth-service | Front-desk sign-in |
| `STAFF_NAME`, `STAFF_ROLE` | auth-service | Name and role shown after sign-in (defaults: `Front desk`, `Receptionist`) |
| `APP_VERSION` | all services | Version reported by `/version` (default `1.0.0`) |

These are set in `docker-compose.yml` or use their defaults, so they don't go in `.env`:

| Variable | Description |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Connection settings for each service's own database |
| `DB_SSLMODE` | PostgreSQL SSL mode (default `prefer`) |
| `DOCTOR_SERVICE_URL`, `PATIENT_SERVICE_URL` | Where appointment-service reaches the other services |
| `CLINIC_TZ` | Clinic time zone for availability and booking rules (`America/Toronto`) |
| `SEED_ENABLED` | Turns on the `/internal/seed` endpoints. `true` only for the local stack |
| `TOKEN_TTL_SECONDS` | Staff token lifetime in auth-service (default `28800`, 8 hours) |

## Project structure

```
medibook/
├── services/
│   ├── auth-service/          # Each service: FastAPI app, tests/,
│   ├── doctor-service/        #   requirements, and a multi-stage
│   ├── patient-service/       #   Dockerfile (test + runtime)
│   └── appointment-service/
├── frontend/                  # Static web app, nginx.conf, Dockerfile
├── db/
│   ├── init/                  # Creates per-service logins and databases
│   └── init-test/             # Creates the *_test databases
├── tools/seed/                # Demo data loader (Python standard library only)
├── docker-compose.yml         # Local stack, plus the "test" profile
└── .env.example               # Copy to .env (git-ignored)
```
