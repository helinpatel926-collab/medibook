"""Request and response models for the MediBook API."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class PatientIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=1, max_length=100)
    email: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None


class Patient(PatientIn):
    id: int
    created_at: datetime


class AppointmentIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    patient_id: int
    doctor: str = Field(min_length=1, max_length=100)
    appointment_time: datetime
    reason: str | None = Field(default=None, max_length=300)


class Appointment(AppointmentIn):
    id: int
    patient_name: str
    status: str
    created_at: datetime
