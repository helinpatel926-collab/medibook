"""Request and response models for the appointment service."""
import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from rules import now_local

PHONE_PATTERN = r"^[0-9+()\-\s]{7,20}$"
EMAIL_PATTERN = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"

VisitType = Literal["New patient", "Follow-up", "Consultation", "Annual physical", "Vaccination"]
Status = Literal["scheduled", "completed", "cancelled"]
Source = Literal["online", "staff"]


def blank_to_none(value):
    return None if isinstance(value, str) and not value.strip() else value


class PatientDetails(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=1, max_length=100)
    dob: dt.date
    phone: str = Field(pattern=PHONE_PATTERN)
    email: str | None = Field(default=None, max_length=120, pattern=EMAIL_PATTERN)
    health_card: str | None = Field(default=None, max_length=20)

    @field_validator("email", "health_card", mode="before")
    @classmethod
    def optional_blank(cls, value):
        return blank_to_none(value)

    @field_validator("dob")
    @classmethod
    def dob_not_in_future(cls, value: dt.date) -> dt.date:
        if value > now_local().date():
            raise ValueError("Date of birth can't be in the future")
        return value


class BookingIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    doctor_id: str = Field(min_length=1)
    date: dt.date
    time: str = Field(pattern=TIME_PATTERN)
    type: VisitType = "New patient"
    reason: str | None = Field(default=None, max_length=300)

    @field_validator("reason", mode="before")
    @classmethod
    def reason_blank(cls, value):
        return blank_to_none(value)


class PublicBooking(BookingIn):
    consent: bool = False
    patient: PatientDetails


class StaffBooking(BookingIn):
    patient_id: int


class StatusUpdate(BaseModel):
    status: Status


class AppointmentSeed(BaseModel):
    patient_id: int
    patient_name: str
    patient_mrn: str
    doctor_id: str
    start: dt.datetime
    type: VisitType
    reason: str | None = None
    source: Source
    cancelled: bool = False
    created_days_before: int = Field(default=0, ge=0)


class Appointment(BaseModel):
    id: int
    ref: str | None
    patient_id: int
    patient_name: str
    patient_mrn: str
    doctor_id: str
    start: str
    type: str
    reason: str | None
    status: Status
    source: Source
    created_at: dt.datetime


class BookingResult(BaseModel):
    ref: str
    appointment: Appointment
