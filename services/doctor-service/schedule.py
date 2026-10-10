"""Clinic opening rules: hours, Sundays and Ontario statutory holidays."""
from datetime import date

FIXED_HOLIDAYS = {
    (1, 1): "New Year's Day",
    (7, 1): "Canada Day",
    (12, 25): "Christmas Day",
    (12, 26): "Boxing Day",
}


def weekday(day: date) -> int:
    """0 = Sunday ... 6 = Saturday."""
    return day.isoweekday() % 7


def holiday_name(day: date) -> str | None:
    fixed = FIXED_HOLIDAYS.get((day.month, day.day))
    if fixed:
        return fixed
    if day.isoweekday() == 1:
        if day.month == 2 and 15 <= day.day <= 21:
            return "Family Day"
        if day.month == 5 and 18 <= day.day <= 24:
            return "Victoria Day"
        if day.month == 9 and day.day <= 7:
            return "Labour Day"
        if day.month == 10 and 8 <= day.day <= 14:
            return "Thanksgiving"
    return None


def closed_reason(day: date) -> str | None:
    holiday = holiday_name(day)
    if holiday:
        return holiday
    if weekday(day) == 0:
        return "Sunday"
    return None


def clinic_slots(day: date) -> list[str]:
    if closed_reason(day):
        return []
    end = 13 if weekday(day) == 6 else 17
    return [f"{hour:02d}:{minute:02d}" for hour in range(9, end) for minute in (0, 30)]


def doctor_slots(days_worked: list[int], day: date) -> list[str]:
    return clinic_slots(day) if weekday(day) in days_worked else []
