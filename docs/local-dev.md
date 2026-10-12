# Local development

The whole platform runs on one machine with Docker Compose: PostgreSQL, the four services, the frontend and a job that loads demo data. Run every command from the repository root.

## Requirements

| Tool | Why |
|---|---|
| Docker with Docker Compose v2 | Builds the images and runs every container |
| A browser | Opens the web app and the API docs |
| Python 3 (optional) | Generates random secrets and reads JSON in the examples below |

Python, PostgreSQL and Nginx for the app itself all run inside containers.

## Configure `.env`

```bash
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(24))"   # run once per secret
```

Replace every `change-me` value. `.env` is git-ignored. Compose reads it on every command, including the test runners, so create it first.

| Variable | Required | Used by |
|---|---|---|
| `POSTGRES_PASSWORD` | yes | db (admin login `medibook_admin`) |
| `DOCTOR_DB_PASSWORD` | yes | db, doctor-service (login `doctor_service`, database `doctors`) |
| `PATIENT_DB_PASSWORD` | yes | db, patient-service (login `patient_service`, database `patients`) |
| `APPOINTMENT_DB_PASSWORD` | yes | db, appointment-service (login `appointment_service`, database `appointments`) |
| `JWT_SECRET` | yes | auth-service signs staff tokens; patient-service and appointment-service verify them |
| `STAFF_EMAIL`, `STAFF_PASSWORD` | yes | auth-service: the front-desk sign-in |
| `STAFF_NAME`, `STAFF_ROLE` | no (`Front desk`, `Receptionist`) | auth-service: shown after sign-in |
| `APP_VERSION` | no (`1.0.0`) | `/version` of every service |

Required values use the `${VAR:?message}` form in `docker-compose.yml`. If one is missing, Compose stops with a message such as `Set POSTGRES_PASSWORD in .env` and starts nothing. All other settings (database hosts, service URLs, `CLINIC_TZ`, `SEED_ENABLED`) are set in `docker-compose.yml`. See [services.md](services.md) for every variable.

The database passwords are applied only when the `db-data` volume is first created. If you change them later, run `docker compose down -v` (this deletes local data) and start again.

## Run the stack

```bash
docker compose up --build        # foreground, all logs
docker compose up -d --build     # or in the background
docker compose ps                # db, the four services and the frontend should be "healthy"
```

Containers start in order. Each one waits until the ones it needs are healthy:

1. `db` and `auth-service` (auth-service has no database).
2. `doctor-service` and `patient-service`, once `db` is healthy.
3. `appointment-service`, once `db`, doctor-service and patient-service are healthy.
4. `frontend` and the `seed` job, once the services they need are healthy.

| URL | What |
|---|---|
| http://localhost:8080 | The web app: public site and staff portal |
| http://localhost:8001/docs | doctor-service API (Swagger UI) |
| http://localhost:8002/docs | patient-service API |
| http://localhost:8003/docs | appointment-service API |
| http://localhost:8004/docs | auth-service API |

The database port is not published. Only containers on the Compose network can reach it.

**Staff sign-in:** open http://localhost:8080/#login and use `STAFF_EMAIL` and `STAFF_PASSWORD` from `.env`. A session lasts 8 hours or until the browser tab is closed. After you change the staff settings, run `docker compose up -d auth-service`.

## Seed job

`tools/seed/seed.py` loads demo data through the real service APIs, using only the Python standard library.

1. It waits up to 120 seconds for doctor-, patient- and appointment-service to answer `/ready`.
2. It reads the doctors and slot templates from doctor-service.
3. It sends 20 demo patients to `POST /internal/seed` on patient-service.
4. It sends about five weeks of appointments (three weeks back, two weeks ahead) to `POST /internal/seed` on appointment-service.

The services accept seed data only while their tables are empty and only with `SEED_ENABLED=true`, which Compose sets for the local stack. Running the job again changes nothing.

| Variable | Value in Compose |
|---|---|
| `DOCTOR_SERVICE_URL` | `http://doctor-service:8000` |
| `PATIENT_SERVICE_URL` | `http://patient-service:8000` |
| `APPOINTMENT_SERVICE_URL` | `http://appointment-service:8000` |
| `TZ` | `America/Toronto` |

```bash
docker compose ps -a seed        # Exited (0) after a successful run
docker compose logs seed         # "Seeded 20 patients and N appointments" or "Demo data already present, nothing to do"
```

The number of appointments depends on the day.

## Everyday commands

| Goal | Command |
|---|---|
| Follow one service's logs | `docker compose logs -f appointment-service` |
| Rebuild and restart one service after a code change | `docker compose up -d --build appointment-service` |
| Stop or start one service | `docker compose stop doctor-service`, `docker compose start doctor-service` |
| Stop the stack and keep the data | `docker compose down` |
| Reset to fresh demo data | `docker compose down -v`, then `docker compose up -d --build` |
| Open a SQL shell as the admin | `docker compose exec db psql -U medibook_admin -d appointments` |

