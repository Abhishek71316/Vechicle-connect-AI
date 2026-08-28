# RoadGuardian AI - Location Schemas
# Pydantic schemas for location data

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LocationData(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    timestamp: datetime

class LocationResponse(BaseModel):
    message: str
    data: LocationData
