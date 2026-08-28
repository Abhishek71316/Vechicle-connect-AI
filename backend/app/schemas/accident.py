# RoadGuardian AI - Accident Schemas
# Pydantic schemas for accident data

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Accident(BaseModel):
    id: Optional[int] = None
    timestamp: datetime
    latitude: float
    longitude: float
    speed: Optional[float] = None
    impact_level: str
    risk_score: int
    driver_status: Optional[str] = None
    driver_response: Optional[str] = None
    event_status: str = "detected"

class AccidentResponse(BaseModel):
    message: str
    data: Accident
