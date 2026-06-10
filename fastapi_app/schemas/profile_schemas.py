from pydantic import BaseModel, computed_field
from datetime import datetime, date
from user_agents import parse
from typing import Optional

class ProfileBase(BaseModel):
    display_name: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    language: Optional[str] = "en"
    date_format: Optional[str] = "DD/MM/YYYY"

class ProfileCreate(ProfileBase):
    full_name: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    language: Optional[str] = None
    date_format: Optional[str] = None

class ProfileRead(BaseModel):
    user_id: Optional[int] = None
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    language: Optional[str] = "en"
    date_format: Optional[str] = "DD/MM/YYYY"
    presence_status: Optional[str] = "available"
    status_message: Optional[str] = ""

    class Config:
        from_attributes = True

class ProfileStatusUpdate(BaseModel):
    presence_status: str
    status_message: Optional[str] = None

class ActivityRead(BaseModel):
    id: int
    ip_address: str | None
    user_agent: str | None
    timestamp: datetime

    @computed_field
    def device_details(self) -> str:
        if not self.user_agent:
            return "Unknown Device"

        try:
            ua = parse(self.user_agent)
            return f"{ua.browser.family} on {ua.os.family}"

        except Exception:
            return "Unknown Device"

    class Config:
        from_attributes = True

class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_code: str

class TwoFactorVerifyRequest(BaseModel):
    code: str