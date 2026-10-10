"""Load demo patients and appointments into a fresh MediBook stack.

Runs as a short-lived container once the services are up. Patient and
appointment services only accept seed data while their tables are empty, so
running it again is harmless. Output is deterministic for a given day.
"""
import json
import os
import random
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta

DOCTOR_URL = os.getenv("DOCTOR_SERVICE_URL", "http://doctor-service:8000").rstrip("/")
PATIENT_URL = os.getenv("PATIENT_SERVICE_URL", "http://patient-service:8000").rstrip("/")
APPOINTMENT_URL = os.getenv("APPOINTMENT_SERVICE_URL", "http://appointment-service:8000").rstrip("/")

READY_TIMEOUT_SECONDS = 120
POLL_SECONDS = 2
HISTORY_DAYS = 21  # days of past appointments before today
WINDOW_DAYS = 35   # total days of appointments, past and upcoming
SEED = 240611

# [full name, date of birth, phone]. Shared phones are family members.
PEOPLE = [
    ["Asha Rao", "1990-04-12", "416-555-0101"],
    ["Liam Tremblay", "1984-09-03", "647-555-0112"],
    ["Olivia Chen", "1976-01-22", "416-555-0123"],
    ["Amira Haddad", "1995-07-30", "437-555-0134"],
    ["Ethan Roy", "1962-11-15", "416-555-0145"],
    ["Priya Nair", "1988-03-08", "647-555-0156"],
    ["Lucas Martin", "1971-05-19", "416-555-0167"],
    ["Sofia Rossi", "1999-12-02", "437-555-0178"],
    ["Mateo Silva", "1981-08-25", "647-555-0189"],
    ["Zara Ahmed", "1993-02-14", "416-555-0190"],
    ["Jacob Wilson", "1958-10-07", "416-555-0102"],
    ["Mei Lin", "1986-06-21", "647-555-0113"],
    ["Owen MacDonald", "1979-04-01", "416-555-0124"],
    ["Aaliyah Brown", "2001-09-17", "437-555-0135"],
    ["Gabriel Côté", "1968-03-28", "416-555-0146"],
    ["Maya Chen", "2021-06-18", "416-555-0123"],
    ["Leo Gagnon", "2019-11-02", "647-555-0157"],
    ["Ava Haddad", "2025-04-27", "437-555-0134"],
    ["Noah Singh", "2016-08-09", "416-555-0168"],
    ["Isla Tremblay", "2014-01-30", "647-555-0112"],
]
# The last three patients registered recently, so "new patient" views have data.
RECENT_DAYS_AGO = [5, 3, 1]

REASONS = {
    "d1": ["Annual physical", "Prescription renewal", "Sore throat", "Blood test results", "Persistent headache"],
    "d2": ["Blood pressure review", "Chest pain follow-up", "ECG results", "Palpitations"],
    "d3": ["Mole check", "Rash on forearm", "Acne follow-up", "Eczema flare-up"],
    "d4": ["Booster vaccination", "Fever and cough", "Well-child visit", "Ear infection"],
    "d5": ["Knee pain", "Lower back pain", "Post-op review", "Sprained ankle"],
}
DEFAULT_REASONS = ["General consultation"]
VISIT_TYPES = ["Follow-up", "Follow-up", "Consultation", "New patient"]
LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def log(message: str) -> None:
    print(message, flush=True)


def call(method: str, url: str, body=None, timeout: float = 30):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def wait_until_ready(services: dict[str, str]) -> None:
    deadline = time.monotonic() + READY_TIMEOUT_SECONDS
    pending = dict(services)
    log(f"Waiting for {', '.join(pending)} to become ready")
    while True:
        for name, url in list(pending.items()):
            try:
                with urllib.request.urlopen(f"{url}/ready", timeout=POLL_SECONDS) as response:
                    if response.status == 200:
                        del pending[name]
            except OSError:
                pass
        if not pending:
            return
        if time.monotonic() >= deadline:
            sys.exit(
                f"Error: {', '.join(pending)} did not become ready within "
                f"{READY_TIMEOUT_SECONDS}s; check `docker compose logs {' '.join(pending)}`"
            )
        time.sleep(POLL_SECONDS)


def age_on(dob: date, day: date) -> int:
    return day.year - dob.year - ((day.month, day.day) < (dob.month, dob.day))


def email_for(full_name: str) -> str:
    plain = unicodedata.normalize("NFKD", full_name).encode("ascii", "ignore").decode()
    first, last = plain.lower().split(" ", 1)
    return f"{first}.{last.replace(' ', '')}@example.com"


