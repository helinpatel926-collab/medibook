"""PostgreSQL data access for the MediBook API."""
import os

import psycopg
from psycopg.rows import dict_row

SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS patients (
        id            SERIAL PRIMARY KEY,
        full_name     TEXT NOT NULL,
        email         TEXT,
        phone         TEXT,
        date_of_birth DATE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS appointments (
        id               SERIAL PRIMARY KEY,
        patient_id       INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        doctor           TEXT NOT NULL,
        appointment_time TIMESTAMP NOT NULL,
        reason           TEXT,
        status           TEXT NOT NULL DEFAULT 'scheduled',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
]

APPOINTMENT_COLUMNS = """
    a.id, a.patient_id, p.full_name AS patient_name, a.doctor,
    a.appointment_time, a.reason, a.status, a.created_at
"""

_schema_ready = False


def _connect() -> psycopg.Connection:
    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "medibook"),
        user=os.getenv("DB_USER", "medibook"),
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


def list_patients() -> list[dict]:
    with get_connection() as conn:
        return conn.execute(
            "SELECT id, full_name, email, phone, date_of_birth, created_at "
            "FROM patients ORDER BY id DESC"
        ).fetchall()


def create_patient(full_name, email, phone, date_of_birth) -> dict:
    with get_connection() as conn:
        return conn.execute(
            "INSERT INTO patients (full_name, email, phone, date_of_birth) "
            "VALUES (%s, %s, %s, %s) "
            "RETURNING id, full_name, email, phone, date_of_birth, created_at",
            (full_name, email, phone, date_of_birth),
        ).fetchone()


def list_appointments() -> list[dict]:
    with get_connection() as conn:
        return conn.execute(
            f"SELECT {APPOINTMENT_COLUMNS} FROM appointments a "
            "JOIN patients p ON p.id = a.patient_id "
            "ORDER BY a.appointment_time"
        ).fetchall()


def create_appointment(patient_id, doctor, appointment_time, reason) -> dict:
    """Raises ForeignKeyViolation if patient_id does not exist."""
    with get_connection() as conn:
        new_id = conn.execute(
            "INSERT INTO appointments (patient_id, doctor, appointment_time, reason) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (patient_id, doctor, appointment_time, reason),
        ).fetchone()["id"]
        return conn.execute(
            f"SELECT {APPOINTMENT_COLUMNS} FROM appointments a "
            "JOIN patients p ON p.id = a.patient_id WHERE a.id = %s",
            (new_id,),
        ).fetchone()