## Tests

Each service's tests run in the `test` stage of its own Dockerfile, so they use the same Python version and libraries as the runtime image. The test containers belong to the Compose `test` profile, so a plain `docker compose up` never starts them.

| Suite | Tests | Database |
|---|---|---|
| `auth-tests` | 4 | none |
| `doctor-tests` | 7 | `doctors_test` |
| `patient-tests` | 7 | `patients_test` |
| `appointment-tests` | 24 | `appointments_test` |

```bash
docker compose run --rm auth-tests
docker compose run --rm doctor-tests
docker compose run --rm patient-tests
docker compose run --rm appointment-tests

docker compose run --build --rm doctor-tests    # rebuild the test image after a code change
docker compose --profile test rm -sf db-test    # remove the test database when done
```

- The suites that need a database use `db-test`, a separate PostgreSQL whose data lives on tmpfs (in memory). `db/init-test` creates the three `*_test` databases.
- The database fixtures refuse to run unless `DB_NAME` ends in `_test`, so they can never empty your local data.
- appointment-service tests replace doctor-service and patient-service with in-memory fakes, so they run without them.
- Service CI runs the same suites with `docker compose --profile test run --rm --build <service>-tests`, after copying `.env.example` to `.env`.

Do not clean up with `docker compose --profile test down`. It stops the whole stack, not only the test database.

## Smoke checks

With the stack running, these requests go through Nginx on port 8080, the same entry point as the browser, so they also test the routing.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/                         # 200
curl -s http://localhost:8080/api/public/departments                                    # 5 departments
curl -s http://localhost:8080/api/public/next-available                                 # one entry per doctor
curl -s http://localhost:8080/api/public/summary                                        # {"open_slots_7d": ...}
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/staff/appointments   # 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/internal/seed            # 404
curl -sI http://localhost:8080/ | grep -iE "x-content-type|x-frame|referrer"           # 3 headers
for port in 8001 8002 8003 8004; do curl -s http://localhost:$port/ready; echo; done    # {"status":"ready"} x4
```

Sign in and call a staff API:

```bash
TOKEN=$(curl -s -H "Content-Type: application/json" \
  -d '{"email": "frontdesk@medibook.test", "password": "YOUR_STAFF_PASSWORD"}' \
  http://localhost:8080/api/auth/login | python -c "import sys, json; print(json.load(sys.stdin)['token'])")

curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/staff/patients?q=rao"
```

To book online from the command line, see the example in [services.md](services.md#booking-flow).

### Failure and isolation checks

```bash
docker compose stop doctor-service
curl -i http://localhost:8080/api/public/summary     # 503 "Doctor service is unavailable. Please try again shortly."
docker compose start doctor-service                  # back to 200

docker compose exec db psql -U doctor_service -d patients   # permission denied for database "patients"
```

With patient-service stopped, online booking returns `503` "Patient service is unavailable. Please try again shortly." while doctors and availability still return `200`.

## Common local problems

| Problem | Cause | Fix |
|---|---|---|
| Compose stops at once with `Set POSTGRES_PASSWORD in .env` (or another name) | `.env` is missing or a required value is empty | `cp .env.example .env` and fill in every value |
| `port is already allocated` for 8080 or 8001 to 8004 | Another program or an older stack uses the port | Stop it, or change the host side of the `ports:` entry |
| The database rejects a password you changed in `.env` | Passwords are set only when the volume is first created | `docker compose down -v`, then `docker compose up -d --build` |
| A service stays `unhealthy` and the services after it never start | Wrong database settings, or the database is not ready | `docker compose logs <service>`, then check the matching password in `.env` |
| The seed job exits with `did not become ready within 120s` | A service it needs never became ready | `docker compose logs doctor-service patient-service appointment-service`, fix it, then `docker compose up -d` |
| `/api/...` returns `502` or `504` | Nginx cannot reach the service behind that path | `docker compose up -d <service>` |
| The site says "Doctor service is unavailable" or "Patient service is unavailable" | appointment-service cannot reach that service | `docker compose start <service>` |
| Staff sign-in says "That email and password don't match a staff account." | The values differ from `.env` | Check `.env`, then `docker compose up -d auth-service` |
| A code change does not show up | The image was not rebuilt | `docker compose up -d --build <service>` |
| Every test fails with `Tests must run against a *_test database (DB_NAME).` | The tests ran outside Compose | Run them with `docker compose run --rm <service>-tests` |
| `db-test` is still running after the tests | `run --rm` removes the runner, not the database it started | `docker compose --profile test rm -sf db-test` |

For AWS and CI problems, see [troubleshooting.md](troubleshooting.md).
