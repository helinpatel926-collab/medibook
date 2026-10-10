"""Request and response models for the patient service."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

PHONE_PATTERN = r"^[0-9+()\-\s]{7,20}$"
EMAIL_PATTERN = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"


class PatientIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=1, max_length=100)
    dob: date | None = None
    phone: str | None = Field(default=None, max_length=20, pattern=PHONE_PATTERN)
    email: str | None = Field(default=None, max_length=120, pattern=EMAIL_PATTERN)
    health_card: str | None = Field(default=None, max_length=20)

    @field_validator("dob")
    @classmethod
    def dob_not_in_future(cls, value: date | None) -> date | None:
        if value and value > date.today():
            raise ValueError("Date of birth can't be in the future")
        return value


class Patient(PatientIn):
    id: int
    mrn: str
    created_at: datetime


class PatientMatch(Patient):
    created: bool


class PatientSeed(PatientIn):
    created_days_ago: int = Field(default=0, ge=0)
