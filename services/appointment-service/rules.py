"""Clinic time and booking eligibility rules."""
import os
from datetime import date, datetime
from zoneinfo import ZoneInfo

CLINIC_TZ = ZoneInfo(os.getenv("CLINIC_TZ", "America/Toronto"))
PEDIATRICS = "Pediatrics"
ADULT_AGE = 18


def now_local() -> datetime:
    """Clinic wall-clock time, naive and truncated to the minute like stored start times."""
    return datetime.now(CLINIC_TZ).replace(tzinfo=None, second=0, microsecond=0)


def age_in_years(dob: date, on: date) -> int:
    return on.year - dob.year - ((on.month, on.day) < (dob.month, dob.day))


def age_allowed(department: str, dob: date | None, on: date) -> bool:
    """Pediatrics only sees patients under 18. Patients without a date of birth are not blocked."""
    return department != PEDIATRICS or dob is None or age_in_years(dob, on) < ADULT_AGE
