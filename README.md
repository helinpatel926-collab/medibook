# MediBook

A healthcare appointment booking application for registering patients and booking doctor appointments.
The application is deployed to **AWS EKS** using Terraform, GitHub Actions, Argo CD and Prometheus/Grafana (in progress).

| Part | Technology | Port |
|---|---|---|
| Frontend | HTML/JS served by Nginx (non-root) | 8080 |
| API | Python FastAPI | 8000 |
| Database | PostgreSQL 16 | 5432 (internal only) |

The frontend calls the API through relative `/api/...` URLs. Locally, Nginx forwards them to the API. On EKS, the AWS Application Load Balancer will route them instead, so the code doesn't change between environments.

## Run it locally

**Requirements:** Docker Desktop (with Docker Compose).

```bash
cp .env.example .env        # then set your own DB_PASSWORD in .env
docker compose up --build
```

| URL | What |
|---|---|
| http://localhost:8080 | MediBook web app |
| http://localhost:8000/api/docs | API documentation (Swagger UI) |

To stop: `docker compose down`. The data is kept in a Docker volume. To delete it as well, run `docker compose down -v`.

## Run the tests

```bash
docker compose run --rm api-tests
```

The tests run inside a container against a throwaway PostgreSQL database that lives in memory, so they never touch your local data.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness: is the process running? (doesn't touch the database) |
| GET | `/api/ready` | Readiness: can the app reach the database? Returns 503 if not |
| GET | `/api/version` | App version (`APP_VERSION`) |
| GET / POST | `/api/patients` | List / add patients |
| GET / POST | `/api/appointments` | List / book appointments (404 if the patient doesn't exist) |
| GET | `/metrics` | Prometheus metrics. Not exposed through the frontend or load balancer |

## Configuration

All settings come from environment variables. Nothing is hard-coded.

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `medibook` | Database name |
| `DB_USER` | `medibook` | Database user |
| `DB_PASSWORD` | (empty) | Database password (from `.env` locally, from a Secret on Kubernetes) |
| `DB_SSLMODE` | `prefer` | PostgreSQL SSL mode |
| `APP_VERSION` | `1.0.0` | Version shown in the app footer |

## Project structure

```
medibook/
├── app/
│   ├── api/                # FastAPI app, tests, Dockerfile (multi-stage: test + runtime)
│   └── frontend/           # index.html, app.js, style.css, nginx.conf, Dockerfile
├── docker-compose.yml      # Local stack + test profile
└── .env.example            # Copy to .env (git-ignored)
```
