"""PostgreSQL data access for the patient service."""
import os
import re
from datetime import datetime, timedelta, timezone

import psycopg
from psycopg.rows import dict_row

SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS patients (
        id           SERIAL PRIMARY KEY,
        mrn          TEXT GENERATED ALWAYS AS ('MRN-' || (10240 + id)::text) STORED,
        full_name    TEXT NOT NULL,
        dob          DATE,
        phone        TEXT,
        phone_digits TEXT,
        email        TEXT,
        health_card  TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    "CREATE UNIQUE INDEX IF NOT EXISTS patients_mrn ON patients (mrn)",
    "CREATE INDEX IF NOT EXISTS patients_match ON patients (lower(full_name), phone_digits)",
]

COLUMNS = "id, mrn, full_name, dob, phone, email, health_card, created_at"

_schema_ready = False


def digits(value: str | None) -> str:
    return re.sub(r"\D", "", value or "")


def _connect() -> psycopg.Connection:
    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "patients"),
        user=os.getenv("DB_USER", "patient_service"),
        password=os.getenv("DB_PASSWORD", ""),
        sslmode=os.getenv("DB_SSLMODE", "prefer"),
        connect_timeout=3,
        row_factory=dict_row,
    )


def ensure_schema() -> None:
    """Create the tables if they do not exist."""
    global _schema_ready
    if _schema_ready:
        return
    with _connect() as conn:
        for statement in SCHEMA:
            conn.execute(statement)
    _schema_ready = True


def get_connection() -> psycopg.Connection:
    ensure_schema()
    return _connect()


def check() -> None:
    with _connect() as conn:
        conn.execute("SELECT 1")


def list_patients(query: str | None = None) -> list[dict]:
    sql = f"SELECT {COLUMNS} FROM patients"
    params: list = []
    if query:
        like = f"%{query}%"
        sql += " WHERE full_name ILIKE %s OR mrn ILIKE %s OR coalesce(email, '') ILIKE %s"
        params = [like, like, like]
        if digits(query):
            sql += " OR phone_digits LIKE %s"
            params.append(f"%{digits(query)}%")
    sql += " ORDER BY full_name"
    with get_connection() as conn:
        return conn.execute(sql, params).fetchall()


def get_patient(patient_id: int) -> dict | None:
    with get_connection() as conn:
        return conn.execute(f"SELECT {COLUMNS} FROM patients WHERE id = %s", (patient_id,)).fetchone()


def create_patient(data: dict, created_at: datetime | None = None) -> dict:
    with get_connection() as conn:
        return conn.execute(
            "INSERT INTO patients (full_name, dob, phone, phone_digits, email, health_card, created_at) "
            f"VALUES (%s, %s, %s, %s, %s, %s, coalesce(%s, now())) RETURNING {COLUMNS}",
            (
                data["full_name"],
                data.get("dob"),
                data.get("phone"),
                digits(data.get("phone")),
                data.get("email"),
                data.get("health_card"),
                created_at,
            ),
        ).fetchone()


def find_match(data: dict) -> dict | None:
    """An existing patient with the same name and phone number (or name and email)."""
    with get_connection() as conn:
        if digits(data.get("phone")):
            row = conn.execute(
                f"SELECT {COLUMNS} FROM patients WHERE lower(full_name) = lower(%s) AND phone_digits = %s "
                "ORDER BY id LIMIT 1",
                (data["full_name"], digits(data.get("phone"))),
            ).fetchone()
            if row:
                return row
        if data.get("email"):
            return conn.execute(
                f"SELECT {COLUMNS} FROM patients WHERE lower(full_name) = lower(%s) AND lower(email) = lower(%s) "
                "ORDER BY id LIMIT 1",
                (data["full_name"], data["email"]),
            ).fetchone()
    return None


def seed(patients: list[dict]) -> list[dict]:
    """Insert demo patients once. Returns all patients."""
    with get_connection() as conn:
        exists = conn.execute("SELECT 1 FROM patients LIMIT 1").fetchone()
    if not exists:
        now = datetime.now(timezone.utc)
        for patient in patients:
            create_patient(patient, now - timedelta(days=patient.get("created_days_ago", 0)))
    with get_connection() as conn:
        return conn.execute(f"SELECT {COLUMNS} FROM patients ORDER BY id").fetchall()
