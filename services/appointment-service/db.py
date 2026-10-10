"""PostgreSQL data access for the appointment service."""
import os
import secrets
from datetime import date, datetime, time, timedelta

import psycopg
from psycopg.rows import dict_row

SLOT_INDEX = "one_booking_per_slot"
REF_KEY = "appointments_ref_key"
REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
REF_ATTEMPTS = 5

SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS appointments (
        id           SERIAL PRIMARY KEY,
        ref          TEXT UNIQUE,
        patient_id   INTEGER NOT NULL,
        patient_name TEXT NOT NULL,
        patient_mrn  TEXT NOT NULL,
        doctor_id    TEXT NOT NULL,
        start_at     TIMESTAMP NOT NULL,
        type         TEXT NOT NULL,
        reason       TEXT,
        status       TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
        source       TEXT NOT NULL CHECK (source IN ('online', 'staff')),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    # A doctor can hold only one active booking per slot, even under concurrent requests.
    f"CREATE UNIQUE INDEX IF NOT EXISTS {SLOT_INDEX} ON appointments (doctor_id, start_at) WHERE status <> 'cancelled'",
    "CREATE INDEX IF NOT EXISTS appointments_start ON appointments (start_at)",
]

COLUMNS = "id, ref, patient_id, patient_name, patient_mrn, doctor_id, start_at, type, reason, status, source, created_at"

INSERT = (
    "INSERT INTO appointments (ref, patient_id, patient_name, patient_mrn, doctor_id, start_at, type, reason, source) "
    "VALUES (%(ref)s, %(patient_id)s, %(patient_name)s, %(patient_mrn)s, %(doctor_id)s, %(start_at)s, "
    f"%(type)s, %(reason)s, %(source)s) RETURNING {COLUMNS}"
)

SEED_INSERT = (
    "INSERT INTO appointments "
    "(ref, patient_id, patient_name, patient_mrn, doctor_id, start_at, type, reason, status, source, created_at) "
    "VALUES (%(ref)s, %(patient_id)s, %(patient_name)s, %(patient_mrn)s, %(doctor_id)s, %(start_at)s, "
    "%(type)s, %(reason)s, %(status)s, %(source)s, %(created_at)s) "
    "ON CONFLICT (doctor_id, start_at) WHERE status <> 'cancelled' DO NOTHING"
)

_schema_ready = False


class SlotTaken(Exception):
    """The doctor already has an active booking at that time."""


def new_ref() -> str:
    return "MB-" + "".join(secrets.choice(REF_ALPHABET) for _ in range(4))


def _connect() -> psycopg.Connection:
    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "appointments"),
        user=os.getenv("DB_USER", "appointment_service"),
        password=os.getenv("DB_PASSWORD", ""),
        sslmode=os.getenv("DB_SSLMODE", "prefer"),
        connect_timeout=3,
        row_factory=dict_row,
    )


def ensure_schema() -> None:
    """Create the table and indexes if they do not exist."""
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


def booked_slots(start: datetime, end: datetime, doctor_id: str | None = None) -> set[tuple[str, datetime]]:
    """(doctor_id, start_at) pairs held by active bookings in [start, end)."""
    sql = "SELECT doctor_id, start_at FROM appointments WHERE status <> 'cancelled' AND start_at >= %s AND start_at < %s"
    params: list = [start, end]
    if doctor_id:
        sql += " AND doctor_id = %s"
        params.append(doctor_id)
    with get_connection() as conn:
        return {(row["doctor_id"], row["start_at"]) for row in conn.execute(sql, params)}


def list_appointments(
    start: date | None,
    end: date | None,
    doctor_id: str | None,
    patient_id: int | None,
    status: str | None,
    limit: int,
) -> list[dict]:
    clauses, params = [], []
    if start:
        clauses.append("start_at >= %s")
        params.append(datetime.combine(start, time.min))
    if end:
        clauses.append("start_at < %s")
        params.append(datetime.combine(end + timedelta(days=1), time.min))
    if doctor_id:
        clauses.append("doctor_id = %s")
        params.append(doctor_id)
    if patient_id is not None:
        clauses.append("patient_id = %s")
        params.append(patient_id)
    if status:
        clauses.append("status = %s")
        params.append(status)
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    params.append(limit)
    with get_connection() as conn:
        return conn.execute(f"SELECT {COLUMNS} FROM appointments{where} ORDER BY start_at, id LIMIT %s", params).fetchall()


def get_appointment(appointment_id: int) -> dict | None:
    with get_connection() as conn:
        return conn.execute(f"SELECT {COLUMNS} FROM appointments WHERE id = %s", (appointment_id,)).fetchone()


def insert_appointment(data: dict) -> dict:
    """Insert a booking. Online bookings get a reference. Raises SlotTaken if the slot is held."""
    online = data["source"] == "online"
    for _ in range(REF_ATTEMPTS):
        try:
            with get_connection() as conn:
                return conn.execute(INSERT, {**data, "ref": new_ref() if online else None}).fetchone()
        except psycopg.errors.UniqueViolation as exc:
            if exc.diag.constraint_name == SLOT_INDEX:
                raise SlotTaken from exc
            if exc.diag.constraint_name != REF_KEY:
                raise
    raise RuntimeError("Could not allocate a unique booking reference")


def set_status(appointment_id: int, status: str) -> dict | None:
    """Raises SlotTaken when reactivating a booking whose slot was taken in the meantime."""
    try:
        with get_connection() as conn:
            return conn.execute(
                f"UPDATE appointments SET status = %s WHERE id = %s RETURNING {COLUMNS}",
                (status, appointment_id),
            ).fetchone()
    except psycopg.errors.UniqueViolation as exc:
        if exc.diag.constraint_name == SLOT_INDEX:
            raise SlotTaken from exc
        raise


def seed(rows: list[dict]) -> dict:
    """Insert demo appointments into an empty table. Rows that clash with an active booking are skipped."""
    inserted = 0
    used_refs: set[str] = set()
    with get_connection() as conn:
        conn.execute("LOCK TABLE appointments IN EXCLUSIVE MODE")
        if conn.execute("SELECT 1 FROM appointments LIMIT 1").fetchone():
            return {"inserted": 0, "skipped": True}
        for row in rows:
            ref = None
            if row["source"] == "online":
                ref = new_ref()
                while ref in used_refs:
                    ref = new_ref()
                used_refs.add(ref)
            inserted += conn.execute(SEED_INSERT, {**row, "ref": ref}).rowcount
    return {"inserted": inserted, "skipped": False}