def health_card(rng: random.Random) -> str:
    digits = "".join(str(rng.randint(0, 9)) for _ in range(10))
    version = rng.choice(LETTERS) + rng.choice(LETTERS)
    return f"{digits[:4]}-{digits[4:7]}-{digits[7:]}-{version}"


def build_patients(rng: random.Random, today: date) -> list[dict]:
    recent_start = len(PEOPLE) - len(RECENT_DAYS_AGO)
    patients = []
    for index, (full_name, dob, phone) in enumerate(PEOPLE):
        adult = age_on(date.fromisoformat(dob), today) >= 18
        if index >= recent_start:
            created_days_ago = RECENT_DAYS_AGO[index - recent_start]
        else:
            created_days_ago = rng.randint(60, 860)
        patients.append({
            "full_name": full_name,
            "dob": dob,
            "phone": phone,
            "email": email_for(full_name) if adult else None,
            "health_card": health_card(rng),
            "created_days_ago": created_days_ago,
        })
    return patients


def pick_seeded(returned: list[dict]) -> list[dict]:
    """Prefer the demo patients; fall back to any records that have a date of birth."""
    by_key = {(p["full_name"], p.get("dob")): p for p in returned}
    demo = [by_key[(name, dob)] for name, dob, _ in PEOPLE if (name, dob) in by_key]
    return demo or [p for p in returned if p.get("dob")]


def visit_type(rng: random.Random, reason: str) -> str:
    if reason == "Annual physical":
        return "Annual physical"
    if "vaccination" in reason.lower():
        return "Vaccination"
    return rng.choice(VISIT_TYPES)


def build_appointments(rng, doctors, slot_dates, patients, today: date, now: datetime) -> list[dict]:
    children = [p for p in patients if age_on(date.fromisoformat(p["dob"]), today) < 18]
    adults = [p for p in patients if age_on(date.fromisoformat(p["dob"]), today) >= 18]
    appointments = []
    for day_text in sorted(slot_dates):
        day = date.fromisoformat(day_text)
        offset = (day - today).days
        slots_by_doctor = slot_dates[day_text].get("doctors", {})
        for doctor in doctors:
            slots = slots_by_doctor.get(doctor["id"]) or []
            if not slots:
                continue
            if offset < 0:
                count = rng.randint(2, 5)
            elif offset == 0:
                count = rng.randint(3, 5)
            else:
                count = max(1, 6 - offset // 2) + rng.randint(0, 2) - 1
            count = max(0, min(count, len(slots) - 3))
            pool = children if doctor["department"] == "Pediatrics" else adults
            if count == 0 or not pool:
                continue
            reasons = REASONS.get(doctor["id"], DEFAULT_REASONS)
            for slot in sorted(rng.sample(slots, count)):
                start = f"{day_text}T{slot}"
                in_past = datetime.fromisoformat(start) < now
                patient = rng.choice(pool)
                reason = rng.choice(reasons)
                appointments.append({
                    "patient_id": patient["id"],
                    "patient_name": patient["full_name"],
                    "patient_mrn": patient["mrn"],
                    "doctor_id": doctor["id"],
                    "start": start,
                    "type": visit_type(rng, reason),
                    "reason": reason,
                    "source": "online" if rng.random() < 0.45 else "staff",
                    "cancelled": rng.random() < (0.12 if in_past else 0.06),
                    "created_days_before": rng.randint(1, 12),
                })
    return appointments


def main() -> int:
    wait_until_ready({
        "doctor-service": DOCTOR_URL,
        "patient-service": PATIENT_URL,
        "appointment-service": APPOINTMENT_URL,
    })

    rng = random.Random(SEED)
    today = date.today()
    now = datetime.now()
    start_day = today - timedelta(days=HISTORY_DAYS)

    doctors = call("GET", f"{DOCTOR_URL}/api/public/doctors")
    slots = call("GET", f"{DOCTOR_URL}/api/public/slots?start={start_day.isoformat()}&days={WINDOW_DAYS}")

    returned = call("POST", f"{PATIENT_URL}/internal/seed", build_patients(rng, today), timeout=60)
    patients = pick_seeded(returned)

    appointments = build_appointments(rng, doctors, slots.get("dates", {}), patients, today, now)
    result = call("POST", f"{APPOINTMENT_URL}/internal/seed", appointments, timeout=120)

    if result.get("inserted", 0):
        log(f"Seeded {len(patients)} patients and {result['inserted']} appointments")
    else:
        log("Demo data already present, nothing to do")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:500]
        sys.exit(f"Error: {exc.filename} returned HTTP {exc.code}: {detail}")
    except (urllib.error.URLError, OSError) as exc:
        sys.exit(f"Error: request failed: {exc}")
