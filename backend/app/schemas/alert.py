# RoadGuardian AI - Alert Schemas
# Pydantic schemas for alert data

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Alert(BaseModel):
    id: Optional[int] = None
    timestamp: datetime
    severity: str
    event_type: str
    location: Optional[str] = None
    risk_score: Optional[int] = None
    status: str = "active"

class AlertResponse(BaseModel):
    message: str
    data: Alert
