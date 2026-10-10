"""PostgreSQL data access for the doctor service."""
import os

import psycopg
from psycopg.rows import dict_row

SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS departments (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        icon        TEXT NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS doctors (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        department_id INTEGER NOT NULL REFERENCES departments(id),
        room          TEXT NOT NULL,
        days          SMALLINT[] NOT NULL,
        languages     TEXT[] NOT NULL
    )
    """,
]

DEPARTMENTS = [
    ("Family Medicine", "Check-ups, prescriptions and everyday illness.", "steth"),
    ("Cardiology", "Heart health, blood pressure and ECG follow-ups.", "heart"),
    ("Dermatology", "Skin, hair and nail concerns, including mole checks.", "drop"),
    ("Pediatrics", "Babies, children and teens, including vaccinations.", "smile"),
    ("Orthopedics", "Joint, bone and back pain, and sports injuries.", "bone"),
]

# Clinic days use 0 = Sunday ... 6 = Saturday.
DOCTORS = [
    ("d1", "Dr. Emily Carter", "Family Medicine", "101", [1, 2, 3, 4, 5, 6], ["English", "French"]),
    ("d2", "Dr. Raj Mehta", "Cardiology", "204", [1, 3, 5], ["English", "Hindi", "Punjabi"]),
    ("d3", "Dr. Sofia Alvarez", "Dermatology", "112", [2, 4], ["English", "Spanish"]),
    ("d4", "Dr. Daniel Kim", "Pediatrics", "108", [1, 2, 4, 5, 6], ["English", "Korean"]),
    ("d5", "Dr. Hannah Okafor", "Orthopedics", "210", [2, 3, 5], ["English", "Yoruba"]),
]

DOCTOR_QUERY = """
    SELECT d.id, d.name, dep.name AS department, d.room, d.days, d.languages
    FROM doctors d JOIN departments dep ON dep.id = d.department_id
"""

_schema_ready = False


def _connect() -> psycopg.Connection:
    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "doctors"),
        user=os.getenv("DB_USER", "doctor_service"),
        password=os.getenv("DB_PASSWORD", ""),
        sslmode=os.getenv("DB_SSLMODE", "prefer"),
        connect_timeout=3,
        row_factory=dict_row,
    )


def ensure_schema() -> None:
    """Create the tables and the clinic's reference data if they do not exist."""
    global _schema_ready
    if _schema_ready:
        return
    with _connect() as conn:
        for statement in SCHEMA:
            conn.execute(statement)
        for name, description, icon in DEPARTMENTS:
            conn.execute(
                "INSERT INTO departments (name, description, icon) VALUES (%s, %s, %s) "
                "ON CONFLICT (name) DO NOTHING",
                (name, description, icon),
            )
        for doctor_id, name, department, room, days, languages in DOCTORS:
            conn.execute(
                "INSERT INTO doctors (id, name, department_id, room, days, languages) "
                "SELECT %s, %s, id, %s, %s, %s FROM departments WHERE name = %s "
                "ON CONFLICT (id) DO NOTHING",
                (doctor_id, name, room, days, languages, department),
            )
    _schema_ready = True


def check() -> None:
    with _connect() as conn:
        conn.execute("SELECT 1")


def list_departments() -> list[dict]:
    ensure_schema()
    with _connect() as conn:
        return conn.execute("SELECT name, description, icon FROM departments ORDER BY id").fetchall()


def list_doctors() -> list[dict]:
    ensure_schema()
    with _connect() as conn:
        return conn.execute(f"{DOCTOR_QUERY} ORDER BY d.id").fetchall()


def get_doctor(doctor_id: str) -> dict | None:
    ensure_schema()
    with _connect() as conn:
        return conn.execute(f"{DOCTOR_QUERY} WHERE d.id = %s", (doctor_id,)).fetchone()
